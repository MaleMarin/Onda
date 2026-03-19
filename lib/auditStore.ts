/**
 * Almacenamiento de auditoría: uso, feedback y errores.
 * Si están definidas KV_REST_API_URL y KV_REST_API_TOKEN (Vercel KV), persiste ahí.
 * Si no, solo registra en consola (y getMetrics devuelve vacío).
 */

const KV_LIST_MAX = 50_000;
const USAGE_KEY = "onda:usage";
const FEEDBACK_KEY = "onda:feedback";
const ERRORS_KEY = "onda:errors";
const METRICS_DAYS = 30;

export type UsageEvent = "eje_select" | "message_sent" | "session_start";
export type UsagePayload = {
  event: UsageEvent;
  eje?: string;
  sessionId?: string;
  responseTimeMs?: number;
  ts: string;
};

export type FeedbackPayload = {
  messageId: string;
  vote: "up" | "down";
  conversationId?: string;
  ts: string;
};

export type ErrorPayload = {
  source: "chat" | "whatsapp";
  userMessage?: string;
  botResponse?: string;
  error?: string;
  ts: string;
};

export type MetricsResult = {
  avgMessagesPerSession: number | null;
  avgResponseTimeMs: number | null;
  totalSessions: number;
  totalMessageSent: number;
  /** Cuántas veces se eligió cada Onda (eje_select). Vital para reportes de preferencia de sección. */
  ejeSelectCounts: Record<string, number>;
  totalFeedbackUp: number;
  totalFeedbackDown: number;
  totalErrors: number;
  periodDays: number;
};

function hasKvEnv(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

type KvClient = {
  rpush: (key: string, ...values: string[]) => Promise<number>;
  lrange: (key: string, start: number, stop: number) => Promise<string[]>;
  ltrim: (key: string, start: number, stop: number) => Promise<unknown>;
};

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

export async function recordUsage(payload: Omit<UsagePayload, "ts">): Promise<void> {
  const full: UsagePayload = { ...payload, ts: new Date().toISOString() };
  if (process.env.NODE_ENV !== "test") {
    console.info("[usage]", full);
  }
  const kv = await getKv();
  if (kv) {
    try {
      await kv.rpush(USAGE_KEY, JSON.stringify(full));
      await kv.ltrim(USAGE_KEY, -KV_LIST_MAX, -1);
    } catch (e) {
      console.error("[auditStore] recordUsage kv error:", e);
    }
  }
}

export async function recordFeedback(payload: Omit<FeedbackPayload, "ts">): Promise<void> {
  const full: FeedbackPayload = { ...payload, ts: new Date().toISOString() };
  if (process.env.NODE_ENV !== "test") {
    console.info("[feedback]", full);
  }
  const kv = await getKv();
  if (kv) {
    try {
      await kv.rpush(FEEDBACK_KEY, JSON.stringify(full));
      await kv.ltrim(FEEDBACK_KEY, -KV_LIST_MAX, -1);
    } catch (e) {
      console.error("[auditStore] recordFeedback kv error:", e);
    }
  }
}

export async function recordError(payload: Omit<ErrorPayload, "ts">): Promise<void> {
  const full: ErrorPayload = { ...payload, ts: new Date().toISOString() };
  console.error("[audit error]", full);
  const kv = await getKv();
  if (kv) {
    try {
      await kv.rpush(ERRORS_KEY, JSON.stringify(full));
      await kv.ltrim(ERRORS_KEY, -KV_LIST_MAX, -1);
    } catch (e) {
      console.error("[auditStore] recordError kv error:", e);
    }
  }
}

export async function getMetrics(): Promise<MetricsResult | null> {
  const kv = await getKv();
  if (!kv) return null;
  const since = new Date();
  since.setDate(since.getDate() - METRICS_DAYS);
  const sinceStr = since.toISOString();
  try {
    const [usageList, feedbackList, errorsList] = await Promise.all([
      kv.lrange(USAGE_KEY, 0, -1),
      kv.lrange(FEEDBACK_KEY, 0, -1),
      kv.lrange(ERRORS_KEY, 0, -1),
    ]);
    const usage = (usageList || [])
      .map((s) => {
        try {
          return JSON.parse(s) as UsagePayload;
        } catch {
          return null;
        }
      })
      .filter((u): u is UsagePayload => u != null && u.ts >= sinceStr);
    const feedback = (feedbackList || [])
      .map((s) => {
        try {
          return JSON.parse(s) as FeedbackPayload;
        } catch {
          return null;
        }
      })
      .filter((f): f is FeedbackPayload => f != null && f.ts >= sinceStr);
    const errors = (errorsList || [])
      .map((s) => {
        try {
          return JSON.parse(s) as ErrorPayload;
        } catch {
          return null;
        }
      })
      .filter((e): e is ErrorPayload => e != null && e.ts >= sinceStr);

    const sessions = new Map<string, number>();
    let responseTimeSum = 0;
    let responseTimeCount = 0;
    for (const u of usage) {
      if (u.event === "message_sent" && u.sessionId) {
        sessions.set(u.sessionId, (sessions.get(u.sessionId) ?? 0) + 1);
        if (typeof u.responseTimeMs === "number" && u.responseTimeMs > 0) {
          responseTimeSum += u.responseTimeMs;
          responseTimeCount += 1;
        }
      }
    }
    const totalSessions = sessions.size;
    const totalMessageSent = usage.filter((u) => u.event === "message_sent").length;
    const ejeSelectCounts: Record<string, number> = {};
    for (const u of usage) {
      if (u.event === "eje_select" && typeof u.eje === "string" && u.eje) {
        ejeSelectCounts[u.eje] = (ejeSelectCounts[u.eje] ?? 0) + 1;
      }
    }
    const sessionCounts = [...sessions.values()];
    const avgMessagesPerSession =
      sessionCounts.length > 0 ? sessionCounts.reduce((a, b) => a + b, 0) / sessionCounts.length : null;
    const avgResponseTimeMs =
      responseTimeCount > 0 ? Math.round(responseTimeSum / responseTimeCount) : null;
    const totalFeedbackUp = feedback.filter((f) => f.vote === "up").length;
    const totalFeedbackDown = feedback.filter((f) => f.vote === "down").length;

    return {
      avgMessagesPerSession: avgMessagesPerSession != null ? Math.round(avgMessagesPerSession * 100) / 100 : null,
      avgResponseTimeMs,
      totalSessions,
      totalMessageSent,
      ejeSelectCounts,
      totalFeedbackUp,
      totalFeedbackDown,
      totalErrors: errors.length,
      periodDays: METRICS_DAYS,
    };
  } catch (e) {
    console.error("[auditStore] getMetrics error:", e);
    return null;
  }
}
