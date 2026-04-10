/**
 * Frases que el producto considera inaceptables en contexto enlace/paywall
 * (alineado a NOTICIA_SYSTEM_BLOCK y reglas Onda).
 */
export const BAD_LINK_DISCLAIMER_PATTERNS: RegExp[] = [
  /\bno\s+tengo\s+acceso\s+a\s+enlaces?\b/i,
  /\bno\s+tengo\s+acceso\s+directo\s+a\s+enlaces?\b/i,
  /\bno\s+puedo\s+abrir\s+(el\s+)?art[ií]culo\b/i,
  /\bno\s+puedo\s+leer\s+enlaces?\b/i,
  /\bmis\s+registros\s+oficiales\b/i,
  /\bno\s+he\s+hallado\s+evidencias\s+en\s+mis\s+registros\b/i,
];

/** Marcadores de español rioplatense cuando se espera português (heurística). */
export const RIOPLATENSE_MARKERS = /\b(vos|enviá|podés|querés|tenés|mandá|mirá)\b/i;
