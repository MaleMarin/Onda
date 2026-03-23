/**
 * Almacenamiento de auditoría: uso, feedback, errores y (opcional) logs de conversación.
 * Si están definidas KV_REST_API_URL y KV_REST_API_TOKEN (Vercel KV), persiste en listas Redis.
 * Si no, solo registra en consola (y getMetrics devuelve vacío).
 *
 * Retención: cada registro incluye `expiresAt` (epoch ms). Redis LIST no expira ítems por ítem;
 * la purga de vencidos se hace con `purgeExpiredRecords()` o el endpoint admin. En lectura,
 * `getMetrics` ignora entradas ya vencidas.
 */

const KV_LIST_MAX = 50_000;
const USAGE_KEY = "onda:usage";
const FEEDBACK_KEY = "onda:feedback";
const ERRORS_KEY = "onda:errors";
const CONVERSATIONS_KEY = "onda:conversations";
const METRICS_DAYS = 30;

/** TTL en milisegundos por tipo de registro */
const TTL_MS = {
  /** Conversación / extractos (si se usa recordConversation) */
  conversation: 90 * 24 * 60 * 60 * 1000,
  /** Feedback 👍👎 */
  feedback: 180 * 24 * 60 * 60 * 1000,
  /** Errores técnicos */
  error: 30 * 24 * 60 * 60 * 1000,
  /** Métricas de uso (eje, sesión, mensajes) */
  usage: 180 * 24 * 60 * 60 * 1000,
} as const;

export type UsageEvent = "eje_select" | "message_sent" | "session_start";
export type UsagePayload = {
  event: UsageEvent;
  eje?: string;
  sessionId?: string;
  responseTimeMs?: number;
  ts: string;
  /** Epoch ms; obligatorio en escrituras nuevas; ausente en datos legacy en KV */
  expiresAt?: number;
};

export type FeedbackPayload = {
  messageId: string;
  vote: "up" | "down";
  conversationId?: string;
  ts: string;
  expiresAt?: number;
};

export type ErrorPayload = {
  source: "chat" | "whatsapp";
  userMessage?: string;
  botResponse?: string;
  error?: string;
  ts: string;
  expiresAt?: number;
};

/** Log opcional de conversación (integración futura o cliente que lo invoque). */
export type ConversationLogPayload = {
  sessionId?: string;
  excerpt?: string;
  ts: string;
  expiresAt?: number;
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
  del?: (key: string) => Promise<unknown>;
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

function nowMs(): number {
  return Date.now();
}

/** Entrada con expiresAt vencido no debe contarse ni mostrarse. Sin expiresAt: compatibilidad con datos antiguos. */
function isRecordActive(parsed: { expiresAt?: number }): boolean {
  if (typeof parsed.expiresAt !== "number") return true;
  return parsed.expiresAt >= nowMs();
}

const RPUSH_CHUNK = 400;

async function rewriteList(kv: KvClient, key: string, kept: string[]): Promise<void> {
  if (typeof kv.del !== "function") {
    console.error(
      "[auditStore] rewriteList: el cliente KV no expone `del`; no se puede reescribir la lista. TODO: actualizar @vercel/kv o usar pipeline."
    );
    return;
  }
  await kv.del(key);
  if (kept.length === 0) return;
  for (let i = 0; i < kept.length; i += RPUSH_CHUNK) {
    const slice = kept.slice(i, i + RPUSH_CHUNK);
    await kv.rpush(key, ...slice);
  }
}

export async function recordUsage(payload: Omit<UsagePayload, "ts" | "expiresAt">): Promise<void> {
  const full: UsagePayload = {
    ...payload,
    ts: new Date().toISOString(),
    expiresAt: nowMs() + TTL_MS.usage,
  };
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

export async function recordFeedback(payload: Omit<FeedbackPayload, "ts" | "expiresAt">): Promise<void> {
  const full: FeedbackPayload = {
    ...payload,
    ts: new Date().toISOString(),
    expiresAt: nowMs() + TTL_MS.feedback,
  };
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

export async function recordError(payload: Omit<ErrorPayload, "ts" | "expiresAt">): Promise<void> {
  const full: ErrorPayload = {
    ...payload,
    ts: new Date().toISOString(),
    expiresAt: nowMs() + TTL_MS.error,
  };
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

/**
 * Registra un extracto de conversación (90 días). Pensado para uso futuro o integración explícita;
 * el chat web hoy no persiste mensajes en servidor.
 */
export async function recordConversation(
  payload: Omit<ConversationLogPayload, "ts" | "expiresAt">
): Promise<void> {
  const full: ConversationLogPayload = {
    ...payload,
    ts: new Date().toISOString(),
    expiresAt: nowMs() + TTL_MS.conversation,
  };
  if (process.env.NODE_ENV !== "test") {
    console.info("[conversation]", full);
  }
  const kv = await getKv();
  if (kv) {
    try {
      await kv.rpush(CONVERSATIONS_KEY, JSON.stringify(full));
      await kv.ltrim(CONVERSATIONS_KEY, -KV_LIST_MAX, -1);
    } catch (e) {
      console.error("[auditStore] recordConversation kv error:", e);
    }
  }
}

function listEntryMatchesIdentifier(raw: string, identifier: string): boolean {
  if (!identifier) return false;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (typeof o.sessionId === "string" && o.sessionId === identifier) return true;
    if (typeof o.conversationId === "string" && o.conversationId === identifier) return true;
    if (typeof o.messageId === "string" && o.messageId === identifier) return true;
    if (typeof o.userMessage === "string" && o.userMessage.includes(identifier)) return true;
    if (typeof o.botResponse === "string" && o.botResponse.includes(identifier)) return true;
    if (typeof o.excerpt === "string" && o.excerpt.includes(identifier)) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Borra todos los registros asociados a un identificador
 * (número de teléfono o cookie de sesión web).
 * Derecho al olvido — LFPDPPP Art. 16 / Ley 19.628 Art. 12
 *
 * Criterios: coincide `sessionId`, `conversationId`, `messageId`, o subcadena en
 * `userMessage`, `botResponse`, `excerpt`. En listas Redis no hay consulta indexada:
 * se reescribe cada lista sin las entradas coincidentes.
 */
export async function deleteUserData(identifier: string): Promise<{ deleted: number }> {
  const id = identifier.trim();
  if (!id) return { deleted: 0 };

  const kv = await getKv();
  if (!kv || typeof kv.del !== "function") {
    console.warn(
      "[auditStore] deleteUserData: sin KV o sin `del`; no se borró nada. TODO: configurar KV_REST_API_URL / KV_REST_API_TOKEN."
    );
    return { deleted: 0 };
  }

  let deleted = 0;
  const keys = [USAGE_KEY, FEEDBACK_KEY, ERRORS_KEY, CONVERSATIONS_KEY] as const;

  for (const key of keys) {
    const list = await kv.lrange(key, 0, -1);
    const kept: string[] = [];
    for (const s of list || []) {
      if (listEntryMatchesIdentifier(s, id)) {
        deleted += 1;
      } else {
        kept.push(s);
      }
    }
    if (kept.length !== (list || []).length) {
      await rewriteList(kv, key, kept);
    }
  }

  return { deleted };
}

/**
 * Elimina físicamente entradas con expiresAt < ahora en todas las listas de auditoría.
 */
export async function purgeExpiredRecords(): Promise<{ deleted: number }> {
  const kv = await getKv();
  if (!kv || typeof kv.del !== "function") {
    console.warn("[auditStore] purgeExpiredRecords: sin KV o sin `del`.");
    return { deleted: 0 };
  }

  const t = nowMs();
  let deleted = 0;
  const keys = [USAGE_KEY, FEEDBACK_KEY, ERRORS_KEY, CONVERSATIONS_KEY] as const;

  for (const key of keys) {
    const list = await kv.lrange(key, 0, -1);
    const kept: string[] = [];
    for (const s of list || []) {
      try {
        const o = JSON.parse(s) as { expiresAt?: number };
        if (typeof o.expiresAt === "number" && o.expiresAt < t) {
          deleted += 1;
        } else {
          kept.push(s);
        }
      } catch {
        kept.push(s);
      }
    }
    if (kept.length !== (list || []).length) {
      await rewriteList(kv, key, kept);
    }
  }

  return { deleted };
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
      .filter(
        (u): u is UsagePayload =>
          u != null && u.ts >= sinceStr && isRecordActive(u)
      );
    const feedback = (feedbackList || [])
      .map((s) => {
        try {
          return JSON.parse(s) as FeedbackPayload;
        } catch {
          return null;
        }
      })
      .filter(
        (f): f is FeedbackPayload =>
          f != null && f.ts >= sinceStr && isRecordActive(f)
      );
    const errors = (errorsList || [])
      .map((s) => {
        try {
          return JSON.parse(s) as ErrorPayload;
        } catch {
          return null;
        }
      })
      .filter(
        (e): e is ErrorPayload =>
          e != null && e.ts >= sinceStr && isRecordActive(e)
      );

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
