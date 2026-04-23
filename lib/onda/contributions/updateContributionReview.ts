import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getFirestore } from "@/lib/firebaseConfig";
import type { ContributionUrgency, ReviewStatus } from "@/lib/onda/contributions/types";
import { ONDA_CONTRIBUTIONS_COLLECTION, REVIEW_STATUSES } from "@/lib/onda/contributions/constants";

export type UpdateContributionPatch = {
  reviewStatus?: ReviewStatus;
  internalNotes?: string;
  tags?: string[];
  topic?: string;
  urgency?: ContributionUrgency;
  reviewedBy?: string;
};

export async function updateOndaContributionReview(
  id: string,
  patch: UpdateContributionPatch
): Promise<{ ok: true } | { error: string }> {
  const db = getFirestore();
  if (!db) return { error: "firestore_unavailable" };

  const updates: Record<string, unknown> = {};
  updates.updatedAt = FieldValue.serverTimestamp();

  if (patch.reviewStatus !== undefined) {
    if (!REVIEW_STATUSES.includes(patch.reviewStatus)) return { error: "invalid_review_status" };
    updates.reviewStatus = patch.reviewStatus;
    if (
      patch.reviewStatus === "verified" ||
      patch.reviewStatus === "rejected" ||
      patch.reviewStatus === "incorporated"
    ) {
      updates.reviewedAt = FieldValue.serverTimestamp();
      updates.reviewedBy = (patch.reviewedBy || "admin").slice(0, 120);
    }
    if (patch.reviewStatus === "triaged" || patch.reviewStatus === "in_review") {
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

  const meaningfulKeys = Object.keys(updates).filter((k) => k !== "updatedAt");
  if (meaningfulKeys.length === 0) return { error: "empty_patch" };

  await db.collection(ONDA_CONTRIBUTIONS_COLLECTION).doc(id).update(updates);
  return { ok: true };
}

/** ISO de updatedAt tras lectura (opcional para API). */
export function timestampToIso(t: unknown): string | undefined {
  if (t instanceof Timestamp) {
    try {
      return t.toDate().toISOString();
    } catch {
      return undefined;
    }
  }
  return undefined;
}
