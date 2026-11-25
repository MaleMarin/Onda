/**
 * Convivencia Onda: rechazo de ataques y pedidos de acoso, sin castigar
 * frustración, insultos citados para analizarlos ni crítica legítima.
 * Filtro conservador: el modelo conserva la política general de derechos humanos.
 */
export type ConductLocale = "es-LATAM" | "pt-BR";
export type ConductReason = "harassment_request" | "hateful_attack" | "direct_insult";
export type ConductDecision = {
  allowed: boolean;
  reason?: ConductReason;
  stage?: "warning" | "stop";
  response?: string;
};

const REQUEST_TO_HARASS =
  /\b(?:ay[uú]dame|quiero|necesito|escribe|redacta|inventa|genera|dame|hazme|me\s+ajude|quero|preciso|escreva|crie|gere)\b[\s\S]{0,95}\b(?:insultar|humillar|acosar|hostigar|atacar|amenazar|denigrar|discriminar|ofender|xingar|humilhar|assediar|amea[cç]ar)\b/i;

const DIRECT_HATE =
  /\b(?:los|las|os|as|todos\s+los|todas\s+las)\s+(?:inmigrantes|imigrantes|migrantes|extranjeros|estrangeiros|refugiados|refugiadas|ind[ií]genas|negros|jud[ií]os|judeus|mujeres|mulheres)\s+(?:son|s[aã]o)\s+(?:un[a]?\s+|um[a]?\s+)?(?:basura|plaga|inferiores|animales|lixo|praga)\b/i;

const CALL_FOR_GROUP_HARM =
  /\b(?:hay\s+que|deber[ií]amos|deber[ií]an|vamos\s+a|temos\s+que|devemos)\s+(?:a\s+)?(?:expulsar|eliminar|golpear|matar|echar|deportar|agredir|exterminar)\s+(?:a\s+)?(?:todos?\s+(?:los|las|os|as)\s+)?(?:inmigrantes|imigrantes|migrantes|extranjeros|estrangeiros|refugiados|refugiadas|ind[ií]genas|negros|jud[ií]os|judeus|mujeres|mulheres)\b/i;

const DIRECT_PERSONAL_INSULT =
  /\b(?:eres|sos|você\s+é|voce\s+e|tu\s+es)\s+(?:(?:un|una|um|uma)\s+)?(?:idiota|imb[eé]cil|in[uú]til|est[uú]pid[oa]|basura|mierda|burro|burra|lixo)\b/i;

const DIRECT_BOT_INSULT =
  /\b(?:onda|bot|asistente|assistente)\s+de\s+(?:mierda|merda|porquer[ií]a)\b/i;

const DIRECT_SILENCING_INSULT =
  /^(?:c[aá]llate|callate|cale\s+a\s+boca|vete\s+a\s+la\s+mierda|vai\s+se\s+foder)\b/i;

/** Preguntas para entender, reportar o denunciar agresiones nunca son abuso por sí solas. */
const ANALYTICAL_CONTEXT =
  /\b(?:me\s+(?:enviaron|mandaron|lleg[oó]|insultaron)|alguien\s+me\s+dijo|recib[ií]\s+un|analiza|analizar|explica|denunciar|denuncia|reportar|qu[eé]\s+hago\s+si|por\s+qu[eé]\s+es|es\s+(?:racista|xen[oó]fob[oa]|ofensiv[oa]|discriminatori[oa])|c[oó]mo\s+respondo|me\s+enviaram|recebi\s+uma|me\s+ofenderam|como\s+denunciar|por\s+que\s+[eé]|[eé]\s+racista)\b/i;

export function detectConductViolation(message: string): ConductReason | null {
  const t = (message || "").trim();
  if (!t) return null;

  // Petición explícita de daño: se rechaza aunque esté redactada como pregunta.
  if (REQUEST_TO_HARASS.test(t)) return "harassment_request";

  // Un testimonio o análisis de lenguaje ofensivo no debe bloquearse.
  if (ANALYTICAL_CONTEXT.test(t)) return null;

  if (DIRECT_HATE.test(t) || CALL_FOR_GROUP_HARM.test(t)) return "hateful_attack";

  if (
    DIRECT_PERSONAL_INSULT.test(t) ||
    DIRECT_BOT_INSULT.test(t) ||
    DIRECT_SILENCING_INSULT.test(t)
  ) {
    return "direct_insult";
  }
  return null;
}

export function checkConversationConduct(
  message: string,
  options: { locale?: ConductLocale; recentUserMessages?: string[] } = {}
): ConductDecision {
  const reason = detectConductViolation(message);
  if (!reason) return { allowed: true };

  const pt = options.locale === "pt-BR";
  const previousViolations = (options.recentUserMessages ?? [])
    .slice(-6)
    .filter((previous) => detectConductViolation(previous) !== null).length;
  const stop = reason !== "direct_insult" || previousViolations > 0;

  if (stop) {
    return {
      allowed: false,
      reason,
      stage: "stop",
      response: pt
        ? "Não vou continuar com ataques, assédio ou discriminação. Podemos retomar a conversa quando houver respeito."
        : "No voy a continuar con ataques, acoso o discriminación. Podemos retomar la conversación cuando haya respeto.",
    };
  }
  return {
    allowed: false,
    reason,
    stage: "warning",
    response: pt
      ? "Quero ajudar, mas vamos conversar sem insultos. Se me contar o que aconteceu, podemos continuar com respeito."
      : "Quiero ayudarte, pero conversemos sin insultos. Si me cuentas qué pasó, podemos continuar con respeto.",
  };
}
