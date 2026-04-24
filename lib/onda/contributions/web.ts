import type { EjeOnda } from "@/content/types";
import type { ConversationIntent } from "@/lib/intentClassifier";
import type { DetectedIntent } from "@/lib/insightsTagger";
import type { RiskPipelineFlags } from "@/lib/riskModes";
import type { OndaChatLocale } from "@/lib/userPreferences";
import type { ContributionChannel, ListeningInviteStreamPayload } from "@/lib/onda/contributions/types";
import { ejeOndaToContributionSlug, type ContributionType } from "@/lib/onda/contributions/types";
import { shouldInviteContribution } from "@/lib/onda/contributions/shouldInviteContribution";

/** Burbuja opcional en web cuando la persona no respondió con experiencia al puente de Onda. */
export function buildSoftListeningNudgeInvite(locale: string | undefined): ListeningInviteStreamPayload {
  const isPt = String(locale || "").toLowerCase().startsWith("pt");
  return {
    show: true,
    inviteVariant: "soft_nudge",
    prompt: isPt
      ? "Se em algum momento quiser nos contar o que acontece por aí, estamos ouvindo."
      : "Si en algún momento quieres contarnos qué pasa por allá, estamos escuchando.",
    turnToken: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `soft-${Date.now()}`,
    userEcho: "",
    assistantSummary: "",
    topicHint: "escucha_comunitaria",
    locale: isPt ? "pt-BR" : "es-LATAM",
    suggestedContributionType: "experiencia",
  };
}

function truncate(s: string, max: number): string {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + "…";
}

function suggestedTypeFromTurn(
  conversationIntent: ConversationIntent,
  detectedIntent: DetectedIntent
): ContributionType {
  if (conversationIntent === "action") return "duda_persistente";
  if (conversationIntent === "disinformation" || detectedIntent === "estafa" || detectedIntent === "link_noticia") {
    return "caso_reportado";
  }
  if (detectedIntent === "microleccion") return "experiencia";
  return "experiencia";
}

/**
 * Construye metadatos de invitación (NDJSON en web; segundo mensaje en WhatsApp).
 * Punto único de decisión: `shouldInviteContribution` (reglas heurísticas, sin ML).
 */
export function buildListeningInvitePayload(args: {
  channel: ContributionChannel;
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
  alreadyInvitedInConversation: boolean;
}): ListeningInviteStreamPayload | null {
  const inv = shouldInviteContribution({
    channel: args.channel,
    eje: args.eje,
    conversationIntent: args.conversationIntent,
    detectedIntent: args.detectedIntent,
    riskPipeline: args.riskPipeline,
    riskScamTelemetry: args.riskScamTelemetry,
    riskSensitiveTelemetry: args.riskSensitiveTelemetry,
    userText: args.userText,
    assistantResponseChars: args.assistantText.trim().length,
    alreadyInvitedInConversation: args.alreadyInvitedInConversation,
    locale: args.locale,
    promptSeed: args.turnToken,
  });

  if (!inv.shouldInvite || !inv.suggestedTopic) return null;

  const suggestedContributionType =
    inv.suggestedContributionType ?? suggestedTypeFromTurn(args.conversationIntent, args.detectedIntent);

  const userEcho = truncate(args.userText, 500);
  const assistantSummary = truncate(args.assistantText, 400);
  const locale = String(args.locale || "es-LATAM");

  if (args.channel === "web") {
    return {
      show: false,
      expectingExperienceFollowUp: true,
      prompt: "",
      turnToken: args.turnToken,
      userEcho,
      assistantSummary,
      topicHint: inv.suggestedTopic,
      locale,
      suggestedContributionType,
    };
  }

  if (!inv.suggestedPrompt) return null;

  return {
    show: true,
    prompt: inv.suggestedPrompt,
    turnToken: args.turnToken,
    userEcho,
    assistantSummary,
    topicHint: inv.suggestedTopic,
    locale,
    suggestedContributionType,
  };
}

/** @deprecated usar `buildListeningInvitePayload` con `channel: "web"`. */
export function buildWebListeningInvitePayload(
  args: Omit<Parameters<typeof buildListeningInvitePayload>[0], "channel">
): ListeningInviteStreamPayload | null {
  return buildListeningInvitePayload({ ...args, channel: "web" });
}

export { ejeOndaToContributionSlug };
