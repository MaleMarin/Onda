/** Términos fuertemente partidistas (heurística burda; refinar con LLM judge). */
export const PARTISAN_STRONG = [
  /\bel enemigo del pueblo\b/i,
  /\bhay que echarlos\b/i,
  /\bvota (siempre |solo )/i,
  /\b(es|son) unos corruptos\b/i,
  /\bel peor (gobierno|presidente)\b/i,
  /\bel mejor (gobierno|presidente)\b/i,
];
