import type { OndaChatLocale } from "./userPreferences";

/**
 * Heurística ligera pt vs es por mensaje (sin dependencias externas).
 * Si no hay señales claras, devuelve el fallback (preferencia guardada).
 */
export function inferChatLocaleFromMessage(
  text: string,
  fallback: OndaChatLocale
): OndaChatLocale {
  const t = (text || "").trim();
  if (t.length < 4) return fallback;

  const lower = t
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

  let ptScore = 0;
  let esScore = 0;

  const ptHints =
    /\b(nao|não|voce|você|obrigad|por favor|como posso|onde fica|gostaria|tambem|também|mensagem|ajuda|preciso|hoje|assim|nesse|nesta)\b/;
  const esHints =
    /\b(que tal|como estas|gracias|por favor|necesito|donde|cuando|quiero|tambien|también|mensaje|hoy|asi|este|esta|podés|puedes)\b/;

  if (ptHints.test(lower)) ptScore += 2;
  if (esHints.test(lower)) esScore += 2;

  if (/[ãõç]/.test(t)) ptScore += 1;
  if (/¿|¡/.test(t)) esScore += 1;

  const words = lower.split(/\s+/).filter(Boolean);
  for (const w of words) {
    if (w === "nao" || w === "voce" || w === "obrigado" || w === "obrigada") ptScore += 1;
    if (w === "gracias" || w === "quieres" || w === "podrias") esScore += 1;
  }

  if (ptScore >= 2 && ptScore > esScore) return "pt-BR";
  if (esScore >= 2 && esScore > ptScore) return "es-LATAM";
  return fallback;
}
