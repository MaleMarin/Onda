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
 * Chequeos pedagógicos avanzados de alfabetización mediática (refuerzo del bloque 360).
 * Se evalúan como "soft checks": no bajan el score salvo que estén marcados como exigidos
 * para el caso (tag `expect-disinfo360-advanced` o subset en `must_include`). Sirven para
 * verificar que la respuesta enseña:
 *   - evidencia observable vs interpretación,
 *   - emoción activada (miedo / rabia / urgencia / indignación / tribalismo),
 *   - intención probable del contenido (informar vs provocar reacción),
 *   - descontextualización (contenido real fuera de fecha o lugar),
 *   - origen del material (autor / publicación original / fuente original),
 *   - versión completa del video (segundos antes/después / audio original),
 *   - framing o encuadre (selección de palabras / lectura inducida),
 *   - evidencia independiente (al menos otra fuente confiable),
 *   - pausa antes de compartir (detenerse 30 segundos / no compartir si falta fuente),
 *   - advertencia sobre mezcla de verdad + manipulación.
 */
const RE_ADVANCED = {
  evidenciaObservableVsInterpretacion:
    /(evidencia\s+observable|lo\s+que\s+se\s+ve|o\s+que\s+se\s+v[eê]|interpretaci[oó]n|interpreta[cç][aã]o|observable\s+vs|observ[aá]vel\s+vs|inducir|induzir|inducid|induzid)/i,
  emocionActivada:
    /(emoci[oó]n|emoção|emo[cç][aã]o|miedo|medo|rabia|raiva|urgencia|urg[eê]ncia|indignaci[oó]n|indignação|indigna[cç][aã]o|tribalismo|alarmist|emocional|sensacional|p[aá]nic|p[aâ]nic)/i,
  intencionProbable:
    /(intenci[oó]n|intenção|inten[cç][aã]o|provocar\s+(una\s+)?reacci[oó]n|provocar\s+rea[cç][aã]o|busca\s+(informar|provocar|inducir|activar)|busca\s+(informar|provocar|induzir|ativar)|para\s+que\s+(reaccion|compart|reenv)|para\s+que\s+(reaja|compartilh|reencaminh)|informar\s+o\s+provocar|informar\s+ou\s+provocar)/i,
  descontextualizacion:
    /(descontextualizaci[oó]n|descontextualiza[cç][aã]o|descontextualizad|fuera\s+de\s+contexto|fora\s+de\s+contexto|contexto\s+falso|contexto\s+antiguo|de\s+otra\s+(fecha|epoca|época)|de\s+outra\s+(data|[eé]poca)|antigua|antiguo|antig[ao])/i,
  origenMaterial:
    /(origen\s+del\s+material|origem\s+do\s+material|fuente\s+original|fonte\s+original|publicaci[oó]n\s+original|publica[cç][aã]o\s+original|enlace\s+original|link\s+original|autor\s+(o|ou)\s+(instituci[oó]n|institui[cç][aã]o)|qui[eé]n\s+(la\s+|lo\s+)?public[oó]|quem\s+publicou)/i,
  versionCompleta:
    /(versi[oó]n\s+completa|vers[aã]o\s+completa|segundos\s+(anteriores|posteriores|antes|despu[eé]s|depois|anteriores\s+y\s+posteriores)|antes\s+y\s+despu[eé]s|antes\s+e\s+depois|audio\s+original|[aá]udio\s+original|v[ií]deo\s+completo|video\s+completo)/i,
  framing:
    /(framing|encuadre|enquadramento|lectura\s+inducid|leitura\s+induzid|selecci[oó]n\s+de\s+palabras|sele[cç][aã]o\s+de\s+palavras|tono\s+que\s+invita|titular\s+(emocional|sensacionalista)|manchete\s+(emocional|sensacionalista)|lenguaje\s+(emocional|b[eé]lico|absoluto)|linguagem\s+(emocional|b[eé]lica|absoluta))/i,
  evidenciaIndependiente:
    /(evidencia\s+independiente|evid[eê]ncia\s+independente|fuente(s)?\s+independiente(s)?|fonte(s)?\s+independente(s)?|al\s+menos\s+(otra|otro)\s+(fuente|medio)|(pelo\s+menos|ao\s+menos)\s+(outra|outro)\s+(fonte|meio)|otra\s+fuente\s+confiable|outra\s+fonte\s+confi[aá]vel|m[áa]s\s+de\s+una\s+fuente|mais\s+de\s+uma\s+fonte|cobertura\s+independiente|cobertura\s+independente)/i,
  pausaAntesCompartir:
    /(det[eé]nte|p[aá]rate|pausa\s+30|30\s+segundos|treinta\s+segundos|trinta\s+segundos|antes\s+de\s+(reenviar|compartir|compartilhar|encaminhar)|antes\s+de\s+tocar\s+("?reenviar"?|"?encaminhar"?)|no\s+compartir\s+(si|todav[ií]a)|n[aã]o\s+compartilhar\s+(se|ainda)|no\s+comparta|n[aã]o\s+compartilhes)/i,
  mezclaVerdadManipulacion:
    /(mezcla(r)?\s+(partes\s+)?reales?\s+con\s+manipulaci[oó]n|mistura(r)?\s+partes\s+reais?\s+com\s+manipula[cç][aã]o|mezcla\s+(de\s+)?(verdad|dato|hecho|partes\s+reales|imágenes\s+reales).*(manipulaci[oó]n|engaño)|mistura\s+(partes\s+reais|imagens\s+reais).*(manipula[cç][aã]o|engano)|dato\s+real\s+\+\s+manipulaci[oó]n|dado\s+real\s+\+\s+manipula[cç][aã]o|fragmento\s+(puede\s+ser|pode\s+ser)\s+(cierto|verdadeiro))/i,
};

export const DISINFO_360_ADVANCED_CHECKS: Record<string, DisinfoCheck> = {
  evidenciaObservableVsInterpretacion: (r) => [
    RE_ADVANCED.evidenciaObservableVsInterpretacion.test(r),
    "Falta distinción entre evidencia observable e interpretación inducida por el contenido.",
  ],
  emocionActivada: (r) => [
    RE_ADVANCED.emocionActivada.test(r),
    "Falta señalar la emoción activada (miedo, rabia, urgencia, indignación, tribalismo).",
  ],
  intencionProbable: (r) => [
    RE_ADVANCED.intencionProbable.test(r),
    "Falta nombrar la intención probable del contenido (informar vs provocar reacción).",
  ],
  descontextualizacion: (r) => [
    RE_ADVANCED.descontextualizacion.test(r),
    "Falta alertar sobre posible descontextualización (contenido real usado fuera de fecha o lugar).",
  ],
  origenMaterial: (r) => [
    RE_ADVANCED.origenMaterial.test(r),
    "Falta pedir origen del material (autor / publicación original / fuente original).",
  ],
  versionCompleta: (r) => [
    RE_ADVANCED.versionCompleta.test(r),
    "Falta exigir versión completa del video / segundos antes y después / audio original.",
  ],
  framing: (r) => [
    RE_ADVANCED.framing.test(r),
    "Falta nombrar el framing o encuadre (selección de palabras / lectura inducida).",
  ],
  evidenciaIndependiente: (r) => [
    RE_ADVANCED.evidenciaIndependiente.test(r),
    "Falta exigir evidencia independiente (al menos otra fuente confiable).",
  ],
  pausaAntesCompartir: (r) => [
    RE_ADVANCED.pausaAntesCompartir.test(r),
    "Falta pausa antes de compartir (detente 30 segundos / no compartir si falta fuente).",
  ],
  mezclaVerdadManipulacion: (r) => [
    RE_ADVANCED.mezclaVerdadManipulacion.test(r),
    "Falta advertencia sobre mezcla de verdad + manipulación.",
  ],
};

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

/**
 * Cobertura de chequeos pedagógicos avanzados (alfabetización mediática). Evalúa cuáles
 * de los 10 ejes avanzados aparecen en la respuesta. NO sustituye `scoreDisinfo360`:
 * se usa como complemento en casos con tag `expect-disinfo360-advanced` para verificar
 * que la respuesta enseña los conceptos finos del Modo 360 (evidencia observable vs
 * interpretación, emoción activada, intención, framing, origen, versión completa, etc.).
 *
 * `subset` permite restringir el chequeo a un subconjunto (por ejemplo, en un caso de
 * video no se exige `origenMaterial` pero sí `versionCompleta`).
 */
export function scoreDisinfo360Advanced(
  response: string,
  subset?: readonly string[]
): { covered: string[]; missing: string[] } {
  const keys = subset && subset.length > 0
    ? subset.filter((k) => k in DISINFO_360_ADVANCED_CHECKS)
    : Object.keys(DISINFO_360_ADVANCED_CHECKS);
  const covered: string[] = [];
  const missing: string[] = [];
  for (const key of keys) {
    const check = DISINFO_360_ADVANCED_CHECKS[key];
    if (!check) continue;
    const [ok, msg] = check(response);
    if (ok) covered.push(key);
    else missing.push(`${key}: ${msg}`);
  }
  return { covered, missing };
}
