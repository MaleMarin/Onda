import { verifyAdminAuth } from "@/lib/adminAuth";
import { getOndaContributionById } from "@/lib/onda/contributions/getContributionById";
import { updateOndaContributionReview } from "@/lib/onda/contributions/updateContributionReview";
import type { ContributionUrgency, ReviewStatus } from "@/lib/onda/contributions/types";
import { REVIEW_STATUSES } from "@/lib/onda/contributions/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: { id: string } }) {
  if (!verifyAdminAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = ctx.params;
  if (!id) return Response.json({ error: "Not found" }, { status: 404 });
  const row = await getOndaContributionById(id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(row);
}

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  if (!verifyAdminAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = ctx.params;
  if (!id) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const patch: Parameters<typeof updateOndaContributionReview>[1] = {};

  if (typeof body.reviewStatus === "string" && REVIEW_STATUSES.includes(body.reviewStatus as ReviewStatus)) {
    patch.reviewStatus = body.reviewStatus as ReviewStatus;
  }
  if (typeof body.internalNotes === "string") {
    patch.internalNotes = body.internalNotes;
  }
  if (Array.isArray(body.tags)) {
    patch.tags = body.tags.filter((x: unknown) => typeof x === "string");
  }
  if (typeof body.topic === "string") {
    patch.topic = body.topic;
  }
  if (body.urgency === "low" || body.urgency === "medium" || body.urgency === "high") {
    patch.urgency = body.urgency as ContributionUrgency;
  }
  if (typeof body.reviewedBy === "string") {
    patch.reviewedBy = body.reviewedBy;
  }

  const result = await updateOndaContributionReview(id, patch);
  if ("error" in result) {
    const status = result.error === "empty_patch" ? 400 : 500;
    return Response.json({ error: result.error }, { status });
  }
  const row = await getOndaContributionById(id);
  return Response.json(row);
}
