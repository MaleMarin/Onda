/** Canal de origen del aporte (persistencia y panel). */
export type ContributionChannel = "web" | "whatsapp";

/** Eje en formato estable para Firestore y filtros del panel. */
export type ContributionEjeSlug = "onda_a_mano" | "onda_civita" | "onda_profes";

export type ContributionType =
  | "experiencia"
  | "duda_persistente"
  | "correccion"
  | "sugerencia"
  | "caso_reportado"
  | "senal_comunitaria";

export type ContributionUrgency = "low" | "medium" | "high";

/**
 * Riesgo de la fuente del contenido aportado.
 * Regla de producto: todo ingreso público arranca en `needs_review` (nunca verdad automática).
 */
export type SourceRisk = "unknown" | "needs_review" | "verified" | "rejected";

export type ReviewStatus =
  | "new"
  | "triaged"
  | "in_review"
  | "verified"
  | "incorporated"
  | "rejected";

/** Documento de aporte de comunidad (API y panel). */
export type CommunityContribution = {
  id: string;
  createdAt: string;
  channel: ContributionChannel;
  eje: ContributionEjeSlug;
  conversationId: string;
  userMessage: string;
  assistantResponseSummary?: string;
  contributionText: string;
  contributionType: ContributionType;
  topic?: string;
  tags?: string[];
  urgency: ContributionUrgency;
  sourceRisk: SourceRisk;
  reviewStatus: ReviewStatus;
  internalNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  locale?: string;
  optionalContactAllowed?: boolean;
};

/** Payload opcional al final del NDJSON del chat (una línea JSON). */
export type ListeningInviteStreamPayload = {
  show: boolean;
  /** Texto breve para UI o segundo mensaje en WhatsApp. */
  prompt: string;
  /** Idempotencia y trazabilidad por turno (no es secreto). */
  turnToken: string;
  /** Eco seguro del mensaje de usuario (truncado en servidor). */
  userEcho: string;
  assistantSummary: string;
  topicHint: string;
  locale: string;
};

/** Alineado con valores de `EjeOnda` en `content/types`. */
export function ejeOndaToContributionSlug(eje: string | null | undefined): ContributionEjeSlug {
  if (eje === "CIVITA") return "onda_civita";
  if (eje === "PROFES") return "onda_profes";
  return "onda_a_mano";
}

export const CONTRIBUTION_TYPES: ContributionType[] = [
  "experiencia",
  "duda_persistente",
  "correccion",
  "sugerencia",
  "caso_reportado",
  "senal_comunitaria",
];

export const REVIEW_STATUSES: ReviewStatus[] = [
  "new",
  "triaged",
  "in_review",
  "verified",
  "incorporated",
  "rejected",
];

/** Normaliza tipo almacenado legacy (`señal_comunitaria` con tilde). */
export function normalizeContributionType(raw: string): ContributionType | null {
  const t = raw.trim();
  if (t === "señal_comunitaria") return "senal_comunitaria";
  return CONTRIBUTION_TYPES.includes(t as ContributionType) ? (t as ContributionType) : null;
}
