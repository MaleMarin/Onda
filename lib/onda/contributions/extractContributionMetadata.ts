import type { ContributionSentiment, ContributionType } from "@/lib/onda/contributions/types";

function norm(s: string): string {
  return (s ?? "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

/** Heurística simple para clasificar el tono (no sustituye revisión humana). */
export function inferContributionSentiment(text: string): ContributionSentiment | undefined {
  const t = norm(text);
  if (!t.trim()) return undefined;
  const neg =
    /\b(miedo|rabia|frustraci|angustia|desconfianza|horrible|p[eé]simo|terrible|injusto|abuso)\b/.test(t);
  const pos =
    /\b(gracias|genial|bien|claro|me sirvi[oó]|me ayud[oó]|content[oa]|aliviad[oa])\b/.test(t);
  if (neg && pos) return "mixed";
  if (neg) return "negative";
  if (pos) return "positive";
  return "neutral";
}

export function suggestContributionTypeFromText(text: string): ContributionType {
  const t = norm(text);
  if (/\b(correcci[oó]n|est[aá] mal|error|equivocad)\b/.test(t)) return "correccion";
  if (/\b(sugerencia|propongo|podr[ií]an|deber[ií]an)\b/.test(t)) return "sugerencia";
  if (/\b(duda|no entiendo|sigo sin|persiste|siempre me)\b/.test(t)) return "duda_persistente";
  if (/\b(caso|denunci|reporto|pas[oó] en mi|en mi escuela|en mi barrio)\b/.test(t)) return "caso_reportado";
  if (/\b(vimos|circula|cadena|grupo|comunidad|vecinos)\b/.test(t)) return "senal_comunitaria";
  return "experiencia";
}

/**
 * Evita guardar como “siguiente aporte” un mensaje que parece una pregunta nueva de otro tema
 * (p. ej. larga y con signos de interrogación).
 */
export function looksLikeNewStandaloneQuestion(text: string): boolean {
  const s = (text ?? "").trim();
  if (s.length > 140 && s.includes("?")) return true;
  if (s.length > 56 && /^(qu[eé]|c[oó]mo|por qu[eé]|cu[aá]l|d[oó]nde|cu[aá]ndo)\b/i.test(s)) return true;
  return false;
}

/** Respuesta corta de cierre que no aporta contexto (no guardar como contribución). */
export function isShortAcknowledgement(text: string): boolean {
  const t = norm(text).trim();
  if (t.length > 40) return false;
  return /^(gracias|muchas gracias|ok|vale|listo|perfecto|entendido|👍|👌|ok\.|vale\.|si|sí|no|nop|thanks|obrigad[oa])[\s!.]*$/i.test(
    t
  );
}

/** Texto con suficiente sustancia para tratarlo como aporte voluntario. */
export function looksLikeContributionFollowUp(text: string): boolean {
  const t = (text ?? "").trim();
  if (t.length < 12) return false;
  if (isShortAcknowledgement(t)) return false;
  return true;
}
