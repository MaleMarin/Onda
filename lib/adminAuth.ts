import { createHmac, timingSafeEqual } from "crypto";

export const ONDA_ADMIN_COOKIE = "onda_admin_session";

/**
 * Valida Authorization: Bearer ADMIN_SECRET o cookie firmada HttpOnly (login /api/admin/login).
 */
export function verifyAdminAuth(req: Request): boolean {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) return false;

  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    const t = auth.slice(7).trim();
    if (t && t === secret) return true;
  }

  const cookieHeader = req.headers.get("cookie") || "";
  const match = new RegExp(`(?:^|;\\s*)${ONDA_ADMIN_COOKIE}=([^;]*)`).exec(cookieHeader);
  const raw = match?.[1] ? decodeURIComponent(match[1].trim()) : "";
  if (!raw) return false;

  const dot = raw.indexOf(".");
  if (dot < 1) return false;
  const expStr = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;

  const expected = createHmac("sha256", secret).update(String(exp)).digest("hex");
  if (sig.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function buildAdminSessionCookie(expMs: number, secret: string): string {
  const sig = createHmac("sha256", secret).update(String(expMs)).digest("hex");
  const val = encodeURIComponent(`${expMs}.${sig}`);
  const maxAgeSec = Math.max(0, Math.floor((expMs - Date.now()) / 1000));
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${ONDA_ADMIN_COOKIE}=${val}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure}`;
}
