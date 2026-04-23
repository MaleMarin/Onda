import { getFirestore } from "@/lib/firebaseConfig";
import {
  type ContributionEjeSlug,
  type ContributionType,
  type ContributionUrgency,
  type ReviewStatus,
  type ContributionChannel,
  type OndaContributionRecord,
} from "@/lib/onda/contributions/types";
import { firestoreDocToContributionRecord } from "@/lib/onda/contributions/saveContribution";
import { ONDA_CONTRIBUTIONS_COLLECTION } from "@/lib/onda/contributions/constants";

export type ListContributionsFilters = {
  eje?: ContributionEjeSlug;
  reviewStatus?: ReviewStatus;
  contributionType?: ContributionType;
  topic?: string;
  urgency?: ContributionUrgency;
  channel?: ContributionChannel;
  fromIso?: string;
  toIso?: string;
  limit?: number;
};

export async function listOndaContributions(filters: ListContributionsFilters): Promise<OndaContributionRecord[]> {
  const db = getFirestore();
  if (!db) return [];
  const lim = Math.min(Math.max(filters.limit ?? 200, 1), 500);
  const snap = await db
    .collection(ONDA_CONTRIBUTIONS_COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(lim)
    .get();

  let rows = snap.docs.map((d) => firestoreDocToContributionRecord(d.id, d.data()));

  if (filters.eje) rows = rows.filter((r) => r.eje === filters.eje);
  if (filters.reviewStatus) rows = rows.filter((r) => r.reviewStatus === filters.reviewStatus);
  if (filters.contributionType) rows = rows.filter((r) => r.contributionType === filters.contributionType);
  if (filters.channel) rows = rows.filter((r) => r.channel === filters.channel);
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
