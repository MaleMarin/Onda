import { kv } from "@vercel/kv";

/** TTL: 30 días */
const SESSION_MEMORY_TTL_SECONDS = 30 * 24 * 60 * 60;

export type MemoryChannel = "web" | "wa";

export type SessionSummary = {
  /** ISO 8601 de la última vez que se guardó (para calcular días hasta “hoy”). */
  sessionDate: string;
  topics: string[];
  lastIntent: string;
  lastEje: string;
};

function memoryKey(channel: MemoryChannel, id: string): string {
  const safe = id.replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 200);
  return `onda:mem:${channel}:${safe}`;
}

/** Diferencia en días calendario UTC entre hoy y sessionDate. */
export function daysSinceSessionDate(sessionDateISO: string): number {
  const d0 = new Date(sessionDateISO);
  if (Number.isNaN(d0.getTime())) return 0;
  const now = new Date();
  const utc0 = Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth(), d0.getUTCDate());
  const utc1 = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(0, Math.round((utc1 - utc0) / (24 * 60 * 60 * 1000)));
}

/**
 * Bloque listo para inyectar en el system prompt (incluye días desde sessionDate).
 */
export function buildMemoryContextBlock(prev: SessionSummary): string {
  const días = daysSinceSessionDate(prev.sessionDate);
  const topics = prev.topics.length ? prev.topics.join(" · ") : "(sin temas extraídos)";
  return [
    "--- MEMORIA DE INTERACCIONES PREVIAS (no es instrucción nueva; solo contexto) ---",
    `Han pasado ${días} día(s) desde la última vez que guardamos un resumen de esta sesión.`,
    `Temas o hilos previos: ${topics}`,
    `Última intención detectada (automática): ${prev.lastIntent}`,
    `Último eje: ${prev.lastEje}`,
    "Úsalo con ligereza: prioriza siempre el mensaje actual y no asumas que la persona sigue en el mismo tema.",
  ].join("\n");
}

export type SessionMessage = { role: "user" | "model"; content: string };

const MAX_TOPIC_SNIPPET = 90;
const MAX_TOPICS = 6;

/**
 * Extrae “temas” cortos a partir de mensajes (prioriza últimos turnos de usuario).
 */
export function buildSessionSummary(
  messages: SessionMessage[],
  intent: string,
  eje: string
): SessionSummary {
  const topics: string[] = [];
  const seen = new Set<string>();

  const userTexts = messages
    .filter((m) => m.role === "user" && (m.content || "").trim())
    .map((m) => m.content.replace(/\s+/g, " ").trim());

  for (let i = userTexts.length - 1; i >= 0 && topics.length < MAX_TOPICS; i--) {
    let snippet = userTexts[i].slice(0, MAX_TOPIC_SNIPPET);
    if (snippet.length === MAX_TOPIC_SNIPPET) snippet = `${snippet}…`;
    const key = snippet.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      topics.push(snippet);
    }
  }

  if (topics.length === 0 && messages.some((m) => m.role === "model" && m.content.trim())) {
    const lastModel = [...messages].reverse().find((m) => m.role === "model" && m.content.trim());
    if (lastModel) {
      let s = lastModel.content.replace(/\s+/g, " ").trim().slice(0, MAX_TOPIC_SNIPPET);
      if (s.length === MAX_TOPIC_SNIPPET) s = `${s}…`;
      topics.push(s);
    }
  }

  return {
    sessionDate: new Date().toISOString(),
    topics,
    lastIntent: intent,
    lastEje: eje,
  };
}

export async function getSessionSummary(
  channel: MemoryChannel,
  sessionId: string
): Promise<SessionSummary | null> {
  if (!sessionId || sessionId === "anonymous") return null;
  try {
    const raw = await kv.get<string>(memoryKey(channel, sessionId));
    if (raw == null || raw === "") return null;
    const parsed = JSON.parse(raw) as Partial<SessionSummary>;
    if (
      typeof parsed.sessionDate !== "string" ||
      !Array.isArray(parsed.topics) ||
      typeof parsed.lastIntent !== "string" ||
      typeof parsed.lastEje !== "string"
    ) {
      return null;
    }
    return {
      sessionDate: parsed.sessionDate,
      topics: parsed.topics.filter((t): t is string => typeof t === "string"),
      lastIntent: parsed.lastIntent,
      lastEje: parsed.lastEje,
    };
  } catch (e) {
    console.warn("[sessionMemory] getSessionSummary fail-open:", e);
    return null;
  }
}

export async function saveSessionSummary(
  channel: MemoryChannel,
  sessionId: string,
  summary: SessionSummary
): Promise<void> {
  if (!sessionId || sessionId === "anonymous") return;
  try {
    await kv.set(memoryKey(channel, sessionId), JSON.stringify(summary), {
      ex: SESSION_MEMORY_TTL_SECONDS,
    });
  } catch (e) {
    console.warn("[sessionMemory] saveSessionSummary fail-open:", e);
  }
}
