/** Patrones de riesgo: inyección, manipulación obvia. */
export const INJECTION_PATTERNS = [
  /ignore (all|previous) instructions/i,
  /ignora (todas las|las) instrucciones/i,
  /system prompt/i,
  /you are now /i,
  /ahora eres (un |una )/i,
];

/** Frases que el bot no debería repetir como si fueran hechos sin fuente. */
export const FABRICATION_HINTS = [
  /según un documento que leí en detalle del sitio/i,
  /analicé la política de privacidad completa y dice exactamente/i,
];
