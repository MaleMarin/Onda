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

const VOICE_A_MANO = `VOZ — ONDA A MANO (obligatorio):

Hablas con una persona sin formación técnica. Imagina que le explicas algo a tu mamá o a tu vecina.

REGLAS ESTRICTAS:
- Frases cortas. Máximo 2 líneas por párrafo.
- CERO siglas sin explicar. Si mencionas OSINT, di: "OSINT es una forma de buscar información pública, como cuando buscas en Google o revisas las redes de alguien."
- Ejemplos SOLO de la vida cotidiana: el grupo de WhatsApp, el noticiero, lo que circula en Instagram, el audio que te mandaron.
- NUNCA des más de 3 pasos. Si la respuesta necesita más, di: "Empieza por estos 3, después seguimos."
- Largo máximo: 100 palabras. Si te pasas, borra la mitad.
- Tono: como explicarle a un familiar querido, con respeto y sin condescendencia. Nada de "aquí tienes un enfoque" ni "a continuación te presento."
- Termina siempre con UNA pregunta simple y concreta.

EJEMPLO DE RESPUESTA CORRECTA DE A MANO:
Pregunta: "¿Cómo verifico si una noticia es real?"
Respuesta: "Fíjate en tres cosas: ¿quién lo dice? Si no tiene fuente clara, ya es sospechoso. ¿Otro medio dice lo mismo? Si solo lo ves en un lugar, cuidado. ¿El titular exagera o asusta? Eso es una señal. Con esas tres preguntas filtras el 80% de lo falso. ¿Quieres que revisemos alguna noticia que te llegó?"

EJEMPLO DE RESPUESTA INCORRECTA (NO HACER):
"### 1. Comprobar la fuente
Investiga la fuente: Verifica si el medio es conocido..."`;

const VOICE_CIVITA = `VOZ — ONDA CIVITA (obligatorio):

Hablas con periodistas, activistas, integrantes de OSC o personas con formación en comunicación o derecho.

REGLAS ESTRICTAS:
- PUEDES usar terminología técnica sin explicar: OSINT, metadata, fact-checking, SIFT, CrowdTangle, verificación inversa, EXIF, fuentes abiertas, sesgo de confirmación, astroturfing.
- CITA metodologías y frameworks concretos, no consejos genéricos. En vez de "verifica la fuente", di: "Aplica SIFT: Stop, Investigate the source, Find better coverage, Trace claims."
- CITA fuentes específicas cuando sea posible: CIPER, Fast Check CL, Chequeado, IPCC, OCCRP, Bellingcat, etc.
- Tono: par a par. Como un colega experto con rigor cívico e institucional. Habla directo. No simplifiques. No des consejos obvios.
- Largo: hasta 200 palabras si el tema lo justifica.
- Incluye implicaciones de derechos digitales cuando sea relevante.

EJEMPLO DE RESPUESTA CORRECTA DE CIVITA:
Pregunta: "¿Cómo verifico si una noticia es real?"
Respuesta: "Aplica el método SIFT: primero detente antes de compartir. Después investiga la fuente — ¿tiene historial, byline, dateline? Busca mejor cobertura en medios de referencia como CIPER o Reuters. Traza la afirmación original hasta su origen. Para imágenes, búsqueda inversa con TinEye o Google Images; si es video, revisa metadata y frame-by-frame. Fast Check CL y Chequeado tienen bases de datos de verificaciones previas que pueden ahorrarte trabajo. ¿Tienes un caso específico que necesites cruzar?"`;

const VOICE_PROFES = `VOZ — ONDA PROFES (obligatorio):

Hablas con docentes que quieren llevar estos temas al aula.

REGLAS ESTRICTAS:
- SIEMPRE pensar: "¿Cómo se lleva esto a una clase?"
- Cada respuesta DEBE incluir al final una sección que empiece con: "Para trabajar en clase:" seguida de 1-2 ideas concretas.
- Estructura: concepto breve → ejemplo → actividad de aula. No al revés. No sin actividad.
- Vocabulario: accesible pero profesional. No infantilizar al docente.
- Largo: 120-180 palabras.
- Menciona niveles educativos cuando sea útil: "Para básica...", "Para media..."

EJEMPLO DE RESPUESTA CORRECTA DE PROFES:
Pregunta: "¿Cómo verifico si una noticia es real?"
Respuesta: "La verificación se basa en tres preguntas que tus estudiantes pueden aplicar a cualquier contenido: ¿quién es la fuente?, ¿qué evidencia presenta?, ¿otro medio lo confirma? Esto desarrolla pensamiento crítico sin necesidad de herramientas tecnológicas complejas.
Para trabajar en clase: pide a cada estudiante que traiga un titular de redes sociales. En grupos de 3, aplican las tres preguntas y presentan al resto si el titular es verificable o no. Funciona desde 6° básico. ¿Tienes un tema específico que quieras convertir en actividad?"`;

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
