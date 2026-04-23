import { FieldValue, Timestamp, type DocumentData } from "firebase-admin/firestore";
import { getFirestore } from "@/lib/firebaseConfig";
import {
  type CommunityContribution,
  type ContributionChannel,
  type ContributionEjeSlug,
  type ContributionType,
  type ContributionUrgency,
  type OndaContributionRecord,
  type ReviewStatus,
  type SourceRisk,
  normalizeContributionType,
  utcDayBucket,
  utcMonthBucket,
} from "@/lib/onda/contributions/types";
import { ONDA_CONTRIBUTIONS_COLLECTION } from "@/lib/onda/contributions/constants";
import { sanitizeContributionPlainText } from "@/lib/onda/contributions/sanitizeContributionFields";
import {
  inferContributionSentiment,
  suggestContributionTypeFromText,
} from "@/lib/onda/contributions/extractContributionMetadata";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidTurnToken(s: string): boolean {
  return typeof s === "string" && UUID_RE.test(s.trim());
}

function tsToIso(t: Timestamp | null | undefined): string | null {
  if (!t?.toDate) return null;
  try {
    return t.toDate().toISOString();
  } catch {
    return null;
  }
}

function urgencyForType(type: ContributionType): ContributionUrgency {
  if (type === "caso_reportado" || type === "correccion" || type === "senal_comunitaria") return "medium";
  return "low";
}

export function firestoreDocToContributionRecord(id: string, data: DocumentData): OndaContributionRecord {
  const createdAt = data.createdAt instanceof Timestamp ? tsToIso(data.createdAt) : null;
  const rawType = typeof data.contributionType === "string" ? data.contributionType : "";
  const contributionType = normalizeContributionType(rawType) ?? ("experiencia" as ContributionType);

  const uq =
    (typeof data.userQuestion === "string" && data.userQuestion) ||
    (typeof data.userMessage === "string" && data.userMessage) ||
    "";

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

  const sentimentRaw = data.sentiment;
  const sentiment =
    sentimentRaw === "negative" ||
    sentimentRaw === "neutral" ||
    sentimentRaw === "positive" ||
    sentimentRaw === "mixed"
      ? sentimentRaw
      : undefined;

  const updatedAt = data.updatedAt instanceof Timestamp ? tsToIso(data.updatedAt) ?? undefined : undefined;

  const rec: OndaContributionRecord = {
    id,
    createdAt: createdAt || "",
    channel: data.channel,
    eje: data.eje,
    conversationId: typeof data.conversationId === "string" ? data.conversationId : undefined,
    messageId: typeof data.messageId === "string" ? data.messageId : undefined,
    userQuestion: uq,
    contributionText: data.contributionText ?? "",
    contributionType,
    urgency: data.urgency ?? "low",
    sourceRisk: (data.sourceRisk as SourceRisk) || "needs_review",
    reviewStatus: (data.reviewStatus as ReviewStatus) ?? "new",
    optionalContactAllowed: Boolean(data.optionalContactAllowed),
    statsBucketDay: typeof data.statsBucketDay === "string" ? data.statsBucketDay : undefined,
    statsBucketMonth: typeof data.statsBucketMonth === "string" ? data.statsBucketMonth : undefined,
    turnToken: typeof data.turnToken === "string" ? data.turnToken : undefined,
  };
  if (updatedAt) rec.updatedAt = updatedAt;
  if (assistantResponseSummary !== undefined) rec.assistantResponseSummary = assistantResponseSummary;
  if (topic !== undefined) rec.topic = topic;
  if (tags !== undefined && tags.length > 0) rec.tags = tags;
  if (internalNotes !== undefined) rec.internalNotes = internalNotes;
  if (reviewedBy !== undefined) rec.reviewedBy = reviewedBy;
  if (reviewedAt !== undefined) rec.reviewedAt = reviewedAt;
  if (locale !== undefined) rec.locale = locale;
  if (sentiment !== undefined) rec.sentiment = sentiment;
  return rec;
}

export async function findContributionByTurnToken(turnToken: string): Promise<OndaContributionRecord | null> {
  const db = getFirestore();
  if (!db) return null;
  const snap = await db
    .collection(ONDA_CONTRIBUTIONS_COLLECTION)
    .where("turnToken", "==", turnToken.trim())
    .limit(1)
    .get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  return firestoreDocToContributionRecord(d.id, d.data());
}

export type SaveContributionInput = {
  channel: ContributionChannel;
  eje: ContributionEjeSlug;
  conversationId?: string;
  messageId?: string;
  turnToken?: string;
  userQuestion: string;
  assistantResponseSummary?: string;
  contributionText: string;
  contributionType: ContributionType;
  topic?: string;
  tags?: string[];
  sentiment?: CommunityContribution["sentiment"];
  optionalContactAllowed?: boolean;
  locale?: string;
};

export async function saveOndaContribution(input: SaveContributionInput): Promise<{ id: string } | { error: string }> {
  const db = getFirestore();
  if (!db) return { error: "firestore_unavailable" };

  if (input.turnToken && isValidTurnToken(input.turnToken)) {
    const existing = await findContributionByTurnToken(input.turnToken);
    if (existing) return { error: "duplicate_turn" };
  }

  const contributionText = sanitizeContributionPlainText(input.contributionText, 4000);
  const userQuestion = sanitizeContributionPlainText(input.userQuestion, 8000);
  const assistantSummary = input.assistantResponseSummary
    ? sanitizeContributionPlainText(input.assistantResponseSummary, 2000)
    : undefined;

  const contributionType = input.contributionType ?? suggestContributionTypeFromText(contributionText);
  const sentiment = input.sentiment ?? inferContributionSentiment(contributionText);
  const now = new Date();
  const day = utcDayBucket(now);
  const month = utcMonthBucket(now);

  const ref = db.collection(ONDA_CONTRIBUTIONS_COLLECTION).doc();
  const payload: Record<string, unknown> = {
    channel: input.channel,
    eje: input.eje,
    userQuestion,
    contributionText,
    contributionType,
    urgency: urgencyForType(contributionType),
    sourceRisk: "needs_review",
    reviewStatus: "new" as ReviewStatus,
    optionalContactAllowed: Boolean(input.optionalContactAllowed),
    statsBucketDay: day,
    statsBucketMonth: month,
    createdAt: FieldValue.serverTimestamp(),
  };

  if (input.conversationId) payload.conversationId = input.conversationId.slice(0, 512);
  if (input.messageId) payload.messageId = input.messageId.slice(0, 128);
  if (input.turnToken && isValidTurnToken(input.turnToken)) payload.turnToken = input.turnToken.trim();
  if (assistantSummary) payload.assistantResponseSummary = assistantSummary;
  const top = input.topic?.trim();
  if (top) payload.topic = top.slice(0, 200);
  if (input.tags?.length) payload.tags = input.tags.slice(0, 24).map((t) => t.slice(0, 80));
  if (sentiment) payload.sentiment = sentiment;
  const loc = input.locale?.trim();
  if (loc) payload.locale = loc.slice(0, 32);

  await ref.set(payload);
  return { id: ref.id };
}
