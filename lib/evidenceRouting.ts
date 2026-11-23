import { classifyIntent } from "./intentClassifier";
import { EjeOnda } from "../content/types";

/**
 * Decisión de recuperación por necesidad de evidencia, no longitud del texto.
 * No genera gastos para definiciones, saludos, opinión o exploración pedagógica.
 */
export function needsExternalEvidence(
  message: string,
  eje: EjeOnda | null | undefined,
  sourcesRequested = false
): boolean {
  const q = (message ?? "").trim().toLowerCase();
  if (!q) return false;
  if (sourcesRequested) return true;
  if (classifyIntent(q).ragNeeded) return true;

  const current =
    /\b(hoy|mañana|ayer|actualmente|últim[oa]s?|reciente[s]?|esta semana|este mes|en vivo|ahora|vigente|vigencia|novedades|202[5-9]|203\d|hoje|amanhã|ontem|atualmente|últim[oa]s?|recente[s]?|essa semana|agora|em vigor)\b/i.test(q);
  const publicClaims =
    /\b(ley|leyes|decreto|regulaci[oó]n|normativa|jurisprudencia|elecci[oó]n|elecciones|constituci[oó]n|congreso|presidente|presidencia|ministro|ministerio|reforma|impuesto|ipc|inflaci[oó]n|tasa de inter[eé]s|banco central|lei|leis|decreto|regulamenta[cç][aã]o|elei[cç][aã]o|elei[cç][oõ]es|congresso|constitui[cç][aã]o|governo|imposto|infla[cç][aã]o)\b/i.test(q);
  const hardFactual =
    /\b(cu[aá]nto cuesta|precio|cifra|estad[ií]stica|porcentaje|resultado|gan[oó]|quien gan[oó]|qu[ié]n es el|qu[ié]n es la|[oó]rgano competente|fuente oficial|site oficial|dados oficiais|fonte oficial|resultado|pre[cç]o|estat[ií]stica)\b/i.test(q);

  if (current && (publicClaims || hardFactual)) return true;
  if (eje === EjeOnda.CIVITA && (publicClaims || (current && hardFactual))) return true;
  if (current && /\b(noticia|not[ií]cia|viral|cierre|cerrar|bancos|anunci[oó]|aprobaron|aprovou|aprovaram|lanzamiento|lan[cç]amento)\b/.test(q)) return true;
  if (eje === EjeOnda.PROFES && /\b(curr[ií]culo|curricular|ministerio de educaci[oó]n|bases curriculares|bncc|curr[ií]culo nacional|ministerio da educa[cç][aã]o)\b/i.test(q)) return true;
  return false;
}

/** La ausencia de resultado no equivale a verificación negativa. */
export function missingEvidenceContext(configured: boolean, locale: "es-LATAM" | "pt-BR"): string {
  const pt = locale === "pt-BR";
  return configured
    ? pt
      ? "A pesquisa não retornou fontes utilizáveis nesta consulta. Não atribua resultados a sites que não foram consultados. Explique os limites e indique onde a pessoa pode confirmar."
      : "La búsqueda no devolvió fuentes utilizables para esta consulta. No atribuyas resultados a sitios que no fueron consultados. Explica los límites e indica dónde puede confirmarse."
    : pt
      ? "A busca externa não está configurada. Não afirme ter consultado fontes em tempo real; indique quando é necessário confirmar informações atuais."
      : "La búsqueda externa no está configurada. No afirmes haber consultado fuentes en tiempo real; indica cuándo es necesario comprobar la información actual.";
}
