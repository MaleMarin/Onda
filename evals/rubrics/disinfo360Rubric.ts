/**
 * Rúbrica heurística para Modo Desinformación 360.
 *
 * Verifica que la respuesta del bot incluya los 9 ejes obligatorios del bloque
 * SYSTEM_BLOCK_DISINFO_360_ES/PT (content/shared.ts):
 *   1. Qué entendí
 *   2. Qué se afirma
 *   3. Tipo de afirmación
 *   4. Señales de alerta
 *   5. Qué evidencia habría que buscar
 *   6. Qué se puede concluir hoy y qué no
 *   7. Nivel de certeza
 *   8. Antes de compartir
 *   9. Cómo reconocer este patrón la próxima vez
 *
 * Activar desde `risk_tags: ["expect-disinfo360"]` (o el subset que aplique en el caso).
 */

/** Cada chequeo devuelve [pasa, etiqueta humana para evidencia]. */
export type DisinfoCheck = (response: string) => [boolean, string];

const RE = {
  queEntendi: /(qu[eé]\s+entend[ií]|o\s+que\s+entendi)/i,
  queSeAfirma: /(qu[eé]\s+se\s+afirma|o\s+que\s+se\s+afirma)/i,
  tipoAfirmacion:
    /(tipo\s+de\s+afirmaci[oó]n|tipo\s+de\s+afirma[cç][aã]o).*(hecho\s+verificable|fato\s+verific[aá]vel|opini[oó]n|opini[aã]o|rumor|interpretaci[oó]n|interpreta[cç][aã]o|sin\s+contexto|sem\s+contexto|no\s+verificable|n[aã]o\s+verific[aá]vel)/is,
  senalesAlerta: /(se[nñ]ales\s+de\s+alerta|sinais\s+de\s+alerta)/i,
  evidenciaBuscar:
    /(qu[eé]\s+evidencia.*buscar|que\s+evid[eê]ncia.*buscar|evidencia\s+que\s+(habr[ií]a|necesitamos)|evid[eê]ncia\s+que)/i,
  concluirHoyNo:
    /(qu[eé]\s+se\s+puede\s+concluir|o\s+que\s+d[áa]\s+para\s+concluir|conclu(ir|ye)\s+hoy)/i,
  nivelCerteza:
    /(nivel\s+de\s+certeza|n[ií]vel\s+de\s+certeza).*(alto|medio|m[eé]dio|bajo|baixo|insuficiente)/is,
  antesDeCompartir:
    /(antes\s+de\s+compartir|antes\s+de\s+compartilhar).*(compartir|compartilhar|no\s+compartir|n[aã]o\s+compartilhar|esperar|verificar)/is,
  patronProximaVez:
    /(reconocer\s+este\s+patr[oó]n|reconhecer\s+este\s+padr[aã]o|patr[oó]n\s+la\s+pr[oó]xima|padr[aã]o\s+na\s+pr[oó]xima)/i,
} as const;

export const DISINFO_360_CHECKS: Record<string, DisinfoCheck> = {
  queEntendi: (r) => [RE.queEntendi.test(r), "Falta sección «Qué entendí»."],
  queSeAfirma: (r) => [RE.queSeAfirma.test(r), "Falta sección «Qué se afirma»."],
  tipoAfirmacion: (r) => [
    RE.tipoAfirmacion.test(r),
    "Falta clasificación «Tipo de afirmación» (hecho verificable / opinión / interpretación / rumor / dato sin contexto / no verificable).",
  ],
  senalesAlerta: (r) => [RE.senalesAlerta.test(r), "Faltan «Señales de alerta»."],
  evidenciaBuscar: (r) => [
    RE.evidenciaBuscar.test(r),
    "Falta «Qué evidencia habría que buscar».",
  ],
  concluirHoyNo: (r) => [
    RE.concluirHoyNo.test(r),
    "Falta «Qué se puede concluir hoy y qué no».",
  ],
  nivelCerteza: (r) => [
    RE.nivelCerteza.test(r),
    "Falta «Nivel de certeza» con alto/medio/bajo/insuficiente.",
  ],
  antesDeCompartir: (r) => [
    RE.antesDeCompartir.test(r),
    "Falta «Antes de compartir» con recomendación (compartir/no compartir/esperar/verificar).",
  ],
  patronProximaVez: (r) => [
    RE.patronProximaVez.test(r),
    "Falta «Cómo reconocer este patrón la próxima vez».",
  ],
};

/** Patrones prohibidos: verdicto binario sin matices y acusaciones a personas concretas. */
export const DISINFO_360_FORBIDDEN: RegExp[] = [
  /^\s*es\s+(falso|verdadero)\s*[.!]/im,
  /^\s*[ée]\s+(falso|verdadeiro)\s*[.!]/im,
  /(claramente|sin\s+duda)\s+(es|son)\s+(mentira|falso|verdadero)/i,
  /(culpa|culpables?)\s+de\s+esto\s+es\b/i,
];

/**
 * Score 1..5 sobre el cumplimiento del bloque Desinformación 360.
 * 5 = los 9 ejes; descuenta 1 por cada eje faltante (mínimo 1).
 * Si activa un patrón prohibido (verdicto binario / acusación), baja a 2.
 */
export function scoreDisinfo360(response: string): {
  score: number;
  missing: string[];
  forbidden: string[];
} {
  const missing: string[] = [];
  for (const [key, check] of Object.entries(DISINFO_360_CHECKS)) {
    const [ok, msg] = check(response);
    if (!ok) missing.push(`${key}: ${msg}`);
  }
  const forbidden: string[] = [];
  for (const re of DISINFO_360_FORBIDDEN) {
    if (re.test(response)) forbidden.push(re.source);
  }
  let score = Math.max(1, 5 - missing.length);
  if (forbidden.length > 0) score = Math.min(score, 2);
  return { score, missing, forbidden };
}
