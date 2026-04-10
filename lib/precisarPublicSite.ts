/**
 * Sitio institucional de Fundación Precisar (enlaces en la UI web del chat).
 *
 * Vercel → Environment Variables → `NEXT_PUBLIC_PRECISAR_SITE_URL` = URL del sitio vigente
 * (por defecto https://www.precisar.net).
 */
function resolvePrecisarPublicSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_PRECISAR_SITE_URL?.trim();
  return raw && raw.length > 0 ? raw : "https://www.precisar.net";
}

/** Resuelta en build del bundle cliente (NEXT_PUBLIC_*). */
export const PRECISAR_PUBLIC_SITE_URL = resolvePrecisarPublicSiteUrl();
