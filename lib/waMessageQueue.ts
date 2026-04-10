import { kv } from "@vercel/kv";

/** TTL del lock por número (evita deadlocks; tras expirar, el siguiente mensaje puede re-adquirir). */
export const WA_LOCK_TTL_SECONDS = 25;

const isDev = process.env.NODE_ENV === "development";

function normalizePhoneForLock(phone: string): string {
  return String(phone ?? "").replace(/\D/g, "");
}

function logPhone(phone: string): string {
  const id = normalizePhoneForLock(phone);
  if (id.length <= 4) return id ? `***${id}` : "(empty)";
  return `***${id.slice(-4)}`;
}

function lockKey(phone: string): string {
  return `wa:lock:${normalizePhoneForLock(phone)}`;
}

/**
 * Intenta adquirir el lock para un número.
 * Usa SET NX (solo si no existe) para atomicidad.
 * Key: wa:lock:{phone}  TTL: WA_LOCK_TTL_SECONDS
 * Retorna true si adquirió el lock, false si ya había uno.
 * Sin dígitos válidos (p. ej. remitente desconocido): no bloquea, retorna true.
 */
export async function acquireLock(phone: string): Promise<boolean> {
  const id = normalizePhoneForLock(phone);
  if (!id) return true;

  try {
    const r = await kv.set(lockKey(phone), "1", { nx: true, ex: WA_LOCK_TTL_SECONDS });
    return r !== null;
  } catch (e) {
    console.warn("[waMessageQueue] KV lock unavailable, fail-open:", e);
    return true;
  }
}

/**
 * Libera el lock del número.
 */
export async function releaseLock(phone: string): Promise<void> {
  const id = normalizePhoneForLock(phone);
  if (!id) return;

  try {
    await kv.del(lockKey(phone));
  } catch (e) {
    console.warn("[waMessageQueue] KV release failed:", e);
  }
}

/**
 * Ejecuta una función con lock automático.
 * Si no puede adquirir el lock → retorna null sin ejecutar.
 * Siempre libera el lock al terminar (try/finally).
 * Sin dígitos en el número: ejecuta sin lock.
 */
export async function withLock<T>(phone: string, fn: () => Promise<T>): Promise<T | null> {
  const id = normalizePhoneForLock(phone);
  if (!id) {
    return await fn();
  }

  const acquired = await acquireLock(phone);
  if (!acquired) {
    if (isDev) console.info(`[wa-lock] timeout phone=${logPhone(phone)}`);
    return null;
  }

  if (isDev) console.info(`[wa-lock] acquired phone=${logPhone(phone)} ttl=${WA_LOCK_TTL_SECONDS}`);

  try {
    return await fn();
  } finally {
    await releaseLock(phone);
    if (isDev) console.info(`[wa-lock] released phone=${logPhone(phone)}`);
  }
}
