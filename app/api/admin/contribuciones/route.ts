import { verifyAdminAuth } from "@/lib/adminAuth";
import { listCommunityContributions, type ListFilters } from "@/lib/communityContributionsFirestore";
import type { ContributionEjeSlug, ContributionType, ReviewStatus, ContributionUrgency } from "@/lib/communityContributionTypes";
import { REVIEW_STATUSES } from "@/lib/communityContributionTypes";
import { CONTRIBUTION_TYPES } from "@/lib/communityContributionTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EJES = new Set(["onda_a_mano", "onda_civita", "onda_profes"]);
const URGENCIES = new Set(["low", "medium", "high"]);

function q(v: string | null): string | undefined {
  const t = v?.trim();
  return t ? t : undefined;
}

/**
 * GET: listado de contribuciones (requiere sesión admin o Bearer ADMIN_SECRET).
 */
export async function GET(req: Request) {
  if (!verifyAdminAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const eje = q(url.searchParams.get("eje"));
  const reviewStatus = q(url.searchParams.get("reviewStatus"));
  const contributionType = q(url.searchParams.get("contributionType"));
  const topic = q(url.searchParams.get("topic"));
  const urgency = q(url.searchParams.get("urgency"));
  const fromIso = q(url.searchParams.get("from"));
  const toIso = q(url.searchParams.get("to"));
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw ? Number(limitRaw) : 200;

  const filters: ListFilters = { limit: Number.isFinite(limit) ? limit : 200 };
  if (eje && EJES.has(eje)) filters.eje = eje as ContributionEjeSlug;
  if (reviewStatus && REVIEW_STATUSES.includes(reviewStatus as ReviewStatus)) {
    filters.reviewStatus = reviewStatus as ReviewStatus;
  }
  if (contributionType && CONTRIBUTION_TYPES.includes(contributionType as ContributionType)) {
    filters.contributionType = contributionType as ContributionType;
  }
  if (topic) filters.topic = topic;
  if (urgency && URGENCIES.has(urgency)) filters.urgency = urgency as ContributionUrgency;
  if (fromIso) filters.fromIso = fromIso;
  if (toIso) filters.toIso = toIso;

  const rows = await listCommunityContributions(filters);
  return Response.json({ items: rows });
}
