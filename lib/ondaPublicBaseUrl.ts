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

/**
 * Base URL para `metadataBase` (Open Graph, etc.): en previews de Vercel usa el propio deploy
 * para que recursos resueltos contra `metadataBase` no apunten a otro host.
 */
export function resolveOndaMetadataBaseUrl(): string {
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${host}`;
  }
  return ONDA_PUBLIC_BASE_URL;
}
