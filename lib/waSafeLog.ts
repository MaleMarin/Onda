/**
 * Logs sanitizados para WhatsApp.
 *
 * En producción NUNCA se imprime:
 *  - el número de teléfono completo (sólo hash HMAC + últimos 2 dígitos),
 *  - el texto del usuario completo (sólo longitud, opcionalmente preview corto),
 *  - la transcripción ni la respuesta enviada.
 *
 * Para depuración local: WHATSAPP_LOG_DEBUG=1 reactiva preview de texto
 * (nunca el número completo). En CI / producción siempre queda redactado.
 */

import crypto from "crypto";

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function isLogDebug(): boolean {
  return process.env.WHATSAPP_LOG_DEBUG === "1";
}

/** Pepper para hash estable del número. En producción debería estar definido. */
function getPepper(): string {
  return (
    process.env.WHATSAPP_LOG_PEPPER?.trim() ||
    process.env.WHATSAPP_WEBHOOK_SECRET?.trim() ||
    "onda-default-log-pepper"
  );
}

/**
 * Hash estable e irreversible del número de teléfono.
 * Mismo número → mismo hash (sirve para correlacionar logs sin exponer PII).
 */
export function hashPhone(phone: string | null | undefined): string {
  const raw = String(phone ?? "").replace(/\D/g, "");
  if (!raw) return "wa:unknown";
  const tail = raw.length >= 2 ? raw.slice(-2) : raw;
  const h = crypto.createHmac("sha256", getPepper()).update(raw).digest("hex").slice(0, 12);
  return `wa:${h}:..${tail}`;
}

/**
 * Redacta texto de usuario para logs.
 *  - Producción: sólo longitud (`<len=42>`).
 *  - Dev / WHATSAPP_LOG_DEBUG=1: preview corto sin saltos de línea.
 *  - Texto null/undefined/vacío: `<empty>`.
 */
export function redactText(text: string | null | undefined, maxPreview = 24): string {
  if (text == null) return "<empty>";
  const s = String(text);
  if (!s.trim()) return "<empty>";
  if (isProduction() && !isLogDebug()) return `<len=${s.length}>`;
  const flat = s.replace(/\s+/g, " ").trim();
  const preview = flat.slice(0, maxPreview);
  const ellipsis = flat.length > maxPreview ? "…" : "";
  return `"${preview}${ellipsis}" <len=${s.length}>`;
}

export type WaSafeLogContext = {
  requestId?: string;
  phone?: string | null;
  text?: string | null;
  type?: string | null;
  extra?: Record<string, unknown>;
};

/**
 * Construye objeto plano sanitizado para `console.log({...})`.
 * No incluye el número en claro ni el texto en producción.
 */
export function buildSafeWaLog(ctx: WaSafeLogContext): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (ctx.requestId) out.requestId = ctx.requestId;
  if (ctx.phone !== undefined) out.phoneHash = hashPhone(ctx.phone);
  if (ctx.text !== undefined) out.text = redactText(ctx.text);
  if (ctx.type) out.type = ctx.type;
  if (ctx.extra) Object.assign(out, ctx.extra);
  return out;
}

/** Log sanitizado por defecto (info). */
export function logWaInfo(message: string, ctx: WaSafeLogContext = {}): void {
  console.log(`[wa] ${message}`, buildSafeWaLog(ctx));
}

/** Log de error sanitizado. */
export function logWaError(message: string, ctx: WaSafeLogContext = {}): void {
  console.error(`[wa] ${message}`, buildSafeWaLog(ctx));
}

/** Log de warning sanitizado. */
export function logWaWarn(message: string, ctx: WaSafeLogContext = {}): void {
  console.warn(`[wa] ${message}`, buildSafeWaLog(ctx));
}

/**
 * Diagnóstico GET: ¿podemos exponer detalles sin header secreto?
 * Producción: requiere `x-onda-diag-token` igual a `WHATSAPP_DIAG_TOKEN` (o `WHATSAPP_WEBHOOK_SECRET` como fallback).
 * Dev: siempre se muestra para no entorpecer el flujo local.
 */
export function diagnosticAllowed(req: Request): boolean {
  if (!isProduction()) return true;
  const expected = (
    process.env.WHATSAPP_DIAG_TOKEN?.trim() ||
    process.env.WHATSAPP_WEBHOOK_SECRET?.trim() ||
    ""
  );
  if (!expected) return false;
  const header = req.headers.get("x-onda-diag-token") ?? "";
  if (!header || header.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(header, "utf8"),
      Buffer.from(expected, "utf8")
    );
  } catch {
    return false;
  }
}
