/**
 * Alertas de gasto estimado (USD) por uso de APIs LLM.
 * Acumulación diaria en Vercel KV; notificación opcional vía webhook (Slack/Discord).
 */

import { kv } from "@vercel/kv";

const SPENDING_KEY_PREFIX = "spending:daily:";
const TTL_SECONDS = 48 * 60 * 60; // 48 h

export interface SpendingStatus {
  todayUSD: number;
  alertThreshold: number;
  criticalThreshold: number;
  alertTriggered: boolean;
  criticalTriggered: boolean;
}

function isKvConfigured(): boolean {
  const url = process.env.KV_REST_API_URL?.trim();
  const token = process.env.KV_REST_API_TOKEN?.trim();
  return Boolean(url && token);
}

function parseEnvUsd(name: string, defaultVal: number): number {
  const v = process.env[name]?.trim();
  if (!v) return defaultVal;
  const n = parseFloat(v);
  return Number.isFinite(n) && n >= 0 ? n : defaultVal;
}

function thresholds(): { alert: number; critical: number } {
  return {
    alert: parseEnvUsd("SPENDING_ALERT_DAILY_USD", 5),
    critical: parseEnvUsd("SPENDING_ALERT_CRITICAL_USD", 20),
  };
}

/** YYYY-MM-DD en UTC */
export function spendingDayKeyUtc(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function spendingRedisKey(day: string): string {
  return `${SPENDING_KEY_PREFIX}${day}`;
}

function roundUsd(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

/**
 * Estima costo en USD según modelo y tokens (precios aprox. por 1K tokens; revisar si cambian las tarifas).
 */
export function estimateCostUSD(model: string, inputTokens: number, outputTokens: number): number {
  const m = model.toLowerCase();
  let inPer1k = 0.00015;
  let outPer1k = 0.0006;

  if (m.includes("gpt-4o-mini") || m.includes("gpt4o-mini")) {
    inPer1k = 0.00015;
    outPer1k = 0.0006;
  } else if (m.includes("gpt-4o") || m.includes("gpt-4-o")) {
    inPer1k = 0.005;
    outPer1k = 0.015;
  } else if (m.includes("claude") && (m.includes("3-5") || m.includes("3.5") || m.includes("sonnet"))) {
    inPer1k = 0.003;
    outPer1k = 0.015;
  } else if (m.includes("gemini")) {
    inPer1k = 0.00035;
    outPer1k = 0.00105;
  }

  const inT = Math.max(0, inputTokens);
  const outT = Math.max(0, outputTokens);
  return (inT / 1000) * inPer1k + (outT / 1000) * outPer1k;
}

async function readTodayTotalUsd(day: string): Promise<number> {
  if (!isKvConfigured()) return 0;
  try {
    const raw = await kv.get(spendingRedisKey(day));
    if (raw == null) return 0;
    const n = parseFloat(String(raw));
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

async function addToTodayTotalUsd(day: string, deltaUsd: number): Promise<number> {
  if (!isKvConfigured()) {
    console.warn("[spendingAlert] KV no configurado; no se acumula gasto en Redis.");
    return roundUsd(deltaUsd);
  }
  const key = spendingRedisKey(day);
  try {
    const prev = await readTodayTotalUsd(day);
    const next = roundUsd(prev + deltaUsd);
    await kv.set(key, String(next), { ex: TTL_SECONDS });
    return next;
  } catch (e) {
    console.warn("[spendingAlert] addToTodayTotalUsd error:", e);
    return 0;
  }
}

/**
 * Suma el costo estimado al total del día (UTC) en KV y devuelve estado vs umbrales.
 */
export async function recordSpending(
  model: string,
  inputTokens: number,
  outputTokens: number
): Promise<SpendingStatus> {
  const delta = estimateCostUSD(model, inputTokens, outputTokens);
  const day = spendingDayKeyUtc();
  const todayUSD = roundUsd(await addToTodayTotalUsd(day, delta));
  const { alert: alertThreshold, critical: criticalThreshold } = thresholds();

  return {
    todayUSD,
    alertThreshold,
    criticalThreshold,
    alertTriggered: todayUSD >= alertThreshold,
    criticalTriggered: todayUSD >= criticalThreshold,
  };
}

/**
 * Envía alerta vía webhook si SPENDING_ALERT_WEBHOOK_URL está definida.
 * Incluye `text` (Slack) y `content` (Discord).
 */
export async function sendSpendingAlert(
  level: "warning" | "critical",
  status: SpendingStatus
): Promise<void> {
  const url = process.env.SPENDING_ALERT_WEBHOOK_URL?.trim();
  if (!url) return;

  const label = level === "critical" ? "CRÍTICO" : "AVISO";
  const text = `[ONDA ${label}] Gasto estimado hoy: $${status.todayUSD.toFixed(2)} USD (umbral: $${status.alertThreshold}, crítico: $${status.criticalThreshold})`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, content: text }),
    });
    if (!res.ok) {
      console.warn("[spendingAlert] webhook respondió", res.status, await res.text().catch(() => ""));
    }
  } catch (e) {
    console.warn("[spendingAlert] webhook falló:", e);
  }
}

export type SpendingSummaryResponse = {
  today: string;
  todayUSD: number;
  alertThreshold: number;
  criticalThreshold: number;
  percentOfAlert: number;
  status: "ok" | "warning" | "critical";
};

/**
 * Lectura del total del día sin incrementar (para GET admin).
 */
export async function getSpendingSummary(): Promise<SpendingSummaryResponse> {
  const today = spendingDayKeyUtc();
  const todayUSD = roundUsd(await readTodayTotalUsd(today));
  const { alert: alertThreshold, critical: criticalThreshold } = thresholds();

  const percentOfAlert =
    alertThreshold > 0 ? Math.round((todayUSD / alertThreshold) * 100) : 0;

  let status: "ok" | "warning" | "critical" = "ok";
  if (todayUSD >= criticalThreshold) status = "critical";
  else if (todayUSD >= alertThreshold) status = "warning";

  return {
    today,
    todayUSD,
    alertThreshold,
    criticalThreshold,
    percentOfAlert,
    status,
  };
}
