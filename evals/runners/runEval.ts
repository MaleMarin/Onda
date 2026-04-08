import type { EvalCase, EvalCaseResult, EvalMode, InvokeOndaParams } from "../types";
import { invokeOnda } from "./invokeOnda";
import {
  judgeCaseHeuristic,
  allDimensionsPass,
} from "../judges/heuristicJudge";
import { judgeCaseLlm, mergeHeuristicAndLlm } from "../judges/llmJudge";
import { useLlmJudge } from "../config";

/** Evalúa un solo caso (útil en tests o extensiones). */
export async function runEvalCase(
  case_: EvalCase,
  mode: EvalMode,
  peerResponse?: string
): Promise<EvalCaseResult> {
  const params: InvokeOndaParams = {
    message: case_.input,
    onda: case_.onda,
    channel: case_.channel,
    history: [],
    mode,
    mockWeb: mode === "deterministic" ? undefined : false,
    mockRag: mode === "deterministic" ? undefined : false,
  };

  let response = "";
  let response_ms = 0;
  let error: string | undefined;
  try {
    const r = await invokeOnda(params, case_);
    response = r.text;
    response_ms = r.ms;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  let dimensions = judgeCaseHeuristic(case_, response, case_.channel, peerResponse);
  let judge: EvalCaseResult["judge"] = "heuristic";
  if (useLlmJudge() && response.length > 0) {
    const llm = await judgeCaseLlm(case_, case_.input, response);
    if (llm) {
      dimensions = mergeHeuristicAndLlm(case_, dimensions, llm);
      judge = "heuristic+llm";
    }
  }

  return {
    case: case_,
    response,
    response_ms,
    dimensions,
    global_pass: error ? false : allDimensionsPass(dimensions),
    regression: false,
    regression_reasons: [],
    judge,
    error,
  };
}
