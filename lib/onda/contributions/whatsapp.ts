import { randomUUID } from "crypto";
import type { EjeOnda } from "@/content/types";
import type { ConversationIntent } from "@/lib/intentClassifier";
import type { DetectedIntent } from "@/lib/insightsTagger";
import type { RiskPipelineFlags } from "@/lib/riskModes";
import type { OndaChatLocale } from "@/lib/userPreferences";
import type { ListeningInviteStreamPayload } from "@/lib/onda/contributions/types";
import { buildListeningInvitePayload } from "@/lib/onda/contributions/web";
import {
  isShortAcknowledgement,
  looksLikeContributionFollowUp,
  looksLikeNewStandaloneQuestion,
} from "@/lib/onda/contributions/extractContributionMetadata";

export function buildWhatsAppListeningInvite(args: {
  locale: OndaChatLocale | string | undefined;
  userText: string;
  assistantText: string;
  conversationIntent: ConversationIntent;
  detectedIntent: DetectedIntent;
  riskPipeline: RiskPipelineFlags;
  riskScamTelemetry: boolean;
  riskSensitiveTelemetry: boolean;
  eje: EjeOnda | null;
  alreadyInvitedInConversation: boolean;
}): ListeningInviteStreamPayload | null {
  return buildListeningInvitePayload({
    channel: "whatsapp",
    locale: args.locale,
    userText: args.userText,
    assistantText: args.assistantText,
    conversationIntent: args.conversationIntent,
    detectedIntent: args.detectedIntent,
    riskPipeline: args.riskPipeline,
    riskScamTelemetry: args.riskScamTelemetry,
    riskSensitiveTelemetry: args.riskSensitiveTelemetry,
    eje: args.eje,
    turnToken: randomUUID(),
    alreadyInvitedInConversation: args.alreadyInvitedInConversation,
  });
}

/** Decide si un texto entrante se debería interpretar como aporte (tras invitación previa). */
export function shouldTreatIncomingAsContribution(text: string): boolean {
  const t = (text ?? "").trim();
  if (!t) return false;
  if (isShortAcknowledgement(t)) return false;
  if (looksLikeNewStandaloneQuestion(t)) return false;
  return looksLikeContributionFollowUp(t);
}

