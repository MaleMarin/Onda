import type { EjeOnda } from "@/content/types";
import type { ConversationIntent } from "@/lib/intentClassifier";
import type { DetectedIntent } from "@/lib/insightsTagger";
import type { RiskPipelineFlags } from "@/lib/riskModes";
import type { OndaChatLocale } from "@/lib/userPreferences";
import type { ContributionChannel, ListeningInviteStreamPayload } from "@/lib/onda/contributions/types";
import { ejeOndaToContributionSlug, type ContributionType } from "@/lib/onda/contributions/types";
import { shouldInviteContribution } from "@/lib/onda/contributions/shouldInviteContribution";

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

  if (!inv.shouldInvite || !inv.suggestedPrompt || !inv.suggestedTopic) return null;

  const suggestedContributionType =
    inv.suggestedContributionType ?? suggestedTypeFromTurn(args.conversationIntent, args.detectedIntent);

  return {
    show: true,
    prompt: inv.suggestedPrompt,
    turnToken: args.turnToken,
    userEcho: truncate(args.userText, 500),
    assistantSummary: truncate(args.assistantText, 400),
    topicHint: inv.suggestedTopic,
    locale: String(args.locale || "es-LATAM"),
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
