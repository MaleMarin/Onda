import { insightsAuthOk, insightsUnauthorizedResponse } from "@/lib/insightsAuth";
import { buildInsightsSummary, fetchEventsBetween } from "@/lib/insightsTelemetry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseRange(spec: string | null): { startDay: string; endDay: string; days: number } {
  const end = new Date();
  const endDay = end.toISOString().slice(0, 10);
  const days = spec === "30d" ? 30 : 7;
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const startDay = start.toISOString().slice(0, 10);
  return { startDay, endDay, days };
}

export async function GET(req: Request) {
  if (!insightsAuthOk(req)) {
    return insightsUnauthorizedResponse();
  }
  const url = new URL(req.url);
  const { startDay, endDay, days } = parseRange(url.searchParams.get("range"));
  const events = await fetchEventsBetween(startDay, endDay);
  const summary = buildInsightsSummary(events, startDay, endDay);
  return Response.json({ ...summary, range_param: days === 30 ? "30d" : "7d" });
}
