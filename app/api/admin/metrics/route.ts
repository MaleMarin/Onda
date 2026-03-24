import { getMetrics } from "@/lib/auditStore";
import { verifyAdminAuth } from "@/lib/adminAuth";
import {
  formatExecutiveSummaryForDonors,
  getDailyImpact,
  getExecutiveSummary,
  getImpactRange,
  mergeImpactDays,
  sumSpendingUsdLastDays,
} from "@/lib/impactMetrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MISSING_ADMIN = "CONFIGURACIÓN FALTANTE: ADMIN_SECRET no está definida.";

/**
 * GET: métricas de impacto (KV + feedback de auditStore + gasto diario en KV).
 * Authorization: Bearer ADMIN_SECRET o sesión cookie tras POST /api/admin/login.
 *
 * Query: ?days=7 (default 7, max 90) | ?summary=1 | ?date=YYYY-MM-DD
 */
export async function GET(req: Request) {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) {
    return Response.json({ error: MISSING_ADMIN }, { status: 500 });
  }
  if (!verifyAdminAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);

  if (url.searchParams.get("summary") === "1") {
    const exec = await getExecutiveSummary();
    return Response.json(formatExecutiveSummaryForDonors(exec), {
      headers: { "Cache-Control": "no-store" },
    });
  }

  const date = url.searchParams.get("date")?.trim();
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const one = await getDailyImpact(date);
    return Response.json(
      { date, daily: one },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  let days = parseInt(url.searchParams.get("days") ?? "7", 10);
  if (!Number.isFinite(days)) days = 7;
  days = Math.min(Math.max(1, days), 90);

  const daily = await getImpactRange(days);
  const merged = mergeImpactDays(daily);

  let avgSatisfaction = 0;
  try {
    const m = await getMetrics();
    if (m && m.totalFeedbackUp + m.totalFeedbackDown > 0) {
      avgSatisfaction = m.totalFeedbackUp / (m.totalFeedbackUp + m.totalFeedbackDown);
    }
  } catch {
    /* */
  }

  let cacheWeighted = 0;
  for (const d of daily) {
    cacheWeighted += d.cacheHitRate * d.totalConversations;
  }
  const cacheHitRate =
    merged.totalConversations > 0 ? cacheWeighted / merged.totalConversations : 0;

  const totalCostUSD = await sumSpendingUsdLastDays(days);

  return Response.json(
    {
      period: `${days} días`,
      daily,
      totals: {
        conversations: merged.totalConversations,
        uniqueUsers: merged.uniqueUsers,
        byOnda: merged.byOnda,
        byCanal: merged.byCanal,
        byIntent: merged.byIntent,
        avgSatisfaction,
        totalCostUSD,
        cacheHitRate,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
