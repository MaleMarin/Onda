import type {
  EvalCase,
  EvalCaseResult,
  EvalDimensions,
  EvalMode,
  EvalRunOutput,
  EvalRunSummary,
  InvokeOndaParams,
} from "../types";
import { invokeOnda } from "./invokeOnda";
import {
  judgeCaseHeuristic,
  allDimensionsPass,
  averageScore,
} from "../judges/heuristicJudge";
import { judgeCaseLlm, mergeHeuristicAndLlm } from "../judges/llmJudge";
import { loadAllCases } from "../loadDatasets";
import { detectCaseRegression, detectRunRegression } from "../regression";
import { useLlmJudge } from "../config";

function commitHash(): string | null {
  try {
    const { execSync } = require("node:child_process") as typeof import("node:child_process");
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function buildPairIndex(cases: EvalCase[]): Map<string, Map<EvalCase["channel"], string>> {
  const m = new Map<string, Map<EvalCase["channel"], string>>();
  for (const c of cases) {
    if (!c.pair_id) continue;
    if (!m.has(c.pair_id)) m.set(c.pair_id, new Map());
    m.get(c.pair_id)!.set(c.channel, c.id);
  }
  return m;
}

function peerResponseFor(
  case_: EvalCase,
  pairIndex: Map<string, Map<EvalCase["channel"], string>>,
  responses: Map<string, string>
): string | undefined {
  if (!case_.pair_id) return undefined;
  const chans = pairIndex.get(case_.pair_id);
  if (!chans) return undefined;
  const other: EvalCase["channel"] = case_.channel === "web" ? "whatsapp" : "web";
  const otherId = chans.get(other);
  if (!otherId) return undefined;
  return responses.get(otherId);
}

function buildSummary(results: EvalCaseResult[], mode: EvalMode, runRegression: boolean): EvalRunSummary {
  const passed = results.filter((r) => r.global_pass).length;
  const failed = results.length - passed;

  const mean_scores: Record<string, number> = {};
  const dims: (keyof EvalDimensions)[] = [
    "clarity",
    "accuracy",
    "neutrality",
    "usefulness",
    "safety",
    "consistency",
  ];
  for (const d of dims) {
    mean_scores[d] =
      results.reduce((s, r) => s + r.dimensions[d].score, 0) / Math.max(1, results.length);
  }

  const by_onda: EvalRunSummary["by_onda"] = {};
  const by_channel: EvalRunSummary["by_channel"] = {};
  const by_category: EvalRunSummary["by_category"] = {};

  for (const r of results) {
    const o = r.case.onda;
    const ch = r.case.channel;
    const cat = r.case.category;
    const g = averageScore(r.dimensions);

    if (!by_onda[o]) by_onda[o] = { n: 0, pass: 0, mean_global: 0 };
    by_onda[o].n += 1;
    if (r.global_pass) by_onda[o].pass += 1;
    by_onda[o].mean_global += g;

    if (!by_channel[ch]) by_channel[ch] = { n: 0, pass: 0, mean_global: 0 };
    by_channel[ch].n += 1;
    if (r.global_pass) by_channel[ch].pass += 1;
    by_channel[ch].mean_global += g;

    if (!by_category[cat]) by_category[cat] = { n: 0, pass: 0 };
    by_category[cat].n += 1;
    if (r.global_pass) by_category[cat].pass += 1;
  }

  for (const k of Object.keys(by_onda)) {
    const b = by_onda[k as keyof typeof by_onda];
    b.mean_global = b.mean_global / Math.max(1, b.n);
  }
  for (const k of Object.keys(by_channel)) {
    const b = by_channel[k as keyof typeof by_channel];
    b.mean_global = b.mean_global / Math.max(1, b.n);
  }

  const failures = results
    .filter((r) => !r.global_pass)
    .map((r) => ({
      id: r.case.id,
      reason: r.error ?? `score_medio=${averageScore(r.dimensions).toFixed(2)}`,
    }))
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, 15);

  const anyCaseRegression = results.some((r) => r.regression);

  return {
    total: results.length,
    passed,
    failed,
    regression: anyCaseRegression || runRegression,
    mean_scores,
    by_onda,
    by_channel,
    by_category,
    top_failures: failures,
    timestamp_iso: new Date().toISOString(),
    commit: commitHash(),
    mode,
  };
}

export type RunAllEvalsOptions = {
  mode: EvalMode;
  previousRun: EvalRunOutput | null;
};

export async function runAllEvals(options: RunAllEvalsOptions): Promise<EvalRunOutput> {
  const cases = loadAllCases();
  if (!cases.length) {
    throw new Error("No hay casos: revisá evals/datasets/*.jsonl");
  }

  const pairIndex = buildPairIndex(cases);
  const responses = new Map<string, string>();
  const tryLlm = useLlmJudge();

  const invokeMeta: { case: EvalCase; ms: number; error?: string }[] = [];

  for (const c of cases) {
    const params = {
      message: c.input,
      onda: c.onda,
      channel: c.channel,
      history: [] as InvokeOndaParams["history"],
      mode: options.mode,
      mockWeb: (options.mode === "deterministic" ? undefined : false) as string | false | undefined,
      mockRag: (options.mode === "deterministic" ? undefined : false) as string | false | undefined,
    } satisfies InvokeOndaParams;
    try {
      const r = await invokeOnda(params, c);
      responses.set(c.id, r.text);
      invokeMeta.push({ case: c, ms: r.ms });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      responses.set(c.id, "");
      invokeMeta.push({ case: c, ms: 0, error: msg });
    }
  }

  const prelim: EvalCaseResult[] = [];
  for (const row of invokeMeta) {
    const c = row.case;
    const response = responses.get(c.id) ?? "";
    const peerText = peerResponseFor(c, pairIndex, responses);
    let dimensions = judgeCaseHeuristic(c, response, c.channel, peerText);
    let judge: EvalCaseResult["judge"] = "heuristic";
    if (tryLlm && response.length > 0) {
      const llmDims = await judgeCaseLlm(c, c.input, response);
      if (llmDims) {
        dimensions = mergeHeuristicAndLlm(c, dimensions, llmDims);
        judge = "heuristic+llm";
      }
    }
    const global_pass = row.error ? false : allDimensionsPass(dimensions);
    prelim.push({
      case: c,
      response,
      response_ms: row.ms,
      dimensions,
      global_pass,
      regression: false,
      regression_reasons: [],
      judge,
      error: row.error,
    });
  }

  const runReg = detectRunRegression(options.previousRun, prelim);

  const final: EvalCaseResult[] = prelim.map((r) => {
    const { regression, reasons } = detectCaseRegression(options.previousRun, r);
    return {
      ...r,
      regression,
      regression_reasons: reasons,
    };
  });

  const summary = buildSummary(final, options.mode, runReg.regression);

  const prevSnapshot = options.previousRun
    ? {
        mean_scores: options.previousRun.summary.mean_scores,
        case_pass: Object.fromEntries(
          (options.previousRun.results ?? []).map((x) => [x.case.id, x.global_pass])
        ),
      }
    : null;

  return {
    summary,
    results: final,
    previous: prevSnapshot,
    run_regression_hints: runReg.reasons.length ? runReg.reasons : undefined,
  };
}
