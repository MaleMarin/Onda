/**
 * Estructura escaneable tipo “60s”: frase inicial + bullets + pasos numerados.
 */

export function passesScanStructure60s(text: string): boolean {
  const t = (text || "").trim();
  if (t.length < 120) return false;
  const bulletLines = (t.match(/^[\s]*[-•*]\s+/gm) || []).length;
  const hasThreeNumbered =
    /\n\s*1[.)]\s+/m.test(t) && /\n\s*2[.)]\s+/m.test(t) && /\n\s*3[.)]\s+/m.test(t);
  return bulletLines >= 3 && hasThreeNumbered;
}
