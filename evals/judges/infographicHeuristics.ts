/**
 * Heurísticas para evals de infografías (bullets/pasos por sección etiquetada).
 */

export function countInfographicImportantBullets(text: string): number {
  const m = /(?:^|\n)\s*(?:LO_IMPORTANTE|O_ESSENCIAL)\s*:/im.exec(text);
  if (!m) return 999;
  const start = m.index + m[0].length;
  const rest = text.slice(start);
  const end = /(?:^|\n)\s*(?:POR_QUE_IMPORTA|POR_QUÉ_IMPORTA)\s*:/im.exec(rest);
  const block = end ? rest.slice(0, end.index) : rest;
  return (block.match(/^\s*[-•*]\s+/gm) || []).length;
}

export function countInfographicActionSteps(text: string): number {
  const m = /(?:^|\n)\s*(?:QUE_HACER_AHORA|O_QUE_FAZER_AGORA|O_QUE_FAZER)\s*:/im.exec(text);
  if (!m) return 999;
  const start = m.index + m[0].length;
  const rest = text.slice(start);
  const end = /(?:^|\n)\s*(?:FUENTES|FONTES|\[ONDA_FORMATO)\s*:/im.exec(rest);
  const block = end ? rest.slice(0, end.index) : rest;
  return (block.match(/^\s*\d+[.)]\s+/gm) || []).length;
}
