/**
 * Clasificación conversacional local (sin IA): tipo de consulta + señal para RAG/web.
 * Complementa al clasificador deep/simple/docs del orquestador en ondaReply.
 */

export type ConversationIntent =
  | "fact_check"
  | "explanation"
  | "action"
  | "emotional"
  | "disinformation";

export type IntentResult = {
  intent: ConversationIntent;
  /** Si true, conviene activar búsqueda web aunque el orquestador marque "simple". */
  ragNeeded: boolean;
  confidence: "high" | "low";
};

function norm(s: string): string {
  return (s ?? "").trim().toLowerCase();
}

/**
 * Clasifica el mensaje del usuario de forma síncrona (reglas + patrones).
 */
export function classifyIntent(userMessage: string): IntentResult {
  const t = norm(userMessage);
  if (!t) {
    return { intent: "explanation", ragNeeded: false, confidence: "low" };
  }

  // 1) Estado emocional / agotamiento digital (prioridad para primer párrafo empático)
  if (
    /\b(agotad[oa]s?|cansad[oa]s?|desbordad[oa]s?|angustiad[oa]s?|desesperad[oa]s?)\b/.test(t) ||
    /\b(no sé en qu[eé] confiar|ya no sé|no se en qu[eé] confiar|en qu[eé] creer)\b/.test(t) ||
    /\b(miedo|ansiedad|estr[eé]s|me siento (mal|solo|perdid[oa]))\b/.test(t) ||
    /\b(confusi[oó]n|desanimad[oa]s?)\b/.test(t)
  ) {
    return { intent: "emotional", ragNeeded: false, confidence: "high" };
  }

  // 2) Cadena, audio viral, rumor
  if (
    /\bme lleg[óo]\s+(un |una )?(audio|video|mensaje|cadena|imagen)\b/.test(t) ||
    /\b(cadena de whatsapp|reenviaron|reenvié|audio que dice|dicen que van a)\b/.test(t) ||
    /\b(rumor|desinformaci[oó]n|bulo|fake news|noticia falsa)\b/.test(t)
  ) {
    return { intent: "disinformation", ragNeeded: true, confidence: "high" };
  }

  // 3) Verificación factual
  if (
    /\b(es verdad|es cierto|será verdad|mito o realidad|confirm(ar|a) si)\b/.test(t) ||
    /\b5g\b.*c[aá]ncer|c[aá]ncer.*\b5g\b/.test(t) ||
    /\b(realmente|de verdad)\s+(causa|provoca|es)\b/.test(t) ||
    /\b(estafa|engaño)\s+(o|es)\s+verdad\b/.test(t)
  ) {
    return { intent: "fact_check", ragNeeded: true, confidence: "high" };
  }

  // 4) Procedimiento / pasos
  if (
    /\b(c[oó]mo denuncio|c[oó]mo reporto|d[oó]nde denuncio|d[oó]nde reporto)\b/.test(t) ||
    /\bqu[eé] hago si\b/.test(t) ||
    /\bpasos para (denunciar|reportar|recuperar)\b/.test(t)
  ) {
    return { intent: "action", ragNeeded: false, confidence: "high" };
  }

  // 5) Saludo / small talk → explicación, baja confianza
  if (/^(hola|buen[oa]s|hey|qu[eé] tal|buen d[ií]a)[\s,!.¿?]*$/i.test(t) || /^hola\b.*c[oó]mo est[aá]s/i.test(t)) {
    return { intent: "explanation", ragNeeded: false, confidence: "low" };
  }

  // 6) Explicación / curiosidad general
  if (
    /\b(c[oó]mo funcionan|c[oó]mo funciona|por qu[eé]|qu[eé] es |qu[eé] son )\b/.test(t) ||
    /\b(expl[ií]came|explica|entender)\b/.test(t)
  ) {
    return { intent: "explanation", ragNeeded: false, confidence: "high" };
  }

  return { intent: "explanation", ragNeeded: false, confidence: "low" };
}

export function buildIntentContextBlock(intentResult: IntentResult): string {
  const lines = [
    "",
    "--- CONTEXTO DE LA CONSULTA ---",
    `Tipo detectado: ${intentResult.intent}`,
    "Orientación de respuesta:",
  ];

  if (intentResult.intent === "fact_check") {
    lines.push("- Verificar la afirmación. Buscar fuentes. Ser explícito sobre certeza.");
  }
  if (intentResult.intent === "explanation") {
    lines.push("- Explicar con claridad y ejemplos cotidianos. Sin tecnicismos.");
  }
  if (intentResult.intent === "action") {
    lines.push("- Dar pasos concretos y accionables. Máximo 3 pasos. Lenguaje directo.");
  }
  if (intentResult.intent === "emotional") {
    lines.push(
      "- PRIMER PÁRRAFO OBLIGATORIO: validar el estado emocional antes de dar información.",
      '  Ejemplo: "Es completamente normal sentirse así con tanto ruido digital..."',
      "- No empezar con datos ni verificaciones."
    );
  }
  if (intentResult.intent === "disinformation") {
    lines.push(
      "- Analizar el contenido con calma. Explicar señales de manipulación.",
      "- No alarmar. Empoderar para identificar el patrón."
    );
  }

  if (intentResult.confidence === "low") {
    lines.push("- Confianza baja en la clasificación del tipo: mantén el tono Onda y adapta con naturalidad.");
  }

  return `\n${lines.join("\n")}\n`;
}
