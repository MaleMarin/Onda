import { EjeOnda } from "@/content/types";
import type { ConversationIntent } from "@/lib/intentClassifier";
import type { DetectedIntent } from "@/lib/insightsTagger";
import type { RiskPipelineFlags } from "@/lib/riskModes";
import type { OndaChatLocale } from "@/lib/userPreferences";
import type { ContributionChannel, ContributionType } from "@/lib/onda/contributions/types";
import { ejeOndaToContributionSlug } from "@/lib/onda/contributions/types";

export type ShouldInviteContributionInput = {
  channel: ContributionChannel;
  eje: EjeOnda | null;
  conversationIntent: ConversationIntent;
  detectedIntent: DetectedIntent;
  riskPipeline: RiskPipelineFlags;
  riskScamTelemetry: boolean;
  riskSensitiveTelemetry: boolean;
  userText: string;
  /** Longitud del texto ya parseado de la respuesta del asistente. */
  assistantResponseChars: number;
  /** Si en los últimos turnos ya se mostró invitación (evita spam). */
  alreadyInvitedInConversation: boolean;
  locale?: OndaChatLocale | string;
  /** Semilla estable para rotar copy (p. ej. turnToken). */
  promptSeed?: string;
};

export type ShouldInviteContributionResult = {
  shouldInvite: boolean;
  suggestedPrompt?: string;
  suggestedContributionType?: ContributionType;
  suggestedTopic?: string;
};

function topicHint(
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

function userDescribedOwnCaseOrCommunity(userText: string): boolean {
  const t = (userText ?? "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  if (t.length > 420) return true;
  return /\b(mi caso|me pas[oó]|nos pas[oó]|en mi (escuela|aula|colegio|barrio)|vimos que|en mi comunidad|mis alumn|mis estudiantes)\b/.test(
    t
  );
}

function isDefinitionalOnly(userText: string): boolean {
  const t = (userText ?? "").trim().toLowerCase();
  if (t.length > 140) return false;
  return /^(qu[eé] es|que es|defin[ií]ci[oó]n de|significa)\b/.test(t);
}

function pickPrompt(locale: OndaChatLocale | string | undefined, channel: ContributionChannel, seed: string): string {
  const isPt = String(locale || "").toLowerCase().startsWith("pt");
  const esWeb = [
    "¿Te pasó algo parecido? Si quieres, cuéntame tu caso en una línea.",
    "¿Qué parte te sigue confundiendo? Una línea basta; lo revisa el equipo después.",
    "Si quieres, cuéntame tu caso en una línea; tu experiencia ayuda a entender el tema.",
    "Tu experiencia puede ayudarnos a entender mejor este tema (opcional, una línea).",
  ];
  const esWa = [
    "Si te pasó algo parecido, podés contármelo en un mensaje corto.",
    "Si querés, decime qué fue lo más raro o confuso.",
    "Lo revisamos para entender mejor cómo se da este caso; un mensaje corto alcanza.",
  ];
  const ptWeb = [
    "Aconteceu algo parecido? Se quiser, conte em uma linha.",
    "Qual parte ainda confunde? Uma linha basta; a equipe revisa depois.",
    "Sua experiência ajuda a entender o tema (opcional, uma linha).",
  ];
  const ptWa = [
    "Se aconteceu algo parecido, pode me contar em uma mensagem curta.",
    "Se quiser, diga o que foi mais estranho ou confuso.",
  ];
  const pool =
    channel === "whatsapp"
      ? isPt
        ? ptWa
        : esWa
      : isPt
        ? ptWeb
        : esWeb;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return pool[h % pool.length];
}

/**
 * Reglas heurísticas (sin ML): decide si conviene segunda invitación a aporte comunitario.
 */
export function shouldInviteContribution(input: ShouldInviteContributionInput): ShouldInviteContributionResult {
  if (input.riskPipeline.emergency || input.riskSensitiveTelemetry) {
    return { shouldInvite: false };
  }
  if (input.alreadyInvitedInConversation) {
    return { shouldInvite: false };
  }

  const t = (input.userText || "").trim();
  if (t.length < 10) return { shouldInvite: false };

  if (userDescribedOwnCaseOrCommunity(t)) {
    return { shouldInvite: false };
  }

  if (isDefinitionalOnly(t)) {
    return { shouldInvite: false };
  }

  const shortClosedAssistant =
    input.assistantResponseChars > 0 &&
    input.assistantResponseChars < 90 &&
    !input.riskScamTelemetry &&
    input.detectedIntent !== "estafa" &&
    input.detectedIntent !== "link_noticia";

  if (shortClosedAssistant) {
    return { shouldInvite: false };
  }

  let signal = false;
  if (input.riskScamTelemetry) signal = true;
  if (
    input.detectedIntent === "estafa" ||
    input.detectedIntent === "link_noticia" ||
    input.detectedIntent === "pantallazo" ||
    input.detectedIntent === "microleccion"
  ) {
    signal = true;
  }
  if (
    input.conversationIntent === "fact_check" ||
    input.conversationIntent === "disinformation" ||
    input.conversationIntent === "action"
  ) {
    signal = true;
  }
  if (input.eje === EjeOnda.CIVITA || input.eje === EjeOnda.PROFES) {
    signal = true;
  }
  if (input.eje === EjeOnda.A_MANO && input.conversationIntent === "explanation" && t.length >= 48) {
    signal = true;
  }

  if (!signal) {
    return { shouldInvite: false };
  }

  const suggestedTopic = topicHint(input.detectedIntent, input.conversationIntent, input.eje);
  const suggestedContributionType: ContributionType =
    input.detectedIntent === "microleccion" || input.eje === EjeOnda.PROFES ? "experiencia" : "experiencia";

  return {
    shouldInvite: true,
    suggestedPrompt: pickPrompt(input.locale, input.channel, input.promptSeed ?? input.userText),
    suggestedContributionType,
    suggestedTopic,
  };
}
