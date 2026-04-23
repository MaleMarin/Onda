import { getFirestore } from "@/lib/firebaseConfig";
import { ONDA_CONTRIBUTIONS_COLLECTION } from "@/lib/onda/contributions/constants";

export type ContributionMetrics = {
  total: number;
  byDay: Record<string, number>;
  byEje: Record<string, number>;
  byType: Record<string, number>;
  byTopic: Record<string, number>;
  byReviewStatus: Record<string, number>;
};

function inc(map: Record<string, number>, key: string | undefined | null): void {
  const k = (key ?? "").trim() || "unknown";
  map[k] = (map[k] ?? 0) + 1;
}

/**
 * Métricas mínimas (sin dashboard): cuenta contribuciones y deriva buckets.
 * Nota: en este MVP se basa en lectura de documentos recientes; luego se puede materializar en otra capa.
 */
export async function getOndaContributionMetrics(opts?: { limit?: number }): Promise<ContributionMetrics> {
  const db = getFirestore();
  if (!db) {
    return { total: 0, byDay: {}, byEje: {}, byType: {}, byTopic: {}, byReviewStatus: {} };
  }
  const lim = Math.min(Math.max(opts?.limit ?? 500, 1), 2000);
  const snap = await db
    .collection(ONDA_CONTRIBUTIONS_COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(lim)
    .get();

  const byDay: Record<string, number> = {};
  const byEje: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const byTopic: Record<string, number> = {};
  const byReviewStatus: Record<string, number> = {};

  for (const d of snap.docs) {
    const x = d.data() as Record<string, unknown>;
    const day = typeof x.statsBucketDay === "string" ? x.statsBucketDay : typeof x.createdAt === "string" ? x.createdAt.slice(0, 10) : "unknown";
    inc(byDay, day);
    inc(byEje, typeof x.eje === "string" ? x.eje : "unknown");
    inc(byType, typeof x.contributionType === "string" ? x.contributionType : "unknown");
    inc(byTopic, typeof x.topic === "string" ? x.topic : "unknown");
    inc(byReviewStatus, typeof x.reviewStatus === "string" ? x.reviewStatus : "unknown");
  }

  return {
    total: snap.size,
    byDay,
    byEje,
    byType,
    byTopic,
    byReviewStatus,
  };
}

