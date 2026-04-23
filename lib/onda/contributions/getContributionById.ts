import { getFirestore } from "@/lib/firebaseConfig";
import { ONDA_CONTRIBUTIONS_COLLECTION } from "@/lib/onda/contributions/constants";
import type { OndaContributionRecord } from "@/lib/onda/contributions/types";
import { firestoreDocToContributionRecord } from "@/lib/onda/contributions/saveContribution";

export async function getOndaContributionById(id: string): Promise<OndaContributionRecord | null> {
  const db = getFirestore();
  if (!db) return null;
  const d = await db.collection(ONDA_CONTRIBUTIONS_COLLECTION).doc(id).get();
  if (!d.exists) return null;
  return firestoreDocToContributionRecord(d.id, d.data()!);
}

