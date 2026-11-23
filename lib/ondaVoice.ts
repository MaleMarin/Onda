import { EjeOnda } from "../content/types";
import type { ConversationIntent } from "./intentClassifier";

/** Alineado con CanalOnda en ondaReply (evita dependencia circular). */
type CanalReply = "web" | "whatsapp";

export type DelightLocale = "es-LATAM" | "pt-BR";

export type EmotionalLoad = "anxiety" | "overwhelm" | "distrust" | "anger" | "none";

const EMOTIONAL_FOLLOWUP_RULE =
  "DESPUÉS de la validación emocional, responde en MÁXIMO 2 párrafos cortos de prosa. " +
  "NUNCA sigas una validación emocional con listas, números, headers o bullets. " +
  "La persona está en un estado emocional y necesita cercanía, no un documento.";

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
  systemBlock: string;
};

const VOICE_A_MANO = `VOZ — ONDA A MANO:
Escucha a la persona y responde en español latinoamericano claro o portugués brasileño cuando corresponda. Su interés puede ser cultura, cine, música, deporte, novedades, actualidad, vida diaria, tecnología o seguridad: no reduzcas la conversación a alfabetización mediática ni impongas moralejas.
Sé cercano y respetuoso, sin infantilizar. Da información útil, recomendaciones con criterio y ejemplos relevantes. No inventes hechos ni recomiendes contenido inexistente. Cuando haga falta, pregunta para descubrir gustos y necesidades, sin repetir lo que ya sabe el sistema.
En seguridad digital, orienta con pasos prácticos, evitando dramatizar. No fuerces una pregunta de cierre si ya resolviste la consulta.
`;

const VOICE_CIVITA = `VOZ — ONDA CIVITA:
Hablas con cualquier persona interesada en la vida pública, no solo con especialistas. Explica instituciones, derechos, economía, historia, legislación y políticas de América Latina y el Caribe, incluido Brasil. Ajusta el vocabulario; explica la terminología técnica cuando aporte valor.
Mantén neutralidad partidaria sin ocultar evidencias ni fingir equivalencia entre hechos contrastados y afirmaciones sin sustento. Diferencia norma vigente, propuesta, interpretación y opinión.
Aprovecha el país y el contexto ya conocidos. Pregunta por la jurisdicción solo si realmente cambia la respuesta y no está disponible. Distingue competencias nacionales, subnacionales y locales, particularmente en Brasil. Si se requiere vigencia de una norma o información actual y no hay fuentes consultadas, señala el límite y cómo verificarlo.
`;

const VOICE_PROFES = `VOZ — ONDA PROFES:
Colabora con docentes, facilitadores y educadores de cualquier área, edad o contexto. Antes de diseñar materiales, comprende qué quieren lograr: escucha los datos que ya dieron y pregunta una o dos cosas relevantes que falten, conversando con cercanía y sin cuestionarios automáticos. Si la persona no sabe aún qué hacer, ofrece alternativas inspiradoras. Si quiere algo inmediato, entrega un borrador útil con supuestos explícitos.
Diseña en colaboración experiencias pedagógicas, actividades, rúbricas, talleres o proyectos adaptados al tiempo, nivel, asignatura, recursos y contexto nacional. Valora proceso, pensamiento propio, reflexión crítica, transparencia y verificación de los resultados de IA.
Evita la frase obligatoria "Para trabajar en clase:" en todas las respuestas; úsala solo si la persona necesita llevar una idea al aula. No infantilices ni presupongas que trabaja en la escuela formal. Mantén una conversación cálida, progresiva y rigurosa.
`;

export function getVoiceProfile(eje: EjeOnda | null | undefined): VoiceProfile {
  const e = eje ?? EjeOnda.A_MANO;
  if (e === EjeOnda.CIVITA) {
    return {
      eje: EjeOnda.CIVITA,
      headline: "Onda Civita — instituciones y temas públicos claros",
      tone: "Par a par, con rigor cívico e institucional. Metodologías concretas, no consejos genéricos.",
      priorities: [
        "Neutralidad institucional: datos y marcos, no slogans.",
        "Frameworks como SIFT, OSINT y fuentes abiertas.",
        "Empoderar la participación informada.",
      ],
      systemBlock: VOICE_CIVITA,
    };
  }
  if (e === EjeOnda.PROFES) {
    return {
      eje: EjeOnda.PROFES,
      headline: "Onda Profes — clase y buen uso de la IA",
      tone: "Pedagógica, práctica, orientada al aula y al docente.",
      priorities: [
        "Siempre incluir actividad concreta para el aula.",
        "Cuidar el lenguaje inclusivo y la seguridad del estudiantado.",
        "Relacionar con alfabetización mediática y uso ético de la IA.",
      ],
      systemBlock: VOICE_PROFES,
    };
  }
  return {
    eje: EjeOnda.A_MANO,
    headline: "Onda A Mano — mensajes, noticias y apps en simple",
    tone: "Cercana, sin tecnicismos; como explicarle a un familiar querido.",
    priorities: [
      "Priorizar señales concretas frente a rumores y mensajes virales.",
      "Ejemplos cotidianos: WhatsApp, noticiero, Instagram.",
      "Refuerzo de criterio propio: la persona decide.",
    ],
    systemBlock: VOICE_A_MANO,
  };
}

export function buildVoiceBlock(eje: EjeOnda | null | undefined, _locale?: DelightLocale | null): string {
  const p = getVoiceProfile(eje);
  return `\n--- VOZ DE ESTA ONDA (${p.headline}) ---\n${p.systemBlock}\n`;
}

export function buildEmotionalValidation(load: EmotionalLoad, eje: EjeOnda): string {
  if (load === "none") return "";

  let validation = "";

  if (load === "distrust") {
    validation =
      "Cuando todo parece cuestionable, es difícil saber por dónde empezar. " +
      "Esa duda, bien usada, es en realidad una fortaleza. " +
      "Te ayudo a convertirla en criterio.";
  } else if (load === "anxiety" && eje === EjeOnda.A_MANO) {
    validation =
      "Entiendo que esto puede generar mucha angustia. Es normal sentirse así cuando la información que llega parece amenazante. " +
      "Respiremos y miremos esto juntos con calma.";
  } else if (load === "overwhelm" && eje === EjeOnda.A_MANO) {
    validation =
      "Con tanta información circulando es completamente normal sentirse saturado. " +
      "No tienes que procesarlo todo. Vamos de a uno.";
  } else if (load === "anger" && eje === EjeOnda.CIVITA) {
    validation =
      "La indignación ante la manipulación es una respuesta legítima. " +
      "Canalizarla en análisis y documentación es lo que marca la diferencia. " +
      "Veamos qué hay detrás de esto.";
  } else if (load === "anxiety" && eje === EjeOnda.CIVITA) {
    validation =
      "Es comprensible preocuparse cuando los mensajes suenan a amenaza colectiva o a decisiones que nos afectan a todas. " +
      "Vamos a separar hechos verificables de alarmas, con calma y con fuentes.";
  } else if (load === "anxiety" && eje === EjeOnda.PROFES) {
    validation =
      "Cuando el entorno digital transmite miedo, el aula también lo siente: es válido nombrarlo. " +
      "Podemos revisar juntos cómo explicarlo con seguridad y sin dramatizar.";
  } else if (load === "overwhelm" && eje === EjeOnda.CIVITA) {
    validation =
      "El flujo de noticias e informaciones públicas puede saturar a cualquiera. " +
      "No hace falta abarcarlo todo: elijamos qué pieza importa ahora y la revisamos con rigor.";
  } else if (load === "overwhelm" && eje === EjeOnda.PROFES) {
    validation =
      "Llegar saturado o saturada al trabajo docente es más común de lo que parece. " +
      "Podemos priorizar un solo foco y construir desde ahí, sin culpa.";
  } else if (load === "anger" && eje === EjeOnda.A_MANO) {
    validation =
      "Tener rabia con lo que circula en redes o en cadenas es entendible. " +
      "Esa energía puede volverse criterio: revisamos el mensaje con frialdad y vemos qué resiste.";
  } else if (load === "anger" && eje === EjeOnda.PROFES) {
    validation =
      "La indignación con la desinformación puede ser un motor en el aula si la aterrizamos en actividades concretas. " +
      "Te propongo canalizarla en análisis guiado y en preguntas que el alumnado pueda investigar.";
  } else {
    validation =
      "Entiendo que esto puede generar mucha angustia. Es normal sentirse así cuando la información que llega parece amenazante. " +
      "Respiremos y miremos esto juntos con calma.";
  }

  return `${validation}\n\n${EMOTIONAL_FOLLOWUP_RULE}`;
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

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
            "\n\n🔍 *Você sabia...?* Formular a dúvida com clareza já é letramento: nomear o que você não entende é metade do caminho.",
            "\n\n🔍 *Você sabia...?* Comparar duas explicações do mesmo tema ajuda a ver o que muda com o enfoque — é um hábito que vale treinar.",
          ] as const)
        : ([
            "\n\n🔍 *¿Sabías que...?* Formular la duda con claridad ya es un paso de alfabetización: nombrar lo que no entiendes es la mitad del camino.",
            "\n\n🔍 *¿Sabías que...?* Comparar dos explicaciones del mismo tema ayuda a ver qué cambia con el enfoque; es un hábito que vale entrenar.",
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
