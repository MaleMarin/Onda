import { EjeOnda } from "@/content/types";
import { getOndaReply, type ArticleContext, type HistoryEntry } from "@/lib/ondaReply";
import { computeRiskPipelineFlags } from "@/lib/riskModes";
import { detectTransparencyRequest } from "@/lib/transparencyMode";
import { parseResponseFormat, wantsSources } from "@/lib/responseFormat";
import { DEFAULT_ONDA_USER_PREFERENCES, mergeOndaUserPreferences } from "@/lib/userPreferences";
import { buildOndaPreferencesForRequest, normalizePrefs } from "@/lib/userPrefs";
import { evalBaseUrl, useFixtureReply } from "../config";
import type { EvalCase, EvalChannel, EvalMode, EvalOnda, InvokeOndaParams } from "../types";
import { MOCK_RAG_SNIPPET } from "../fixtures/mockRag";
import { MOCK_WEB_SNIPPET } from "../fixtures/mockSearchWeb";

function ondaToEje(onda: EvalOnda | null | undefined): EjeOnda | null {
  if (!onda) return null;
  const map: Record<EvalOnda, EjeOnda> = {
    "a-mano": EjeOnda.A_MANO,
    civita: EjeOnda.CIVITA,
    profes: EjeOnda.PROFES,
  };
  return map[onda] ?? null;
}

function toArticleContext(sim: NonNullable<EvalCase["simulate_article"]>): ArticleContext {
  return {
    text: sim.text ?? "",
    thin: sim.thin !== false,
    host: sim.host ?? "ejemplo.org",
    url: sim.url,
    meta: sim.meta ?? { title: "", description: "" },
  };
}

/** Contexto inyectado: en determinista, contexto del caso + mocks salvo `frozenContext` explícito. */
function resolveExtraContext(
  params: InvokeOndaParams,
  case_: Pick<EvalCase, "context">
): string | null {
  if (params.frozenContext?.trim()) return params.frozenContext.trim();
  if (params.mode === "integration") {
    return case_.context?.trim() || null;
  }
  const chunks: string[] = [];
  if (case_.context?.trim()) chunks.push(case_.context.trim());
  if (params.mockWeb !== false) {
    const w = typeof params.mockWeb === "string" && params.mockWeb.trim() ? params.mockWeb : MOCK_WEB_SNIPPET;
    if (w.trim()) chunks.push(w.trim());
  }
  if (params.mockRag !== false) {
    const r = typeof params.mockRag === "string" && params.mockRag.trim() ? params.mockRag : MOCK_RAG_SNIPPET;
    if (r.trim()) chunks.push(r.trim());
  }
  return chunks.join("\n\n").trim() || null;
}

async function readChatStreamResponse(res: Response): Promise<string> {
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${t.slice(0, 200)}`);
  }
  const reader = res.body?.getReader();
  if (!reader) throw new Error("Sin cuerpo en la respuesta del stream");
  const dec = new TextDecoder();
  let buf = "";
  let acc = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const s = line.trim();
      if (!s) continue;
      try {
        const obj = JSON.parse(s) as { text?: string; done?: boolean; error?: string };
        if (typeof obj.text === "string") acc += obj.text;
        if (obj.error) throw new Error(obj.error);
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }
  if (buf.trim()) {
    try {
      const obj = JSON.parse(buf.trim()) as { text?: string };
      if (typeof obj.text === "string") acc += obj.text;
    } catch {
      /* ignore trailing garbage */
    }
  }
  return parseResponseFormat(acc).text.trim();
}

/**
 * Invoca Onda: modo determinista vía `getOndaReply` con contexto congelado/mocks;
 * integración web vía POST NDJSON a `/api/chat/stream`; integración WhatsApp vía `getOndaReply` con canal.
 */
export async function invokeOnda(
  params: InvokeOndaParams,
  case_: Pick<
    EvalCase,
    "input" | "simulate_article" | "context" | "fixture_reply" | "onda" | "channel" | "language" | "prefs"
  >
): Promise<{ text: string; ms: number }> {
  if (useFixtureReply() && case_.fixture_reply?.trim()) {
    return { text: case_.fixture_reply.trim(), ms: 0 };
  }

  const eje = ondaToEje(params.onda ?? case_.onda);
  const history: HistoryEntry[] = (params.history ?? []).map((m) => ({
    role: m.role,
    content: m.content,
  }));
  const unifiedEval = normalizePrefs(case_.prefs ?? {});
  const baseInclusive = mergeOndaUserPreferences(
    DEFAULT_ONDA_USER_PREFERENCES,
    case_.language === "es" ? { locale: "es-LATAM" as const } : { locale: "pt-BR" as const }
  );
  const mergedInclusive = buildOndaPreferencesForRequest(baseInclusive, unifiedEval, params.message);
  const includeSources = unifiedEval.sources || wantsSources(params.message);
  const articleFromCase = params.mockExtract ?? case_.simulate_article;
  const articleContext =
    articleFromCase && Object.keys(articleFromCase).length > 0
      ? toArticleContext(articleFromCase)
      : null;
  const extraContext = resolveExtraContext(params, case_);

  const riskPre = computeRiskPipelineFlags(params.message, false, eje, mergedInclusive.locale);
  const ejeForReply = riskPre.emergency ? EjeOnda.A_MANO : eje;
  const riskPipeline = computeRiskPipelineFlags(params.message, false, ejeForReply, mergedInclusive.locale);

  const t0 = Date.now();

  if (params.mode === "integration" && params.channel === "web") {
    const base = evalBaseUrl().replace(/\/$/, "");
    const body = {
      message: params.message,
      eje,
      history,
      prefs: unifiedEval,
      userPreferences: baseInclusive,
    };
    const res = await fetch(`${base}/api/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await readChatStreamResponse(res);
    return { text, ms: Date.now() - t0 };
  }

  const transparencyExplicit = detectTransparencyRequest(params.message, mergedInclusive.locale)
    ? true
    : undefined;

  const reply = await getOndaReply(
    params.message,
    ejeForReply,
    history.length ? history : null,
    includeSources,
    articleContext,
    params.channel,
    extraContext,
    null,
    null,
    mergedInclusive,
    riskPipeline,
    unifiedEval,
    transparencyExplicit
  );
  const text = parseResponseFormat(reply).text.trim();
  return { text, ms: Date.now() - t0 };
}

export type { EvalMode, InvokeOndaParams };
