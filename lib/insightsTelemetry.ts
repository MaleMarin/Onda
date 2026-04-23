/**
 * ONDA Insights — eventos estructurados sin PII (lista diaria en KV o memoria en dev).
 */

import { EjeOnda } from "@/content/types";
import type { DetectedIntent } from "@/lib/insightsTagger";

export type InsightsChannel = "web" | "whatsapp";
export type InsightsLocaleBucket = "pt" | "es" | "auto";
export type InsightsContentType = "text" | "audio" | "image" | "link" | "mixed";
export type InsightsOutputFormat = "texto" | "audio" | "infografia";
export type InsightsVerbosity = "curto" | "normal" | "longo";

export type TelemetryEvent = {
  timestamp: string;
  channel: InsightsChannel;
  locale: InsightsLocaleBucket;
  eje: EjeOnda | null;
  detected_intent: DetectedIntent;
  content_type: InsightsContentType;
  output_format: InsightsOutputFormat;
  verbosity: InsightsVerbosity;
  sources_requested: boolean;
  risk_flags: { emergency: boolean; scam: boolean; sensitive: boolean; simple3: boolean };
  outcome: "ok" | "fallback" | "error";
  error_code?: string;
  turn_stats: { user_chars: number; assistant_chars: number; latency_ms?: number };
  tags: string[];
  summary_safe?: string;
  lifecycle?: "start" | "end";
  request_id?: string;
};

const EVENTS_PREFIX = "onda_events:";
const MAX_TAGS = 8;
const MAX_LIST_PER_DAY = 8_000;
const FORBIDDEN_SERIAL_KEYS = [
  "user_message",
  "assistant_message",
  "message",
  "messages",
  "raw_user",
  "raw_assistant",
  "history",
  "body",
] as const;

function telemetryTtlSeconds(): number {
  const n = parseInt(process.env.TELEMETRY_TTL_DAYS || "30", 10);
  const days = Number.isFinite(n) ? Math.min(90, Math.max(1, n)) : 30;
  return days * 24 * 60 * 60;
}

function utcDayString(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function eventsKey(day: string): string {
  return `${EVENTS_PREFIX}${day}`;
}

type KvClient = {
  rpush: (key: string, ...values: string[]) => Promise<number>;
  lrange: (key: string, start: number, stop: number) => Promise<string[]>;
  ltrim: (key: string, start: number, stop: number) => Promise<unknown>;
  expire?: (key: string, seconds: number) => Promise<number | unknown>;
};

function hasKvEnv(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function getKv(): Promise<KvClient | null> {
  if (!hasKvEnv()) return null;
  try {
    const mod = await import("@vercel/kv");
    const kv = mod.kv ?? mod.default;
    if (kv && typeof kv.rpush === "function" && typeof kv.lrange === "function") {
      return kv as KvClient;
    }
    return null;
  } catch {
    return null;
  }
}

/** Memoria por proceso (dev / tests sin KV). */
const memoryByDay = new Map<string, TelemetryEvent[]>();

function normalizeEvent(e: TelemetryEvent): TelemetryEvent {
  const tags = (e.tags ?? []).filter((t) => typeof t === "string" && t.length > 0).slice(0, MAX_TAGS);
  let summary = e.summary_safe?.trim();
  if (summary && summary.length > 160) summary = summary.slice(0, 157) + "...";
  return {
    ...e,
    tags,
    summary_safe: summary,
  };
}

function assertNoForbiddenPayload(obj: Record<string, unknown>): void {
  for (const k of FORBIDDEN_SERIAL_KEYS) {
    if (k in obj) {
      throw new Error(`[insightsTelemetry] campo prohibido en evento: ${k}`);
    }
  }
}

/**
 * Persiste un evento de insights (fail-open: errores solo en consola).
 */
export async function recordEvent(event: TelemetryEvent): Promise<void> {
  const normalized = normalizeEvent(event);
  const payload = { ...normalized } as Record<string, unknown>;
  assertNoForbiddenPayload(payload);
  const line = JSON.stringify(payload);
  const day = utcDayString(new Date(normalized.timestamp || Date.now()));
  const key = eventsKey(day);

  const kv = await getKv();
  if (kv) {
    try {
      await kv.rpush(key, line);
      await kv.ltrim(key, -MAX_LIST_PER_DAY, -1);
      if (typeof kv.expire === "function") {
        await kv.expire(key, telemetryTtlSeconds());
      }
    } catch (e) {
      console.warn("[insightsTelemetry] KV rpush fail-open:", e);
    }
    return;
  }

  try {
    const list = memoryByDay.get(day) ?? [];
    list.push(normalized);
    if (list.length > MAX_LIST_PER_DAY) list.splice(0, list.length - MAX_LIST_PER_DAY);
    memoryByDay.set(day, list);
  } catch (e) {
    console.warn("[insightsTelemetry] memoria fail-open:", e);
  }
}

/** Solo tests: vacía buffer en memoria. */
export function __resetInsightsMemoryForTests(): void {
  memoryByDay.clear();
}

function parseDay(s: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

function* eachDayInclusive(start: string, end: string): Generator<string> {
  const a = parseDay(start);
  const b = parseDay(end);
  if (!a || !b) return;
  const d0 = new Date(`${a}T00:00:00.000Z`);
  const d1 = new Date(`${b}T00:00:00.000Z`);
  for (let t = d0.getTime(); t <= d1.getTime(); t += 86400000) {
    yield utcDayString(new Date(t));
  }
}

export async function fetchEventsBetween(startDay: string, endDay: string): Promise<TelemetryEvent[]> {
  const start = parseDay(startDay);
  const end = parseDay(endDay);
  if (!start || !end) return [];
  const out: TelemetryEvent[] = [];
  const kv = await getKv();
  for (const day of eachDayInclusive(start, end)) {
    const key = eventsKey(day);
    if (kv) {
      try {
        const lines = await kv.lrange(key, 0, -1);
        for (const line of lines) {
          try {
            const ev = JSON.parse(line) as TelemetryEvent;
            out.push(ev);
          } catch {
            /* skip */
          }
        }
      } catch (e) {
        console.warn("[insightsTelemetry] lrange fail-open:", day, e);
      }
    } else {
      const mem = memoryByDay.get(day) ?? [];
      out.push(...mem);
    }
  }
  return out;
}

export type InsightsSummaryJson = {
  range_days: number;
  start_day: string;
  end_day: string;
  total_events: number;
  top_topics: { tag: string; count: number }[];
  top_intents: { intent: string; count: number }[];
  format_counts: Record<string, number>;
  sources_requested_pct: number;
  eje_distribution: Record<string, number>;
  top_errors: { code: string; count: number }[];
  friction_buckets: { day: string; fallback_or_error: number }[];
  avg_latency_ms: number | null;
};

function countMap<T extends string>(items: T[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const x of items) {
    m[x] = (m[x] ?? 0) + 1;
  }
  return m;
}

function topEntries(m: Record<string, number>, n: number): { key: string; count: number }[] {
  return Object.entries(m)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

export function buildInsightsSummary(events: TelemetryEvent[], startDay: string, endDay: string): InsightsSummaryJson {
  const onlyEnd = events.filter((e) => e.lifecycle !== "start");
  const intents = onlyEnd.map((e) => e.detected_intent);
  const intentCounts = countMap(intents);
  const tagFlat: string[] = [];
  for (const e of onlyEnd) {
    for (const t of e.tags ?? []) tagFlat.push(t);
  }
  const tagCounts = countMap(tagFlat);
  const formatCounts: Record<string, number> = {};
  for (const e of onlyEnd) {
    const f = e.output_format || "texto";
    formatCounts[f] = (formatCounts[f] ?? 0) + 1;
  }
  const ejeDist: Record<string, number> = {};
  for (const e of onlyEnd) {
    const k = e.eje ?? "none";
    ejeDist[k] = (ejeDist[k] ?? 0) + 1;
  }
  const withSources = onlyEnd.filter((e) => e.sources_requested).length;
  const sources_requested_pct = onlyEnd.length ? Math.round((1000 * withSources) / onlyEnd.length) / 10 : 0;

  const errCodes: string[] = [];
  for (const e of onlyEnd) {
    if (e.outcome === "error" || e.outcome === "fallback") {
      if (e.error_code) errCodes.push(e.error_code);
      else errCodes.push(e.outcome);
    }
  }
  const errCounts = countMap(errCodes);

  const frictionByDay: Record<string, number> = {};
  for (const e of onlyEnd) {
    if (e.outcome === "error" || e.outcome === "fallback") {
      const day = (e.timestamp || "").slice(0, 10) || utcDayString();
      frictionByDay[day] = (frictionByDay[day] ?? 0) + 1;
    }
  }
  const frictionRows = Object.entries(frictionByDay)
    .map(([day, fallback_or_error]) => ({ day, fallback_or_error }))
    .sort((a, b) => b.fallback_or_error - a.fallback_or_error)
    .slice(0, 14);

  const latencies = onlyEnd.map((e) => e.turn_stats?.latency_ms).filter((n): n is number => typeof n === "number" && n >= 0);
  const avg_latency_ms =
    latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null;

  const dayMs = (d: string) => new Date(`${d}T00:00:00.000Z`).getTime();
  const range_days = Math.max(1, Math.round((dayMs(endDay) - dayMs(startDay)) / 86400000) + 1);

  return {
    range_days,
    start_day: startDay,
    end_day: endDay,
    total_events: events.length,
    top_topics: topEntries(tagCounts, 10).map(({ key, count }) => ({ tag: key, count })),
    top_intents: topEntries(intentCounts as Record<string, number>, 10).map(({ key, count }) => ({
      intent: key,
      count,
    })),
    format_counts: formatCounts,
    sources_requested_pct,
    eje_distribution: ejeDist,
    top_errors: topEntries(errCounts, 8).map(({ key, count }) => ({ code: key, count })),
    friction_buckets: frictionRows,
    avg_latency_ms,
  };
}

export type CsvAggregateRow = {
  date: string;
  channel: string;
  eje: string;
  locale: string;
  intent: string;
  tag: string;
  count: number;
  format_pref: string;
  sources_rate_pct: number;
  errors_count: number;
};

export function buildInsightsCsvRows(events: TelemetryEvent[]): CsvAggregateRow[] {
  const onlyEnd = events.filter((e) => e.lifecycle !== "start");
  type Key = string;
  const map = new Map<
    Key,
    {
      date: string;
      channel: string;
      eje: string;
      locale: string;
      intent: string;
      tag: string;
      count: number;
      format_pref: string;
      sources_hits: number;
      errors: number;
    }
  >();

  for (const e of onlyEnd) {
    const date = (e.timestamp || "").slice(0, 10) || utcDayString();
    const tags = (e.tags?.length ? e.tags : ["_none_"]) as string[];
    for (const tag of tags) {
      const k = [date, e.channel, e.eje ?? "none", e.locale, e.detected_intent, tag, e.output_format].join("|");
      const cur = map.get(k) ?? {
        date,
        channel: e.channel,
        eje: e.eje ?? "none",
        locale: e.locale,
        intent: e.detected_intent,
        tag,
        count: 0,
        format_pref: e.output_format,
        sources_hits: 0,
        errors: 0,
      };
      cur.count += 1;
      if (e.sources_requested) cur.sources_hits += 1;
      if (e.outcome === "error" || e.outcome === "fallback") cur.errors += 1;
      map.set(k, cur);
    }
  }

  const rows: CsvAggregateRow[] = [];
  for (const v of map.values()) {
    rows.push({
      date: v.date,
      channel: v.channel,
      eje: v.eje,
      locale: v.locale,
      intent: v.intent,
      tag: v.tag,
      count: v.count,
      format_pref: v.format_pref,
      sources_rate_pct: v.count ? Math.round((1000 * v.sources_hits) / v.count) / 10 : 0,
      errors_count: v.errors,
    });
  }
  rows.sort((a, b) => (a.date === b.date ? a.tag.localeCompare(b.tag) : a.date.localeCompare(b.date)));
  return rows;
}
