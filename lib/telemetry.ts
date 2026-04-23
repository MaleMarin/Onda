import { kv } from "@vercel/kv";

const TIMING_KEY_PREFIX = "telemetry:timing:";
const MAX_TIMINGS_PER_DAY = 200;
const TIMING_TTL_SECONDS = 7 * 24 * 60 * 60;

export type TelemetryCanal = "web" | "wa";

// ─── Request ID ───────────────────────────────────────────────

/**
 * Genera un request ID único y legible.
 * Formato: onda-{canal}-{timestamp}-{random4}
 */
export function generateRequestId(canal: TelemetryCanal): string {
  const random = Math.random().toString(36).slice(2, 6);
  return `onda-${canal}-${Date.now()}-${random}`;
}

// ─── Latencia por modelo ──────────────────────────────────────

export interface ModelTiming {
  requestId: string;
  model: string;
  canal: TelemetryCanal;
  intent: string;
  durationMs: number;
  tokenCount?: number;
  success: boolean;
  errorType?: string;
  timestamp: string;
}

function timingKeyForDate(dateStr: string): string {
  return `${TIMING_KEY_PREFIX}${dateStr}`;
}

function todayUtcDateString(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function parseStoredTimings(raw: unknown): ModelTiming[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw as ModelTiming[];
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw) as unknown;
      return Array.isArray(p) ? (p as ModelTiming[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Registra la latencia de una llamada a modelo en KV.
 * Fail-open: si KV falla, solo console.warn.
 */
export async function recordModelTiming(timing: ModelTiming): Promise<void> {
  try {
    const day = timing.timestamp?.slice(0, 10) || todayUtcDateString();
    const key = timingKeyForDate(day);
    const raw = await kv.get(key);
    const list = parseStoredTimings(raw);
    list.push(timing);
    const trimmed = list.slice(-MAX_TIMINGS_PER_DAY);
    await kv.set(key, JSON.stringify(trimmed), { ex: TIMING_TTL_SECONDS });
  } catch (e) {
    console.warn("[telemetry] recordModelTiming fail-open:", e);
  }
}

export function startTimer(): {
  stop: () => { durationMs: number; timestamp: string };
} {
  const t0 = Date.now();
  return {
    stop: () => ({
      durationMs: Date.now() - t0,
      timestamp: new Date().toISOString(),
    }),
  };
}

/**
 * Ejecuta una promesa y registra latencia (no relanza errores de telemetría).
 */
export async function withModelTelemetry<T>(
  telemetry: { requestId: string; canal: TelemetryCanal } | null | undefined,
  model: string,
  intent: string,
  fn: () => Promise<T>
): Promise<T> {
  if (!telemetry) {
    return await fn();
  }
  const timer = startTimer();
  let success = false;
  let errorType: string | undefined;
  try {
    const out = await fn();
    success = true;
    return out;
  } catch (err) {
    errorType = err instanceof Error ? err.constructor.name : "unknown";
    throw err;
  } finally {
    const t = timer.stop();
    void recordModelTiming({
      requestId: telemetry.requestId,
      model,
      canal: telemetry.canal,
      intent,
      durationMs: t.durationMs,
      success,
      errorType,
      timestamp: t.timestamp,
    }).catch(() => {});
  }
}

// ─── Health y métricas agregadas ─────────────────────────────

export interface DailyStats {
  date: string;
  totalRequests: number;
  successRate: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  byModel: Record<
    string,
    {
      count: number;
      avgMs: number;
      errors: number;
    }
  >;
  byCanal: Record<string, number>;
  byIntent: Record<string, number>;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1);
  return sorted[Math.max(0, idx)] ?? 0;
}

/**
 * Estadísticas del día a partir de timings en KV.
 */
export async function getDailyStats(date?: string): Promise<DailyStats | null> {
  const dateStr = date?.slice(0, 10) || todayUtcDateString();
  try {
    const raw = await kv.get(timingKeyForDate(dateStr));
    const list = parseStoredTimings(raw);
    if (list.length === 0) return null;

    const totalRequests = list.length;
    const successes = list.filter((x) => x.success).length;
    const successRate = totalRequests > 0 ? successes / totalRequests : 0;
    const latencies = list.map((x) => x.durationMs).sort((a, b) => a - b);
    const sum = latencies.reduce((a, b) => a + b, 0);
    const avgLatencyMs = totalRequests > 0 ? sum / totalRequests : 0;
    const p95LatencyMs = percentile(latencies, 0.95);

    const byModel: DailyStats["byModel"] = {};
    for (const row of list) {
      const m = row.model || "unknown";
      if (!byModel[m]) byModel[m] = { count: 0, avgMs: 0, errors: 0 };
      byModel[m].count += 1;
      if (!row.success) byModel[m].errors += 1;
    }
    for (const m of Object.keys(byModel)) {
      const rows = list.filter((r) => r.model === m);
      const ms = rows.map((r) => r.durationMs);
      const s = ms.reduce((a, b) => a + b, 0);
      byModel[m].avgMs = rows.length ? s / rows.length : 0;
    }

    const byCanal: Record<string, number> = {};
    const byIntent: Record<string, number> = {};
    for (const row of list) {
      const c = row.canal || "unknown";
      byCanal[c] = (byCanal[c] ?? 0) + 1;
      const i = row.intent || "unknown";
      byIntent[i] = (byIntent[i] ?? 0) + 1;
    }

    return {
      date: dateStr,
      totalRequests,
      successRate,
      avgLatencyMs,
      p95LatencyMs,
      byModel,
      byCanal,
      byIntent,
    };
  } catch (e) {
    console.warn("[telemetry] getDailyStats fail-open:", e);
    return null;
  }
}

/** Comprueba conectividad básica con KV (ping). */
export async function checkKvConnectivity(): Promise<"ok" | "error"> {
  try {
    const r = await kv.ping();
    return r === "PONG" ? "ok" : "ok";
  } catch (e) {
    console.warn("[telemetry] KV ping failed:", e);
    return "error";
  }
}

/** ONDA Insights: eventos agregados sin PII (KV o memoria en dev). */
export {
  recordEvent,
  fetchEventsBetween,
  buildInsightsSummary,
  buildInsightsCsvRows,
  __resetInsightsMemoryForTests,
} from "./insightsTelemetry";
export type {
  TelemetryEvent,
  InsightsSummaryJson,
  CsvAggregateRow,
} from "./insightsTelemetry";
