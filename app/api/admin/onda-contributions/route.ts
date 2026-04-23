/**
 * GET: listado para panel interno. Auth: `verifyAdminAuth` (cookie o Bearer ADMIN_SECRET).
 */
import { verifyAdminAuth } from "@/lib/adminAuth";
import { listOndaContributions, type ListContributionsFilters } from "@/lib/onda/contributions/getContributions";
import type { ContributionEjeSlug, ContributionType, ReviewStatus, ContributionUrgency, ContributionChannel } from "@/lib/onda/contributions/types";
import { CONTRIBUTION_TYPES, REVIEW_STATUSES } from "@/lib/onda/contributions/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EJES = new Set(["onda_a_mano", "onda_civita", "onda_profes"]);
const URGENCIES = new Set(["low", "medium", "high"]);
const CHANNELS = new Set(["web", "whatsapp"]);

function q(v: string | null): string | undefined {
  const t = v?.trim();
  return t ? t : undefined;
}

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
  const channel = q(url.searchParams.get("channel"));
  const fromIso = q(url.searchParams.get("from"));
  const toIso = q(url.searchParams.get("to"));
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw ? Number(limitRaw) : 200;

  const filters: ListContributionsFilters = { limit: Number.isFinite(limit) ? limit : 200 };
  if (eje && EJES.has(eje)) filters.eje = eje as ContributionEjeSlug;
  if (reviewStatus && REVIEW_STATUSES.includes(reviewStatus as ReviewStatus)) {
    filters.reviewStatus = reviewStatus as ReviewStatus;
  }
  if (contributionType && CONTRIBUTION_TYPES.includes(contributionType as ContributionType)) {
    filters.contributionType = contributionType as ContributionType;
  }
  if (topic) filters.topic = topic;
  if (urgency && URGENCIES.has(urgency)) filters.urgency = urgency as ContributionUrgency;
  if (channel && CHANNELS.has(channel)) filters.channel = channel as ContributionChannel;
  if (fromIso) filters.fromIso = fromIso;
  if (toIso) filters.toIso = toIso;

  const rows = await listOndaContributions(filters);
  return Response.json({ items: rows });
}
