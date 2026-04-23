import { FieldValue, Timestamp, type DocumentData } from "firebase-admin/firestore";
import { getFirestore } from "@/lib/firebaseConfig";
import {
  type CommunityContribution,
  type ContributionChannel,
  type ContributionEjeSlug,
  type ContributionType,
  type ContributionUrgency,
  type ReviewStatus,
  type SourceRisk,
  REVIEW_STATUSES,
  normalizeContributionType,
} from "@/lib/communityContributionTypes";

export const COMMUNITY_CONTRIBUTIONS_COLLECTION = "onda_community_contributions";

/** Registro persistido: mismo contrato que `CommunityContribution` más `turnToken` para dedupe. */
export type CommunityContributionRecord = CommunityContribution & { turnToken: string };

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
  const rawType = typeof data.contributionType === "string" ? data.contributionType : "";
  const contributionType = normalizeContributionType(rawType) ?? ("experiencia" as ContributionType);

  const assistantRaw = data.assistantResponseSummary;
  const assistantResponseSummary =
    typeof assistantRaw === "string" && assistantRaw.trim() ? assistantRaw.trim().slice(0, 2000) : undefined;

  const topicRaw = data.topic;
  const topic = typeof topicRaw === "string" && topicRaw.trim() ? topicRaw.trim().slice(0, 200) : undefined;

  const tags = Array.isArray(data.tags) ? data.tags.map(String).slice(0, 24).map((t) => t.slice(0, 80)) : undefined;

  const internalRaw = data.internalNotes;
  const internalNotes =
    typeof internalRaw === "string" && internalRaw.trim() ? internalRaw.trim().slice(0, 8000) : undefined;

  const reviewedBy = typeof data.reviewedBy === "string" && data.reviewedBy.trim() ? data.reviewedBy.trim() : undefined;
  const reviewedAt =
    data.reviewedAt instanceof Timestamp ? (tsToIso(data.reviewedAt) ?? undefined) : undefined;

  const locale = typeof data.locale === "string" && data.locale.trim() ? data.locale.trim().slice(0, 32) : undefined;

  const rec: CommunityContributionRecord = {
    id,
    createdAt: createdAt || "",
    channel: data.channel,
    eje: data.eje,
    conversationId: data.conversationId ?? "",
    userMessage: data.userMessage ?? "",
    contributionText: data.contributionText ?? "",
    contributionType,
    urgency: data.urgency ?? "low",
    sourceRisk: (data.sourceRisk as SourceRisk) || "needs_review",
    reviewStatus: data.reviewStatus ?? "new",
    optionalContactAllowed: Boolean(data.optionalContactAllowed),
    turnToken: data.turnToken ?? "",
  };
  if (assistantResponseSummary !== undefined) rec.assistantResponseSummary = assistantResponseSummary;
  if (topic !== undefined) rec.topic = topic;
  if (tags !== undefined && tags.length > 0) rec.tags = tags;
  if (internalNotes !== undefined) rec.internalNotes = internalNotes;
  if (reviewedBy !== undefined) rec.reviewedBy = reviewedBy;
  if (reviewedAt !== undefined) rec.reviewedAt = reviewedAt;
  if (locale !== undefined) rec.locale = locale;
  return rec;
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
  assistantResponseSummary?: string;
  contributionText: string;
  contributionType: ContributionType;
  topic?: string;
  tags?: string[];
  optionalContactAllowed?: boolean;
  locale?: string;
};

function urgencyForPublicContribution(type: ContributionType): ContributionUrgency {
  if (type === "caso_reportado" || type === "correccion" || type === "senal_comunitaria") return "medium";
  return "low";
}

export async function createCommunityContribution(input: CreateInput): Promise<{ id: string } | { error: string }> {
  const db = getFirestore();
  if (!db) return { error: "firestore_unavailable" };

  const existing = await findContributionByTurnToken(input.turnToken);
  if (existing) return { error: "duplicate_turn" };

  const urgency = urgencyForPublicContribution(input.contributionType);

  const ref = db.collection(COMMUNITY_CONTRIBUTIONS_COLLECTION).doc();

  const payload: Record<string, unknown> = {
    channel: input.channel,
    eje: input.eje,
    conversationId: input.conversationId.slice(0, 512),
    turnToken: input.turnToken.trim(),
    userMessage: input.userMessage.slice(0, 8000),
    contributionText: input.contributionText.slice(0, 4000),
    contributionType: input.contributionType,
    urgency,
    sourceRisk: "needs_review",
    reviewStatus: "new" as ReviewStatus,
    optionalContactAllowed: Boolean(input.optionalContactAllowed),
    createdAt: FieldValue.serverTimestamp(),
  };

  const sum = input.assistantResponseSummary?.trim();
  if (sum) payload.assistantResponseSummary = sum.slice(0, 2000);

  const top = input.topic?.trim();
  if (top) payload.topic = top.slice(0, 200);

  if (input.tags?.length) {
    payload.tags = input.tags.slice(0, 24).map((t) => t.slice(0, 80));
  }

  const loc = input.locale?.trim();
  if (loc) payload.locale = loc.slice(0, 32);

  await ref.set(payload);

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
  if (filters.contributionType) {
    rows = rows.filter((r) => r.contributionType === filters.contributionType);
  }
  if (filters.topic) {
    const q = filters.topic.toLowerCase();
    rows = rows.filter((r) => (r.topic ?? "").toLowerCase().includes(q));
  }
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
