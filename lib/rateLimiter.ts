import { kv } from "@vercel/kv";

/**
 * Vercel KV: al enlazar una base KV al proyecto, el dashboard inyecta (según el producto):
 * - KV_URL
 * - KV_REST_API_URL
 * - KV_REST_API_TOKEN
 * - KV_REST_API_READ_ONLY_TOKEN
 *
 * Configuración: Vercel Dashboard → Storage → Create Database → KV → Connect to project.
 * No hardcodear valores; @vercel/kv usa las variables de entorno del runtime.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

function isKvConfigured(): boolean {
  const url = process.env.KV_REST_API_URL?.trim();
  const token = process.env.KV_REST_API_TOKEN?.trim();
  return Boolean(url && token);
}

function sanitizeKeyPart(s: string): string {
  return s.replace(/[^a-zA-Z0-9@._-]/g, "_").slice(0, 256) || "unknown";
}

/**
 * Sliding window rate limiter usando Vercel KV.
 * @param identifier  - clave única (número de teléfono o IP)
 * @param prefix      - prefijo para separar namespaces ('wa' o 'web')
 * @param maxRequests - máximo de requests permitidos en la ventana
 * @param windowSecs  - tamaño de la ventana en segundos
 */
export async function checkRateLimit(
  identifier: string,
  prefix: "wa" | "web",
  maxRequests: number,
  windowSecs: number
): Promise<RateLimitResult> {
  const key = `ratelimit:${prefix}:${sanitizeKeyPart(identifier)}`;

  if (!isKvConfigured()) {
    console.warn(
      "[rateLimiter] KV no configurado (faltan KV_REST_API_URL / KV_REST_API_TOKEN u otras vars del Storage KV). Rate limit deshabilitado (fail-open)."
    );
    return { allowed: true, remaining: maxRequests, resetInSeconds: windowSecs };
  }

  try {
    const count = await kv.incr(key);
    if (count === 1) {
      await kv.expire(key, windowSecs);
    }

    let ttl = await kv.ttl(key);
    if (ttl < 0) {
      await kv.expire(key, windowSecs);
      ttl = windowSecs;
    }

    const resetInSeconds = Math.max(0, ttl);
    const allowed = count <= maxRequests;
    const remaining = allowed ? Math.max(0, maxRequests - count) : 0;

    return { allowed, remaining, resetInSeconds };
  } catch (e) {
    console.warn("[rateLimiter] Error al usar KV (fail-open):", e);
    return { allowed: true, remaining: maxRequests, resetInSeconds: windowSecs };
  }
}
