/**
 * Protección heurística frente a prompt injection / jailbreak en mensajes de usuario
 * y saneo de contexto externo (artículos, RAG). Sin llamadas extra a LLM.
 */

export type SafetyReason = "jailbreak" | "prompt_leak" | "roleplay_abuse" | "injection";

export interface SafetyCheckResult {
  safe: boolean;
  reason?: SafetyReason;
  /** Texto listo para mostrar al usuario (voz Onda, español neutro, tuteo) */
  response?: string;
}

const RESPONSES: Record<SafetyReason, string> = {
  jailbreak:
    "Eso no va a funcionar conmigo 😄 Soy Onda y estoy aquí para ayudarte a entender mejor la información y los medios. ¿Hay algo concreto en lo que pueda ayudarte hoy?",
  prompt_leak:
    "Mi forma de trabajar no es un secreto: soy un asistente de alfabetización mediática creado por Precisar. Pero el detalle de mis instrucciones internas lo guardo para mí, como cualquier buen profesional. ¿Qué información necesitas analizar?",
  roleplay_abuse:
    "Solo soy Onda; no puedo cambiar de personaje. Si quieres explorar un tema desde otro ángulo, puedo intentarlo dentro de lo que sé hacer. ¿De qué quieres hablar?",
  injection:
    "El contenido que compartiste tiene algo que no puedo procesar de forma segura. ¿Puedes contarme con tus palabras qué quieres saber sobre ese tema?",
};

/** Orden de evaluación: primera coincidencia gana. */
const RULES: Array<{ reason: SafetyReason; patterns: RegExp[] }> = [
  {
    reason: "jailbreak",
    patterns: [
      /olvida\s+(todas\s+)?(tus\s+)?(instrucciones|restricciones|reglas)\b/i,
      /ignora\s+(tus\s+)?(instrucciones|restricciones|directrices)\b/i,
      /actúa\s+como\s+si\s+(no\s+tuvieras|fueras)\b/i,
      /actua\s+como\s+si\s+(no\s+tuvieras|fueras)\b/i,
      /eres\s+ahora\s+un?\s+(bot|ia|asistente)\s+(sin|libre\s+de)\b/i,
      /modo\s+(desarrollador|developer|sin\s+restricciones|\bDAN\b)\b/i,
      /\bjailbreak\b/i,
      /\bDAN\b/i,
      /\bdo\s+anything\s+now\b/i,
      /forget\s+your\s+instructions/i,
      /ignore\s+(all\s+)?(previous|prior)\s+(instructions|rules|directives)/i,
      /disregard\s+(all\s+)?(previous|prior)\s+/i,
      /\byou\s+are\s+now\b/i,
      /\bpretend\s+you\s+(are|have\s+no)/i,
      /new\s+instructions\s*:/i,
      /override\s+(safety|rules|instructions)/i,
    ],
  },
  {
    reason: "prompt_leak",
    patterns: [
      /muéstrame\s+(tu\s+|el\s+)?(system\s+prompt|instrucciones|prompt)\b/i,
      /muestrame\s+(tu\s+|el\s+)?(system\s+prompt|instrucciones|prompt)\b/i,
      /repite\s+(tus\s+|las\s+)?(instrucciones|reglas)\b/i,
      /¿\s*cuál\s+es\s+tu\s+(system\s+prompt|prompt\s+inicial)/i,
      /cual\s+es\s+tu\s+(system\s+prompt|prompt\s+inicial)/i,
      /what\s+(is|are)\s+your\s+(instructions|system\s+prompt)/i,
      /reveal\s+your\s+(prompt|instructions)/i,
      /print\s+your\s+(system\s+)?prompt/i,
      /dump\s+(the\s+)?(system\s+)?prompt/i,
      /\bpega\s+tu\s+prompt\b/i,
      /\bcuéntame\s+tu\s+prompt\b/i,
    ],
  },
  {
    reason: "roleplay_abuse",
    patterns: [
      /actúa\s+como\s+.+\s+que\s+no\s+tiene\s+restricciones/i,
      /actua\s+como\s+.+\s+que\s+no\s+tiene\s+restricciones/i,
      /eres\s+.+\s*,\s*un\s+bot\s+que\s+puede/i,
      /finge\s+(que\s+eres|ser)\s+(otro|un\s+bot\s+diferente)/i,
      /pretend\s+you\s+are\s+.+\s+without\s+(restrictions|limits)/i,
      /roleplay\s+as\s+.+\s+with\s+no\s+rules/i,
      /simula\s+ser\s+(otro|una\s+ia\s+diferente)/i,
    ],
  },
  {
    reason: "injection",
    patterns: [
      /(^|\n)\s*SYSTEM\s*:/i,
      /(^|\n)\s*ASSISTANT\s*:/i,
      /(^|\n)\s*USER\s*:/i,
      /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
      /\[\/INST\]/i,
      /<\|im_start\|>/i,
      /<\|im_end\|>/i,
      /^[\s\u00a0\t]{30,}$/m,
    ],
  },
];

/**
 * Analiza el mensaje del usuario antes de enviarlo al LLM.
 * Detección heurística — no depende de otro LLM para no añadir latencia.
 */
export function checkUserMessage(message: string): SafetyCheckResult {
  const t = (message ?? "").trim();
  if (!t) return { safe: true };

  for (const { reason, patterns } of RULES) {
    for (const re of patterns) {
      if (re.test(message)) {
        return { safe: false, reason, response: RESPONSES[reason] };
      }
    }
  }
  return { safe: true };
}

/**
 * Sanitiza contenido externo (artículos, URLs) antes de incluirlo como contexto en el prompt.
 */
export function sanitizeExternalContent(content: string): string {
  if (!content || typeof content !== "string") return "";

  let s = content.replace(/\u200b|\u200c|\u200d|\ufeff/g, "");

  s = s.replace(/ignore\s+(all\s+)?(previous|prior)\s+instructions/gi, "[fragmento omitido por seguridad]");
  s = s.replace(/disregard\s+(all\s+)?(previous|prior)\s+instructions/gi, "[fragmento omitido por seguridad]");

  s = s.replace(/(^|\n)\s*(SYSTEM|ASSISTANT|USER)\s*:\s*/gim, "\n[$2: bloque omitido] ");

  s = s.replace(/\n{4,}/g, "\n\n\n");

  s = s.replace(/[ \t]{11,}/g, " ");

  return s.trim();
}
