import { createHash } from "crypto";
import { getMetrics } from "./auditStore";

/** TTL de métricas en KV (90 días). */
const METRICS_TTL = 90 * 24 * 3600;

export interface DailyImpact {
  date: string;
  totalConversations: number;
  uniqueUsers: number;
  byOnda: Record<string, number>;
  byCanal: Record<string, number>;
  byIntent: Record<string, number>;
  cacheHitRate: number;
  avgResponseMs: number;
  satisfactionRate: number;
  topTopics: string[];
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function hasKvEnv(): boolean {
  return !!(process.env.KV_REST_API_URL?.trim() && process.env.KV_REST_API_TOKEN?.trim());
}

type KvClient = {
  hincrby: (key: string, field: string, increment: number) => Promise<number>;
  hgetall: (key: string) => Promise<Record<string, string> | null>;
  expire: (key: string, seconds: number) => Promise<number | unknown>;
  sadd: (key: string, ...members: string[]) => Promise<number>;
  scard: (key: string) => Promise<number>;
  get: (key: string) => Promise<unknown>;
  zincrby: (key: string, increment: number, member: string) => Promise<string | number>;
  zrange: (key: string, min: number, max: number, opts?: { rev?: boolean }) => Promise<string[]>;
};

async function getKv(): Promise<KvClient | null> {
  if (!hasKvEnv()) return null;
  try {
    const mod = await import("@vercel/kv");
    const kv = mod.kv as KvClient;
    if (kv && typeof kv.hincrby === "function") return kv;
    return null;
  } catch {
    return null;
  }
}

function dailyKey(date: string): string {
  return `impact:daily:${date}`;
}
function usersKey(date: string): string {
  return `impact:users:${date}`;
}
function topicsKey(date: string): string {
  return `impact:topics:${date}`;
}

function normalizeEje(eje: string): string {
  const u = (eje || "").trim().toUpperCase();
  if (u === "A_MANO" || u === "CIVITA" || u === "PROFES") return u;
  return "A_MANO";
}

function hashUserIdentifier(id: string): string {
  const raw = (id || "").trim() || "anonymous";
  return createHash("md5").update(raw).digest("hex").slice(0, 8);
}

async function feedbackSatisfactionRate(): Promise<number> {
  try {
    const m = await getMetrics();
    if (m && m.totalFeedbackUp + m.totalFeedbackDown > 0) {
      return m.totalFeedbackUp / (m.totalFeedbackUp + m.totalFeedbackDown);
    }
  } catch {
    /* fail-open */
  }
  return 0;
}

/**
 * Registra una conversación completada (hash HINCRBY + SET usuarios + ZSET temas).
 */
export async function recordConversationImpact(data: {
  eje: string;
  canal: string;
  intent: string;
  responseMs: number;
  cacheHit: boolean;
  userIdentifier: string;
  tema?: string | null;
}): Promise<void> {
  try {
    const kv = await getKv();
    if (!kv) return;

    const today = todayUtc();
    const key = dailyKey(today);
    const ejeN = normalizeEje(data.eje);
    const canal = (data.canal || "web").trim().slice(0, 32);
    const intent = (data.intent || "explanation").trim().slice(0, 48);

    await kv.hincrby(key, "total", 1);
    await kv.hincrby(key, `onda:${ejeN}`, 1);
    await kv.hincrby(key, `canal:${canal}`, 1);
    await kv.hincrby(key, `intent:${intent}`, 1);
    if (data.cacheHit) await kv.hincrby(key, "cacheHits", 1);
    const ms = Math.min(Math.max(0, Math.round(data.responseMs)), 3_600_000);
    await kv.hincrby(key, "responseMsSum", ms);
    await kv.hincrby(key, "responseCount", 1);
    await kv.expire(key, METRICS_TTL);

    const uh = hashUserIdentifier(data.userIdentifier);
    const uk = usersKey(today);
    await kv.sadd(uk, uh);
    await kv.expire(uk, METRICS_TTL);

    const tema = data.tema?.trim();
    if (tema && tema.length > 2) {
      const member = tema.slice(0, 120);
      await kv.zincrby(topicsKey(today), 1, member);
      await kv.expire(topicsKey(today), METRICS_TTL);
    }
  } catch (e) {
    console.warn("[impactMetrics] recordConversationImpact fail-open:", e);
  }
}

function parseHashToDaily(
  date: string,
  raw: Record<string, string>,
  uniqueUsers: number,
  topTopics: string[],
  satisfactionRate: number
): DailyImpact {
  const total = parseInt(raw.total ?? "0", 10) || 0;
  const cacheHits = parseInt(raw.cacheHits ?? "0", 10) || 0;
  const responseMsSum = parseInt(raw.responseMsSum ?? "0", 10) || 0;
  const responseMsCount = parseInt(raw.responseCount ?? "0", 10) || 0;

  const byOnda: Record<string, number> = {};
  const byCanal: Record<string, number> = {};
  const byIntent: Record<string, number> = {};

  for (const [k, v] of Object.entries(raw)) {
    const n = parseInt(v, 10) || 0;
    if (k.startsWith("onda:")) byOnda[k.slice(5)] = n;
    else if (k.startsWith("canal:")) byCanal[k.slice(6)] = n;
    else if (k.startsWith("intent:")) byIntent[k.slice(7)] = n;
  }

  return {
    date,
    totalConversations: total,
    uniqueUsers,
    byOnda,
    byCanal,
    byIntent,
    cacheHitRate: total > 0 ? cacheHits / total : 0,
    avgResponseMs: responseMsCount > 0 ? Math.round(responseMsSum / responseMsCount) : 0,
    satisfactionRate,
    topTopics,
  };
}

async function loadDay(kv: KvClient, date: string, globalSatisfaction: number): Promise<DailyImpact | null> {
  try {
    const raw = await kv.hgetall(dailyKey(date));
    if (!raw || Object.keys(raw).length === 0) return null;
    const total = parseInt(raw.total ?? "0", 10) || 0;
    if (total <= 0) return null;

    const uniqueUsers = await kv.scard(usersKey(date)).catch(() => 0);

    let topTopics: string[] = [];
    try {
      const z = await kv.zrange(topicsKey(date), 0, 4, { rev: true });
      topTopics = Array.isArray(z) ? z : [];
    } catch {
      topTopics = [];
    }

    return parseHashToDaily(date, raw, uniqueUsers, topTopics, globalSatisfaction);
  } catch (e) {
    console.warn("[impactMetrics] loadDay fail-open:", e);
    return null;
  }
}

export async function getDailyImpact(date?: string): Promise<DailyImpact | null> {
  const d = date?.trim() || todayUtc();
  const kv = await getKv();
  if (!kv) return null;
  const sat = await feedbackSatisfactionRate();
  return loadDay(kv, d, sat);
}

export async function getImpactRange(days: number): Promise<DailyImpact[]> {
  const n = Math.min(Math.max(1, Math.floor(days)), 90);
  const kv = await getKv();
  if (!kv) return [];
  const sat = await feedbackSatisfactionRate();
  const out: DailyImpact[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date();
    dt.setUTCDate(dt.getUTCDate() - i);
    const dateStr = dt.toISOString().slice(0, 10);
    const row = await loadDay(kv, dateStr, sat);
    if (row) out.push(row);
  }
  return out;
}

const INTENT_LABELS_ES: Record<string, string> = {
  fact_check: "Verificación de noticias",
  explanation: "Explicación",
  action: "Acción / cómo hacer",
  emotional: "Apoyo emocional",
  disinformation: "Desinformación",
};

const ONDA_LABELS: Record<string, string> = {
  A_MANO: "A Mano",
  CIVITA: "Civita",
  PROFES: "Profes",
};

export async function sumSpendingUsdLastDays(days: number): Promise<number> {
  const kv = await getKv();
  if (!kv) return 0;
  const n = Math.min(Math.max(1, Math.floor(days)), 90);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const dt = new Date();
    dt.setUTCDate(dt.getUTCDate() - i);
    const day = dt.toISOString().slice(0, 10);
    try {
      const raw = await kv.get(`spending:daily:${day}`);
      const v = parseFloat(String(raw ?? "0"));
      if (Number.isFinite(v)) sum += v;
    } catch {
      /* */
    }
  }
  return Math.round(sum * 10_000) / 10_000;
}

export function mergeImpactDays(days: DailyImpact[]): {
  byOnda: Record<string, number>;
  byCanal: Record<string, number>;
  byIntent: Record<string, number>;
  totalConversations: number;
  uniqueUsers: number;
} {
  const byOnda: Record<string, number> = {};
  const byCanal: Record<string, number> = {};
  const byIntent: Record<string, number> = {};
  let totalConversations = 0;
  let uniqueUsers = 0;
  for (const d of days) {
    totalConversations += d.totalConversations;
    uniqueUsers += d.uniqueUsers;
    for (const [k, v] of Object.entries(d.byOnda)) byOnda[k] = (byOnda[k] ?? 0) + v;
    for (const [k, v] of Object.entries(d.byCanal)) byCanal[k] = (byCanal[k] ?? 0) + v;
    for (const [k, v] of Object.entries(d.byIntent)) byIntent[k] = (byIntent[k] ?? 0) + v;
  }
  return { byOnda, byCanal, byIntent, totalConversations, uniqueUsers };
}

function maxKey(rec: Record<string, number>): string | null {
  let best: string | null = null;
  let bestN = -1;
  for (const [k, v] of Object.entries(rec)) {
    if (v > bestN) {
      bestN = v;
      best = k;
    }
  }
  return best;
}

export async function getExecutiveSummary(): Promise<{
  period: string;
  totalConversations: number;
  uniqueUsers: number;
  mostUsedOnda: string;
  mostConsultedIntent: string;
  avgSatisfaction: number;
  totalCostUSD: number;
  costPerConversation: number;
}> {
  const windowDays = 30;
  const daily = await getImpactRange(windowDays);
  const merged = mergeImpactDays(daily);

  let avgSat = 0;
  try {
    const m = await getMetrics();
    if (m && m.totalFeedbackUp + m.totalFeedbackDown > 0) {
      avgSat = m.totalFeedbackUp / (m.totalFeedbackUp + m.totalFeedbackDown);
    }
  } catch {
    /* */
  }

  const topOnda = maxKey(merged.byOnda);
  const topIntent = maxKey(merged.byIntent);
  const totalCostUSD = await sumSpendingUsdLastDays(windowDays);
  const tc = merged.totalConversations || 0;
  const costPerConversation = tc > 0 ? Math.round((totalCostUSD / tc) * 100_000) / 100_000 : 0;

  return {
    period: "últimos 30 días",
    totalConversations: tc,
    uniqueUsers: merged.uniqueUsers,
    mostUsedOnda: topOnda ? ONDA_LABELS[topOnda] ?? topOnda : "—",
    mostConsultedIntent: topIntent ? INTENT_LABELS_ES[topIntent] ?? topIntent : "—",
    avgSatisfaction: avgSat,
    totalCostUSD,
    costPerConversation,
  };
}

export function formatExecutiveSummaryForDonors(exec: Awaited<ReturnType<typeof getExecutiveSummary>>): {
  period: string;
  totalConversations: number;
  uniqueUsers: number;
  mostUsedOnda: string;
  mostConsultedIntent: string;
  avgSatisfaction: string;
  totalCostUSD: number;
  costPerConversation: string;
} {
  const pct = Math.round(exec.avgSatisfaction * 100);
  const cpc =
    exec.totalConversations > 0 ? `$${exec.costPerConversation.toFixed(3)}` : "$0.000";
  return {
    period: exec.period,
    totalConversations: exec.totalConversations,
    uniqueUsers: exec.uniqueUsers,
    mostUsedOnda: exec.mostUsedOnda,
    mostConsultedIntent: exec.mostConsultedIntent,
    avgSatisfaction: `${pct}%`,
    totalCostUSD: exec.totalCostUSD,
    costPerConversation: cpc,
  };
}
