import { FieldValue, Timestamp, type DocumentData } from "firebase-admin/firestore";
import { getFirestore } from "@/lib/firebaseConfig";
import {
  type ContributionChannel,
  type ContributionEjeSlug,
  type ContributionType,
  type ContributionUrgency,
  type ReviewStatus,
  type SourceRisk,
  CONTRIBUTION_TYPES,
  REVIEW_STATUSES,
} from "@/lib/communityContributionTypes";

export const COMMUNITY_CONTRIBUTIONS_COLLECTION = "onda_community_contributions";

export type CommunityContributionRecord = {
  id: string;
  createdAt: string;
  channel: ContributionChannel;
  eje: ContributionEjeSlug;
  userMessage: string;
  assistantResponseSummary: string;
  contributionText: string;
  contributionType: ContributionType;
  topic: string;
  tags: string[];
  sentiment?: string | null;
  urgency: ContributionUrgency;
  sourceRisk: SourceRisk;
  reviewStatus: ReviewStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  internalNotes: string;
  optionalContactAllowed: boolean;
  locale: string;
  conversationId: string;
  turnToken: string;
};

function tsToIso(t: Timestamp | null | undefined): string | null {
  if (!t?.toDate) return null;
  try {
    return t.toDate().toISOString();
  } catch {
    return null;
  }
}

function docToRecord(id: string, data: DocumentData): CommunityContributionRecord {
  const createdAt = data.createdAt instanceof Timestamp ? tsToIso(data.createdAt) : null;
  return {
    id,
    createdAt: createdAt || "",
    channel: data.channel,
    eje: data.eje,
    userMessage: data.userMessage ?? "",
    assistantResponseSummary: data.assistantResponseSummary ?? "",
    contributionText: data.contributionText ?? "",
    contributionType: data.contributionType,
    topic: data.topic ?? "",
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    sentiment: data.sentiment ?? null,
    urgency: data.urgency ?? "low",
    sourceRisk: (data.sourceRisk as SourceRisk) || "needs_review",
    reviewStatus: data.reviewStatus ?? "new",
    reviewedBy: data.reviewedBy ?? null,
    reviewedAt: data.reviewedAt instanceof Timestamp ? tsToIso(data.reviewedAt) : null,
    internalNotes: data.internalNotes ?? "",
    optionalContactAllowed: Boolean(data.optionalContactAllowed),
    locale: data.locale ?? "",
    conversationId: data.conversationId ?? "",
    turnToken: data.turnToken ?? "",
  };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidTurnToken(s: string): boolean {
  return typeof s === "string" && UUID_RE.test(s.trim());
}

export async function findContributionByTurnToken(turnToken: string): Promise<CommunityContributionRecord | null> {
  const db = getFirestore();
  if (!db) return null;
  const snap = await db
    .collection(COMMUNITY_CONTRIBUTIONS_COLLECTION)
    .where("turnToken", "==", turnToken.trim())
    .limit(1)
    .get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  return docToRecord(d.id, d.data());
}

type CreateInput = {
  channel: ContributionChannel;
  eje: ContributionEjeSlug;
  conversationId: string;
  turnToken: string;
  userMessage: string;
  assistantResponseSummary: string;
  contributionText: string;
  contributionType: ContributionType;
  topic: string;
  tags: string[];
  sentiment?: string | null;
  optionalContactAllowed: boolean;
  locale: string;
};

function urgencyForPublicContribution(type: ContributionType): ContributionUrgency {
  if (type === "caso_reportado" || type === "correccion" || type === "señal_comunitaria") return "medium";
  return "low";
}

export async function createCommunityContribution(input: CreateInput): Promise<{ id: string } | { error: string }> {
  const db = getFirestore();
  if (!db) return { error: "firestore_unavailable" };

  const existing = await findContributionByTurnToken(input.turnToken);
  if (existing) return { error: "duplicate_turn" };

  const urgency = urgencyForPublicContribution(input.contributionType);

  const ref = db.collection(COMMUNITY_CONTRIBUTIONS_COLLECTION).doc();
  await ref.set({
    channel: input.channel,
    eje: input.eje,
    conversationId: input.conversationId.slice(0, 512),
    turnToken: input.turnToken.trim(),
    userMessage: input.userMessage.slice(0, 8000),
    assistantResponseSummary: input.assistantResponseSummary.slice(0, 2000),
    contributionText: input.contributionText.slice(0, 4000),
    contributionType: input.contributionType,
    topic: input.topic.slice(0, 200),
    tags: input.tags.slice(0, 24).map((t) => t.slice(0, 80)),
    sentiment: input.sentiment ? input.sentiment.slice(0, 64) : null,
    urgency,
    sourceRisk: "needs_review",
    reviewStatus: "new" as ReviewStatus,
    reviewedBy: null,
    reviewedAt: null,
    internalNotes: "",
    optionalContactAllowed: Boolean(input.optionalContactAllowed),
    locale: input.locale.slice(0, 32),
    createdAt: FieldValue.serverTimestamp(),
  });

  return { id: ref.id };
}

export type ListFilters = {
  eje?: ContributionEjeSlug;
  reviewStatus?: ReviewStatus;
  contributionType?: ContributionType;
  topic?: string;
  urgency?: ContributionUrgency;
  fromIso?: string;
  toIso?: string;
  limit?: number;
};

export async function listCommunityContributions(filters: ListFilters): Promise<CommunityContributionRecord[]> {
  const db = getFirestore();
  if (!db) return [];
  const lim = Math.min(Math.max(filters.limit ?? 200, 1), 500);
  const snap = await db
    .collection(COMMUNITY_CONTRIBUTIONS_COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(lim)
    .get();

  let rows = snap.docs.map((d) => docToRecord(d.id, d.data()));

  if (filters.eje) rows = rows.filter((r) => r.eje === filters.eje);
  if (filters.reviewStatus) rows = rows.filter((r) => r.reviewStatus === filters.reviewStatus);
  if (filters.contributionType) rows = rows.filter((r) => r.contributionType === filters.contributionType);
  if (filters.topic) rows = rows.filter((r) => r.topic.toLowerCase().includes(filters.topic!.toLowerCase()));
  if (filters.urgency) rows = rows.filter((r) => r.urgency === filters.urgency);
  if (filters.fromIso) {
    const from = Date.parse(filters.fromIso);
    rows = rows.filter((r) => Date.parse(r.createdAt) >= from);
  }
  if (filters.toIso) {
    const to = Date.parse(filters.toIso);
    rows = rows.filter((r) => Date.parse(r.createdAt) <= to);
  }
  return rows;
}

export async function getCommunityContribution(id: string): Promise<CommunityContributionRecord | null> {
  const db = getFirestore();
  if (!db) return null;
  const d = await db.collection(COMMUNITY_CONTRIBUTIONS_COLLECTION).doc(id).get();
  if (!d.exists) return null;
  return docToRecord(d.id, d.data()!);
}

export type PatchContributionInput = {
  reviewStatus?: ReviewStatus;
  internalNotes?: string;
  tags?: string[];
  topic?: string;
  urgency?: ContributionUrgency;
  reviewedBy?: string;
};

export async function patchCommunityContribution(
  id: string,
  patch: PatchContributionInput
): Promise<{ ok: true } | { error: string }> {
  const db = getFirestore();
  if (!db) return { error: "firestore_unavailable" };

  const updates: Record<string, unknown> = {};

  if (patch.reviewStatus !== undefined) {
    if (!REVIEW_STATUSES.includes(patch.reviewStatus)) return { error: "invalid_review_status" };
    updates.reviewStatus = patch.reviewStatus;
    if (patch.reviewStatus === "verified" || patch.reviewStatus === "rejected" || patch.reviewStatus === "incorporated") {
      updates.reviewedAt = FieldValue.serverTimestamp();
      updates.reviewedBy = (patch.reviewedBy || "admin").slice(0, 120);
    }
  }
  if (patch.internalNotes !== undefined) {
    updates.internalNotes = patch.internalNotes.slice(0, 8000);
  }
  if (patch.tags !== undefined) {
    updates.tags = patch.tags.slice(0, 24).map((t) => t.slice(0, 80));
  }
  if (patch.topic !== undefined) {
    updates.topic = patch.topic.slice(0, 200);
  }
  if (patch.urgency !== undefined) {
    updates.urgency = patch.urgency;
  }

  if (Object.keys(updates).length === 0) return { error: "empty_patch" };

  await db.collection(COMMUNITY_CONTRIBUTIONS_COLLECTION).doc(id).update(updates);
  return { ok: true };
}

export function isValidContributionType(t: string): t is ContributionType {
  return CONTRIBUTION_TYPES.includes(t as ContributionType);
}
