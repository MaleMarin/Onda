/**
 * Deduplicación de eventos entrantes de WhatsApp por `messages[].id`.
 *
 * Meta puede reentregar el mismo evento si el webhook no responde 200 OK rápido,
 * si hay timeout, si la firma falla temporalmente, etc. Sin dedupe, el usuario
 * recibiría la misma respuesta varias veces (y se duplicaría telemetría / costo).
 *
 * Estrategia: SET NX EX en Vercel KV.
 *  - Key: `wa:msgid:{id}`
 *  - TTL: 24 horas (mucho mayor que el reintento de Meta, suficiente para cubrir
 *    cualquier ventana razonable sin saturar KV).
 *  - Si la marca ya existe → el evento es duplicado y se debe ignorar.
 *
 * Sin KV configurado (dev local / desarrollo sin Storage): se usa un Map en memoria
 * con TTL. Esto NO sirve para producción multi-instancia (cold starts borran
 * memoria, instancias paralelas no la comparten). Para producción es OBLIGATORIO
 * tener Vercel KV (u otro store distribuido) configurado.
 */

import { kv } from "@vercel/kv";

/** Mensajes de Meta se reentregan dentro de minutos; 24 h es un margen amplio y seguro. */
export const WA_DEDUPE_TTL_SECONDS = 24 * 60 * 60;

function kvConfigured(): boolean {
  return !!(process.env.KV_REST_API_URL?.trim() && process.env.KV_REST_API_TOKEN?.trim());
}

function safeId(id: string): string {
  return String(id).replace(/[^a-zA-Z0-9_.:=-]/g, "").slice(0, 200);
}

function dedupeKey(id: string): string {
  return `wa:msgid:${safeId(id)}`;
}

/** Fallback en memoria (solo desarrollo / falta de KV). */
const memStore = new Map<string, number>();

function memCheck(id: string): boolean {
  const key = dedupeKey(id);
  const now = Date.now();
  const exp = memStore.get(key);
  if (exp && exp > now) return false; // ya marcado, expira luego
  memStore.set(key, now + WA_DEDUPE_TTL_SECONDS * 1000);
  // Garbage collection oportunista
  if (memStore.size > 5000) {
    for (const [k, e] of memStore) {
      if (e <= now) memStore.delete(k);
    }
  }
  return true;
}

/**
 * Marca un `message.id` como "visto". Devuelve `true` la primera vez (procesar)
 * y `false` si ya estaba marcado (ignorar, es un reenvío).
 *
 * Falla cerrada en caso de error KV: se asume duplicado para no responder dos
 * veces al usuario. (Es preferible ignorar un mensaje raro a duplicar respuestas).
 */
export async function markMessageIfNew(messageId: string | null | undefined): Promise<boolean> {
  const id = (messageId ?? "").trim();
  if (!id) return true; // sin id no podemos dedupear; dejamos pasar (caso raro)

  if (!kvConfigured()) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[waDedupe] KV no configurado en producción; fallback a memoria local no es seguro entre instancias."
      );
    }
    return memCheck(id);
  }

  try {
    const res = await kv.set(dedupeKey(id), "1", { nx: true, ex: WA_DEDUPE_TTL_SECONDS });
    // @vercel/kv: SET NX → "OK" si se creó, null si ya existía.
    return res !== null;
  } catch (e) {
    console.warn("[waDedupe] KV error (fallback memoria):", e instanceof Error ? e.message : e);
    return memCheck(id);
  }
}

/**
 * Limpia el estado en memoria (solo útil para tests).
 */
export function _resetWaDedupeMemForTests(): void {
  memStore.clear();
}
