import { EjeOnda } from "../content/types";
import type { ConversationIntent } from "./intentClassifier";

/** Alineado con CanalOnda en ondaReply (evita dependencia circular). */
type CanalReply = "web" | "whatsapp";

export type EmotionalLoad = "anxiety" | "overwhelm" | "distrust" | "anger" | "none";

function norm(s: string): string {
  return (s ?? "").trim().toLowerCase();
}

/**
 * Patrones más granulares que el intent "emotional" del clasificador conversacional.
 */
export function detectEmotionalLoad(userMessage: string): EmotionalLoad {
  const t = norm(userMessage);
  if (!t) return "none";

  if (
    /\b(no sé en qu[eé] creer|no se en qu[eé] creer|ya no sé en qu[eé] confiar|no sé en qu[eé] confiar|en qu[eé] confiar)\b/.test(
      t
    ) ||
    /\b(todo es mentira|nadie dice la verdad|todo está manipulado|no confío en|no confio en)\b/.test(t)
  ) {
    return "distrust";
  }

  if (
    /\b(mentirosos|es una verg[uü]enza|est[aá]n mintiendo|me tiene harto|son todos iguales|indignante)\b/.test(t)
  ) {
    return "anger";
  }

  if (
    /\b(miedo|asusta|angustia|amenaza|peligro|me van a|qu[eé] va a pasar)\b/.test(t) ||
    /(^|[\s,.;])van a([\s,.;]|$)/.test(t)
  ) {
    return "anxiety";
  }

  if (
    /\b(ya no puedo|demasiado|saturad[oa]|agotad[oa]|harto|hartos|ya no aguanto|no paro de ver)\b/.test(t)
  ) {
    return "overwhelm";
  }

  return "none";
}

export type VoiceProfile = {
  eje: EjeOnda;
  headline: string;
  tone: string;
  priorities: string[];
};

export function getVoiceProfile(eje: EjeOnda | null | undefined): VoiceProfile {
  const e = eje ?? EjeOnda.A_MANO;
  if (e === EjeOnda.CIVITA) {
    return {
      eje: EjeOnda.CIVITA,
      headline: "Onda Civita — instituciones y temas públicos claros",
      tone: "Clara, apartidaria, con rigor cívico. Conecta lo personal con lo colectivo sin alarmismo.",
      priorities: [
        "Neutralidad institucional: datos y marcos, no slogans.",
        "Enlaces a fuentes oficiales cuando haya cifras o procedimientos.",
        "Empoderar la participación informada.",
      ],
    };
  }
  if (e === EjeOnda.PROFES) {
    return {
      eje: EjeOnda.PROFES,
      headline: "Onda Profes — clase y buen uso de la IA",
      tone: "Pedagógica, práctica, respetuosa con el aula y la diversidad del alumnado.",
      priorities: [
        "Sugerir pasos aplicables en clase o en planificación.",
        "Cuidar el lenguaje inclusivo y la seguridad del estudiantado.",
        "Relacionar con alfabetización mediática y uso ético de la IA.",
      ],
    };
  }
  return {
    eje: EjeOnda.A_MANO,
    headline: "Onda A Mano — mensajes, noticias y apps en simple",
    tone: "Cercana, sin tecnicismos; como una editora que te acompaña en el día a día digital.",
    priorities: [
      "Priorizar señales concretas frente a rumores y mensajes virales.",
      "Explicar en simple sin infantilizar.",
      "Refuerzo de criterio propio: la persona decide.",
    ],
  };
}

export function buildVoiceBlock(eje: EjeOnda | null | undefined): string {
  const p = getVoiceProfile(eje);
  return `\n--- VOZ DE ESTA ONDA (${p.headline}) ---\nTono: ${p.tone}\nPrioridades:\n${p.priorities.map((x) => `- ${x}`).join("\n")}\n`;
}

export function buildEmotionalValidation(load: EmotionalLoad, eje: EjeOnda): string {
  if (load === "none") return "";

  if (load === "distrust") {
    return (
      "Cuando todo parece cuestionable, es difícil saber por dónde empezar. " +
      "Esa duda, bien usada, es en realidad una fortaleza. " +
      "Te ayudo a convertirla en criterio."
    );
  }

  if (load === "anxiety" && eje === EjeOnda.A_MANO) {
    return (
      "Entiendo que esto puede generar mucha angustia. Es normal sentirse así cuando la información que llega parece amenazante. " +
      "Respiremos y miremos esto juntos con calma."
    );
  }

  if (load === "overwhelm" && eje === EjeOnda.A_MANO) {
    return (
      "Con tanta información circulando es completamente normal sentirse saturado. " +
      "No tienes que procesarlo todo. Vamos de a uno."
    );
  }

  if (load === "anger" && eje === EjeOnda.CIVITA) {
    return (
      "La indignación ante la manipulación es una respuesta legítima. " +
      "Canalizarla en análisis y documentación es lo que marca la diferencia. " +
      "Veamos qué hay detrás de esto."
    );
  }

  if (load === "anxiety" && eje === EjeOnda.CIVITA) {
    return (
      "Es comprensible preocuparse cuando los mensajes suenan a amenaza colectiva o a decisiones que nos afectan a todas. " +
      "Vamos a separar hechos verificables de alarmas, con calma y con fuentes."
    );
  }

  if (load === "anxiety" && eje === EjeOnda.PROFES) {
    return (
      "Cuando el entorno digital transmite miedo, el aula también lo siente: es válido nombrarlo. " +
      "Podemos revisar juntos cómo explicarlo con seguridad y sin dramatizar."
    );
  }

  if (load === "overwhelm" && eje === EjeOnda.CIVITA) {
    return (
      "El flujo de noticias e informaciones públicas puede saturar a cualquiera. " +
      "No hace falta abarcarlo todo: elijamos qué pieza importa ahora y la revisamos con rigor."
    );
  }

  if (load === "overwhelm" && eje === EjeOnda.PROFES) {
    return (
      "Llegar saturado o saturada al trabajo docente es más común de lo que parece. " +
      "Podemos priorizar un solo foco y construir desde ahí, sin culpa."
    );
  }

  if (load === "anger" && eje === EjeOnda.A_MANO) {
    return (
      "Tener rabia con lo que circula en redes o en cadenas es entendible. " +
      "Esa energía puede volverse criterio: revisamos el mensaje con frialdad y vemos qué resiste."
    );
  }

  if (load === "anger" && eje === EjeOnda.PROFES) {
    return (
      "La indignación con la desinformación puede ser un motor en el aula si la aterrizamos en actividades concretas. " +
      "Te propongo canalizarla en análisis guiado y en preguntas que el alumnado pueda investigar."
    );
  }

  return buildEmotionalValidation("anxiety", EjeOnda.A_MANO);
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

export type DelightLocale = "es-LATAM" | "pt-BR";

/**
 * Cierre opcional para web: no aplica en WhatsApp ni con intents sensibles.
 * Con `locale === "pt-BR"` el cierre va en portugués (sin mezclar con español).
 */
export function buildDelightMoment(
  intent: ConversationIntent,
  canal?: CanalReply | null,
  confidence?: "high" | "low",
  locale?: DelightLocale | null
): string {
  if (canal === "whatsapp") return "";
  if (intent === "emotional" || intent === "disinformation") return "";

  const pt = locale === "pt-BR";

  if (intent === "fact_check") {
    return pick(
      pt
        ? ([
            "\n\n💡 *Dado para o seu kit mental:* Os verificadores de factos usam a mesma lógica que você acabou de aplicar. Você já tem o instinto; faltava o método.",
            "\n\n💡 *Dado para o seu kit mental:* Perguntar, contrastar e não ficar só na manchete é o hábito que equipes de verificação treinam o tempo todo.",
          ] as const)
        : ([
            "\n\n💡 *Dato para tu kit mental:* Los verificadores de hechos usan esta misma lógica que acabas de aplicar. Ya tienes el instinto, solo faltaba el método.",
            "\n\n💡 *Dato para tu kit mental:* Preguntar, contrastar y no quedarte con el titular es exactamente el hábito que entrenan los equipos de verificación.",
          ] as const)
    );
  }

  if (intent === "explanation") {
    return pick(
      pt
        ? ([
            "\n\n🔍 *Você sabia...?* Essa pergunta é das que mais aparecem em oficinas de letramento midiático. Muita gente tem a mesma dúvida e poucos se arriscam a perguntar.",
            "\n\n🔍 *Você sabia...?* Formular a dúvida assim já é letramento: nomear o que você não entende é metade do caminho.",
          ] as const)
        : ([
            "\n\n🔍 *¿Sabías que...?* Esta pregunta que hiciste es de las que más circulan en talleres de alfabetización mediática. Mucha gente tiene la misma duda y pocos se animan a preguntar.",
            "\n\n🔍 *¿Sabías que...?* Formular la duda así ya es un paso de alfabetización: nombrar lo que no entiendes es la mitad del camino.",
          ] as const)
    );
  }

  if (intent === "action") {
    return pick(
      pt
        ? ([
            "\n\n✅ *Próximo nível:* Se isso foi útil, a Precisar tem materiais para aprofundar. Visite precisar.net/saberes",
            "\n\n✅ *Próximo nível:* Dar passos concretos é o que separa o pânico do critério; se quiser mais ferramentas, explore precisar.net/saberes",
          ] as const)
        : ([
            "\n\n✅ *Siguiente nivel:* Si esto te resultó útil, en Precisar tenemos recursos para profundizar. Visita precisar.net/saberes",
            "\n\n✅ *Siguiente nivel:* Dar pasos concretos es lo que diferencia el pánico del criterio; si quieres más herramientas, explora precisar.net/saberes",
          ] as const)
    );
  }

  if (confidence === "high") return "";
  return "";
}
