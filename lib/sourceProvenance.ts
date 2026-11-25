/**
 * Procedencia de resultados de búsqueda. Una referencia recuperada no equivale
 * a una cita verificada ni a la lectura íntegra del documento.
 */
export type RetrievedSource = { title: string; url: string; kind: "web_result" };

function safePublicUrl(input: string): string | null {
  try {
    const u = new URL(input.trim());
    const host = u.hostname.toLowerCase();
    if (!["https:", "http:"].includes(u.protocol)) return null;
    if (!host || host === "localhost" || host === "::1" || host.endsWith(".local")) return null;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return null; // no enlazar direcciones IP
    if (u.username || u.password) return null;
    return u.href;
  } catch {
    return null;
  }
}

/** Convierte únicamente resultados recuperados en referencias visualizables. */
export function extractRetrievedSources(context: string, limit = 6): RetrievedSource[] {
  const result: RetrievedSource[] = [];
  const seen = new Set<string>();
  for (const paragraph of (context || "").split(/\n\s*\n/)) {
    const m = paragraph.match(/\[Fuente:\s*(https?:\/\/[^\]\s]+)\s*\]/i);
    if (!m) continue;
    const safe = safePublicUrl(m[1]);
    if (!safe || seen.has(safe)) continue;
    seen.add(safe);
    const titleCandidate = paragraph.trim().match(/^\[([^\]\n]{1,180})\]/);
    const label = titleCandidate ? titleCandidate[1].trim() : new URL(safe).hostname;
    result.push({ title: label, url: safe, kind: "web_result" });
    if (result.length >= limit) break;
  }
  return result;
}
