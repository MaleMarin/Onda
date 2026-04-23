import { insightsAuthOk, insightsUnauthorizedResponse } from "@/lib/insightsAuth";
import { buildInsightsCsvRows, fetchEventsBetween } from "@/lib/insightsTelemetry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseRange(spec: string | null): { startDay: string; endDay: string } {
  const end = new Date();
  const endDay = end.toISOString().slice(0, 10);
  const days = spec === "30d" ? 30 : 7;
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const startDay = start.toISOString().slice(0, 10);
  return { startDay, endDay };
}

function csvEscape(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request) {
  if (!insightsAuthOk(req)) {
    return insightsUnauthorizedResponse();
  }
  const url = new URL(req.url);
  const { startDay, endDay } = parseRange(url.searchParams.get("range"));
  const events = await fetchEventsBetween(startDay, endDay);
  const rows = buildInsightsCsvRows(events);
  const header = [
    "date",
    "channel",
    "eje",
    "locale",
    "intent",
    "tag",
    "count",
    "format_pref",
    "sources_rate_pct",
    "errors_count",
  ];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        r.date,
        r.channel,
        r.eje,
        r.locale,
        r.intent,
        csvEscape(r.tag),
        String(r.count),
        r.format_pref,
        String(r.sources_rate_pct),
        String(r.errors_count),
      ].join(",")
    ),
  ];
  const body = lines.join("\n") + "\n";
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="onda-insights-${startDay}_to_${endDay}.csv"`,
    },
  });
}
