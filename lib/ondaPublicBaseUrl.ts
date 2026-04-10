/**
 * URL pública canónica del despliegue (chat web y API en el mismo host).
 *
 * Vercel → `NEXT_PUBLIC_ONDA_PUBLIC_URL` si usás otro dominio o preview;
 * por defecto producción Precisar.
 */
function resolveOndaPublicBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_ONDA_PUBLIC_URL?.trim();
  const base = raw && raw.length > 0 ? raw : "https://onda.precisar.net";
  return base.replace(/\/$/, "");
}

export const ONDA_PUBLIC_BASE_URL = resolveOndaPublicBaseUrl();
