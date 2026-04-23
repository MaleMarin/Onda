import type {
  ContributionChannel,
  ContributionEjeSlug,
  ContributionType,
  ContributionUrgency,
  ReviewStatus,
  SourceRisk,
} from "@/lib/onda/contributions/types";

export const ONDA_CONTRIBUTIONS_COLLECTION = "onda_contributions";

export const CONTRIBUTION_CHANNELS: ContributionChannel[] = ["web", "whatsapp"];

export const CONTRIBUTION_EJES: ContributionEjeSlug[] = ["onda_a_mano", "onda_civita", "onda_profes"];

export const CONTRIBUTION_TYPES: ContributionType[] = [
  "experiencia",
  "duda_persistente",
  "correccion",
  "sugerencia",
  "caso_reportado",
  "senal_comunitaria",
];

export const CONTRIBUTION_URGENCIES: ContributionUrgency[] = ["low", "medium", "high"];

export const REVIEW_STATUSES: ReviewStatus[] = [
  "new",
  "triaged",
  "in_review",
  "verified",
  "incorporated",
  "rejected",
];

export const SOURCE_RISKS: SourceRisk[] = ["unknown", "needs_review", "verified", "rejected"];

