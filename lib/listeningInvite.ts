import { EjeOnda } from "@/content/types";
import type { ConversationIntent } from "@/lib/intentClassifier";
import type { DetectedIntent } from "@/lib/insightsTagger";
import type { RiskPipelineFlags } from "@/lib/riskModes";
import type { OndaChatLocale } from "@/lib/userPreferences";
import {
  ejeOndaToContributionSlug,
  type ContributionUrgency,
  type ListeningInviteStreamPayload,
} from "@/lib/communityContributionTypes";

const PROMPTS_ES = [
  "¿Te pasó algo parecido? Si quieres, cuéntame en una línea cómo fue tu caso (no es obligatorio).",
  "¿Qué parte te sigue confundiendo? Puedes dejar una línea y el equipo lo revisa después.",
  "¿Has visto un caso similar? Si quieres aportar contexto para otras personas, escribe una línea.",
  "Si quieres compartir cómo lo viviste en la práctica, una línea basta; lo revisamos con calma.",
];

const PROMPTS_PT = [
  "Aconteceu algo parecido? Se quiser, conte em uma linha como foi (não é obrigatório).",
  "Qual parte ainda te confunde? Pode deixar uma linha que a equipe revisa depois.",
  "Viu um caso parecido? Se quiser acrescentar contexto para outras pessoas, escreva uma linha.",
  "Se quiser compartilhar como foi na prática, uma linha basta; revisamos com calma.",
];

function pickPrompt(locale: OndaChatLocale | string | undefined, seed: string): string {
  const isPt = String(locale || "").toLowerCase().startsWith("pt");
  const pool = isPt ? PROMPTS_PT : PROMPTS_ES;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return pool[h % pool.length];
}

function truncate(s: string, max: number): string {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + "…";
}

/**
 * Heurística: invitar a aportes solo en temas donde el contexto comunitario aporta valor,
 * y nunca en emergencia o datos sensibles (evita capturar relatos de alto riesgo vía formulario).
 */
export function shouldOfferStructuredListening(p: {
  userText: string;
  conversationIntent: ConversationIntent;
  detectedIntent: DetectedIntent;
  riskPipeline: RiskPipelineFlags;
  riskScamTelemetry: boolean;
  riskSensitiveTelemetry: boolean;
  eje: EjeOnda | null;
}): boolean {
  if (p.riskPipeline.emergency) return false;
  if (p.riskSensitiveTelemetry) return false;

  const t = (p.userText || "").trim();
  if (t.length < 10) return false;

  if (p.riskScamTelemetry) return true;
  if (p.detectedIntent === "estafa" || p.detectedIntent === "link_noticia" || p.detectedIntent === "pantallazo") {
    return true;
  }
  if (p.detectedIntent === "microleccion") return true;

  if (
    p.conversationIntent === "fact_check" ||
    p.conversationIntent === "disinformation" ||
    p.conversationIntent === "action"
  ) {
    return true;
  }

  if (p.eje === EjeOnda.CIVITA || p.eje === EjeOnda.PROFES) return true;

  if (p.eje === EjeOnda.A_MANO && p.conversationIntent === "explanation" && t.length >= 48) return true;

  return false;
}

function topicFromSignals(
  detectedIntent: DetectedIntent,
  conversationIntent: ConversationIntent,
  eje: EjeOnda | null
): string {
  const slug = ejeOndaToContributionSlug(eje);
  if (detectedIntent === "estafa" || conversationIntent === "disinformation") return "desinformacion_estafas";
  if (detectedIntent === "link_noticia" || conversationIntent === "fact_check") return "verificacion";
  if (conversationIntent === "action") return "tramites_ciudadania";
  if (slug === "onda_profes" || detectedIntent === "microleccion") return "ia_educacion";
  if (slug === "onda_civita") return "ciudadania_digital";
  return "vida_digital";
}

/** Urgencia sugerida para triage (el equipo puede cambiarla en el panel). */
export function computeContributionUrgency(p: {
  riskScamTelemetry: boolean;
  conversationIntent: ConversationIntent;
  detectedIntent: DetectedIntent;
}): ContributionUrgency {
  if (p.riskScamTelemetry || p.detectedIntent === "estafa") return "medium";
  if (p.conversationIntent === "disinformation" || p.detectedIntent === "link_noticia") return "medium";
  return "low";
}

export function buildListeningStreamPayload(args: {
  locale: OndaChatLocale | string | undefined;
  userText: string;
  assistantText: string;
  conversationIntent: ConversationIntent;
  detectedIntent: DetectedIntent;
  riskPipeline: RiskPipelineFlags;
  riskScamTelemetry: boolean;
  riskSensitiveTelemetry: boolean;
  eje: EjeOnda | null;
  turnToken: string;
}): ListeningInviteStreamPayload | null {
  const show = shouldOfferStructuredListening({
    userText: args.userText,
    conversationIntent: args.conversationIntent,
    detectedIntent: args.detectedIntent,
    riskPipeline: args.riskPipeline,
    riskScamTelemetry: args.riskScamTelemetry,
    riskSensitiveTelemetry: args.riskSensitiveTelemetry,
    eje: args.eje,
  });
  if (!show) return null;

  const prompt = pickPrompt(args.locale, args.turnToken);
  const userEcho = truncate(args.userText, 500);
  const assistantSummary = truncate(args.assistantText, 400);
  const topicHint = topicFromSignals(args.detectedIntent, args.conversationIntent, args.eje);

  return {
    show: true,
    prompt,
    turnToken: args.turnToken,
    userEcho,
    assistantSummary,
    topicHint,
    locale: String(args.locale || "es-LATAM"),
  };
}
