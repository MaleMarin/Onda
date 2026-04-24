/**
 * Tipos del dominio de contribuciones comunitarias (escucha estructurada).
 * Constantes/catálogos en `lib/onda/contributions/constants.ts`.
 */

export type ContributionChannel = "web" | "whatsapp";

export type ContributionEjeSlug = "onda_a_mano" | "onda_civita" | "onda_profes";

export type ContributionType =
  | "experiencia"
  | "duda_persistente"
  | "correccion"
  | "sugerencia"
  | "caso_reportado"
  | "senal_comunitaria";

export type ContributionUrgency = "low" | "medium" | "high";

export type ContributionSentiment = "negative" | "neutral" | "positive" | "mixed";

export type SourceRisk = "unknown" | "needs_review" | "verified" | "rejected";

export type ReviewStatus =
  | "new"
  | "triaged"
  | "in_review"
  | "verified"
  | "incorporated"
  | "rejected";

/** Documento público/admin (sin `turnToken` en el contrato principal; ver `OndaContributionRecord`). */
export type CommunityContribution = {
  id: string;
  createdAt: string;
  updatedAt?: string;
  channel: ContributionChannel;
  eje: ContributionEjeSlug;
  conversationId?: string;
  messageId?: string;
  userQuestion: string;
  assistantResponseSummary?: string;
  contributionText: string;
  contributionType: ContributionType;
  topic?: string;
  tags?: string[];
  sentiment?: ContributionSentiment;
  urgency: ContributionUrgency;
  sourceRisk: SourceRisk;
  reviewStatus: ReviewStatus;
  internalNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  locale?: string;
  optionalContactAllowed?: boolean;
  /** Cubos UTC para agregaciones futuras (dashboard). */
  statsBucketDay?: string;
  statsBucketMonth?: string;
};

/** Fila persistida: dedupe por turno en web. */
export type OndaContributionRecord = CommunityContribution & { turnToken?: string };

export type ListeningInviteStreamPayload = {
  show: boolean;
  /** Web: el turno espera respuesta de experiencia en el siguiente mensaje (sin burbuja de formulario al cerrar el stream). */
  expectingExperienceFollowUp?: boolean;
  /** Solo `soft_nudge`: una línea suave si la persona no compartió experiencia; sin formulario. */
  inviteVariant?: "soft_nudge";
  prompt: string;
  turnToken: string;
  userEcho: string;
  assistantSummary: string;
  topicHint: string;
  locale: string;
  suggestedContributionType?: ContributionType;
};

export function ejeOndaToContributionSlug(eje: string | null | undefined): ContributionEjeSlug {
  if (eje === "CIVITA") return "onda_civita";
  if (eje === "PROFES") return "onda_profes";
  return "onda_a_mano";
}

export function normalizeContributionType(raw: string): ContributionType | null {
  const t = raw.trim();
  if (t === "señal_comunitaria") return "senal_comunitaria";
  switch (t) {
    case "experiencia":
    case "duda_persistente":
    case "correccion":
    case "sugerencia":
    case "caso_reportado":
    case "senal_comunitaria":
      return t;
    default:
      return null;
  }
}

export function utcDayBucket(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function utcMonthBucket(d = new Date()): string {
  return d.toISOString().slice(0, 7);
}
