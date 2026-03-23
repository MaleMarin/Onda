import crypto from "crypto";
import { kv } from "@vercel/kv";

const CACHE_TTL: Record<string, number> = {
  explanation: 24 * 3600,
  action: 12 * 3600,
  fact_check: 2 * 3600,
  disinformation: 1 * 3600,
  emotional: 0,
};

const CACHE_FAIL_OPEN = true;

export interface CacheResult {
  hit: boolean;
  response?: string;
  cachedAt?: string;
}

type CachedPayload = { response: string; cachedAt: string };

function kvConfigured(): boolean {
  return Boolean(process.env.KV_REST_API_URL?.trim() && process.env.KV_REST_API_TOKEN?.trim());
}

/**
 * Clave normalizada: eje + intent + hash del mensaje (primeros 120 chars normalizados).
 */
export function buildCacheKey(message: string, eje: string, intent: string): string {
  const normalized = (message ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  const hash = crypto.createHash("md5").update(normalized).digest("hex").slice(0, 12);
  return `cache:response:${eje}:${intent}:${hash}`;
}

/**
 * Verifica si la respuesta es apta para cachear.
 */
export function isCacheable(response: string, intent: string): boolean {
  if (intent === "emotional") return false;
  const ttl = CACHE_TTL[intent];
  if (ttl == null || ttl === 0) return false;
  const r = (response ?? "").trim();
  if (r.length < 50) return false;

  const lower = r.toLowerCase();
  const temporal =
    /\bhoy\b/.test(lower) ||
    /\besta semana\b/.test(lower) ||
    /\brecientemente\b/.test(lower) ||
    /\ben este momento\b/.test(lower) ||
    /\bahora mismo\b/.test(lower) ||
    /\búltimas horas\b/.test(lower) ||
    /\ben las últimas\b/.test(lower) ||
    /\ben las ultimas\b/.test(lower) ||
    /\besta mañana\b/.test(lower) ||
    /\besta manana\b/.test(lower) ||
    /\besta tarde\b/.test(lower);

  return !temporal;
}

/**
 * Busca respuesta en caché (miss si emotional, sin KV o error).
 */
export async function getCachedResponse(
  message: string,
  eje: string,
  intent: string
): Promise<CacheResult> {
  if (intent === "emotional") return { hit: false };
  if (!kvConfigured()) return { hit: false };

  try {
    const key = buildCacheKey(message, eje, intent);
    const raw = await kv.get<string>(key);
    if (raw == null || raw === "") return { hit: false };

    let parsed: CachedPayload;
    try {
      parsed = JSON.parse(raw) as CachedPayload;
    } catch {
      return { hit: false };
    }
    if (typeof parsed.response !== "string" || !parsed.response.trim()) return { hit: false };

    return {
      hit: true,
      response: parsed.response,
      cachedAt: typeof parsed.cachedAt === "string" ? parsed.cachedAt : undefined,
    };
  } catch (e) {
    if (CACHE_FAIL_OPEN) console.warn("[responseCache] getCachedResponse fail-open:", e);
    return { hit: false };
  }
}

/**
 * Guarda respuesta en caché si aplica TTL e isCacheable.
 */
export async function setCachedResponse(
  message: string,
  eje: string,
  intent: string,
  response: string
): Promise<void> {
  if (!isCacheable(response, intent)) return;
  const ttl = CACHE_TTL[intent];
  if (ttl == null || ttl <= 0) return;
  if (!kvConfigured()) return;

  try {
    const key = buildCacheKey(message, eje, intent);
    const payload: CachedPayload = {
      response,
      cachedAt: new Date().toISOString(),
    };
    await kv.set(key, JSON.stringify(payload), { ex: ttl });
  } catch (e) {
    if (CACHE_FAIL_OPEN) console.warn("[responseCache] setCachedResponse fail-open:", e);
  }
}
