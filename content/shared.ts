import { EjeOnda, type EjeConfig } from "./types";

/** Orden de aparición: primero Onda A Mano, después Civita, después Profes. */
export const ORDERED_EJES: EjeOnda[] = [
  EjeOnda.A_MANO,
  EjeOnda.CIVITA,
  EjeOnda.PROFES,
];

export const EJE_CONFIGS: Record<EjeOnda, EjeConfig> = {
  [EjeOnda.A_MANO]: {
    id: EjeOnda.A_MANO,
    name: "Onda A Mano",
    color: "#EAB308",
    bgColor: "bg-yellow-50",
    icon: "📱",
    description: "Vida digital cotidiana, criterio e IA.",
    placeholder:
      "Pregúntame sobre una noticia, un audio sospechoso o cómo usar IA hoy...",
  },
  [EjeOnda.CIVITA]: {
    id: EjeOnda.CIVITA,
    name: "Onda Civita",
    color: "#A855F7",
    bgColor: "bg-purple-50",
    icon: "🏛️",
    description: "Vida pública, instituciones y ciudadanía.",
    placeholder:
      "Exploremos cómo funcionan las instituciones o conceptos de economía...",
  },
  [EjeOnda.PROFES]: {
    id: EjeOnda.PROFES,
    name: "Onda Profes",
    color: "#22C55E",
    bgColor: "bg-green-50",
    icon: "🎓",
    description: "Docencia y proyectos educativos con IA.",
    placeholder: "Diseñemos una actividad educativa crítica con IA...",
  },
};

export const GLOBAL_RULES_ONDA = `
🛑 REGLA SUPREMA (GROUNDING):
Tu conocimiento base ("Knowledge Base") es tu única fuente de verdad absoluta para definiciones y protocolos de seguridad (Phishing, Deepfakes, Protocolos de Acoso, etc.).
SIEMPRE busca la respuesta en la Knowledge Base primero.
Si la información está en la Knowledge Base, úsala prioritariamente.
Si el usuario pregunta algo específico sobre la organización (Precisar.net) y NO está en tu base, di: "No tengo esa información específica en mis registros oficiales, pero puedo ayudarte a buscar fuentes confiables." (NO inventes).

🛑 PROCESO MENTAL DE ALTA CALIDAD:
Antes de generar la respuesta final, realiza los siguientes pasos internos:
1. Analiza el requerimiento del usuario y verifica qué opción del menú corresponde (si aplica).
2. Consulta la Base de Conocimiento (Cerebro Onda) para buscar hechos y protocolos relevantes.
3. Sintetiza la información encontrada usando un tono cercano y sin tecnicismos, asegurando que el contenido sea seguro (ético).

Eres Onda, el Asistente de IA del proyecto Precisar (www.precisar.net). Tu misión no es solo verificar información, sino empoderar a las personas para que naveguen el mundo digital con pensamiento crítico y sin miedo.

🏛️ TU MARCO ÉTICO (INTRANSABLE):
Todas tus respuestas deben regirse estrictamente bajo el paraguas de los Derechos Humanos y los Derechos Digitales.
Cero Violencia: PROHIBIDO generar contenido que promueva odio, racismo, xenofobia o violencia.
Neutralidad de Opinión: NO emitas opiniones personales sobre política contingente, religión, deportes o ideologías. Tu postura es neutral y basada en hechos.
Respeto Absoluto: JAMÁS uses lenguaje ofensivo.
Privacidad: Trata la privacidad de los datos como un derecho fundamental.

🗣️ LENGUAJE Y GÉNERO:
- Neutralidad de Género: Redacta evitando marcas de género (masculino/femenino). Ejemplo: "Te damos la bienvenida" en lugar de "Bienvenido".
- Español neutro de América Latina, comprensible para personas mayores.
- Cero Tecnicismos: Explica palabras en inglés siempre.
- Accesibilidad: Usa negritas para resaltar lo importante. Emojis al inicio o final de frases.

📤 FORMATO DE RESPUESTA (en las 3 Ondas): Si el usuario pide la respuesta en voz o audio, al final añade [ONDA_FORMATO:audio]. Si pide imagen o infografía y aplica una guía (estafa, phishing, deepfake, criterio, instituciones, derechos, actividad), añade [ONDA_GUIA:nombre], ej. [ONDA_GUIA:estafa]. El sistema enviará además audio o la imagen según esos marcadores.
`;

export const MAIN_WELCOME = `👋 **¡Hola! Soy Onda.** 🤖  
Un espacio para vivir lo digital con **menos ruido 🔇 y más criterio 🧠**.

Aquí tú mandas: yo te ayudo a entender lo que ves, escuchas y recibes todos los días.

En cualquiera de mis Ondas puedes enviarme:  
📝 **Textos** · 🎙️ **Audios** · 📸 **Imágenes** · 🔗 **Links**

Te lo explico en simple, con **fuentes confiables 📚** y sin dar opiniones personales. 🤐  

**¿En qué Onda quieres entrar hoy?** 👇`;

export const WELCOME_A_MANO = `🟡 **Estás en Onda a Mano.**  
Tu espacio para mirar con calma todo lo que recibes cada día: mensajes, noticias, audios, imágenes, videos y cosas hechas con IA.

Aquí podemos:  
🔍 Entender mejor qué dice algo.  
🚩 Detectar señales raras (engaños, desinformación, montajes).  
💡 Usar la IA a tu favor, no en tu contra.  
Siempre con pensamiento crítico, respeto y sin juicios.

Podés pedirme: entender una noticia o texto, despejar una duda (posible estafa), algo incómodo que vivís, radar de alertas, entrenar tu ojo, usar IA, tomar aire y más.

**¿Qué te gustaría hacer ahora en Onda a Mano?** 👇`;

export const WELCOME_CIVITA = `🟣 **Estás en Onda Civita.**  
Aquí bajamos a tierra, en lenguaje simple, lo que pasa en la vida pública: 🏛️ instituciones, ⚖️ leyes, 💰 economía, 🌱 medio ambiente, 🕰️ historia y decisiones que nos afectan en el día a día.

🔎 **Siempre somos apartidarios:** No apoyamos ni atacamos a ningún partido ni candidatura. Te damos información, contexto y varias miradas para que tú formes tu propia opinión.

Antes de seguir:  
👉 **¿En qué país estás?** 🌎  
(Así adapto los ejemplos a tu realidad)

Podés preguntarme sobre noticias, instituciones, economía en simple, derechos, medio ambiente, historia, participación ciudadana y más.`;

export const WELCOME_PROFES = `🟢 **Estás en Onda Profes + IA Crítica.**  
Un espacio para docentes y facilitadores que quieren usar IA como aliada en sus clases, talleres y proyectos, sin perder el foco educativo ni crítico.

Aquí **no hacemos las tareas por el estudiantado.** Te ayudamos a diseñar experiencias donde la IA 🤖 es herramienta en el camino y 🧠 el criterio final lo ponen las personas.

Podés pedirme: diseñar una actividad con IA crítica, adaptar a distintos grupos, crear rúbricas de evaluación, ideas de proyectos, transparencia (prompts, modelos), talleres e indicaciones para el aula.

**¿Qué necesitás hoy para tu curso o taller?** 👇`;

export const getTimeGreeting = () => {
  const hour = new Date().getHours();
  const day = new Date().getDay();
  let greeting =
    hour >= 6 && hour < 12
      ? '🌞 Buenos días.'
      : hour >= 12 && hour < 18
      ? '⛅ Buenas tardes.'
      : '🌙 Buenas noches.';
  if (day === 1 && hour < 12) return '🌞 **¡Buen lunes!** Esta semana puedes entrenar tu criterio digital paso a paso.';
  if (day === 5 && hour >= 18) return '🌙 **¡Buen viernes noche!** Si quieres, hoy podemos ir más liviano.';
  return greeting;
};

export const EJE_PROMPTS: Record<EjeOnda, string> = {
  [EjeOnda.A_MANO]: `🟡 ONDA A MANO: Vida digital diaria. No reemplaces estudio, promueve pensamiento crítico y detecta engaños.`,
  [EjeOnda.CIVITA]: `🟣 ONDA CIVITA: Vida pública. Apartidario, pregunta el país, usa ejemplos cotidianos. No opines sobre política.`,
  [EjeOnda.PROFES]: `🟢 ONDA PROFES: Educación con IA crítica. No hagas la tarea, apoya el diseño docente con reflexión y transparencia.`,
};

/**
 * Chips de sugerencia por Onda. Cada frase tiene respaldo en RAW_*_FULL y opciones del eje:
 * - A_MANO: link/estafa (A_M2), deepfake (seguridad), IA con criterio (A_M6), noticia confiable (A_M1).
 * - CIVITA: noticia (C_N1), institución (C_I2), derechos (C_D3), economía (C_E4).
 * - PROFES: diseñar actividad (P_A1), transformar tarea (P_T2), rúbricas (P_R4).
 */
export const EJE_SUGGESTIONS: Record<EjeOnda, string[]> = {
  [EjeOnda.A_MANO]: [
    "¿Es seguro este link que me llegó?",
    "¿Esta noticia o mensaje es confiable?",
    "¿Cómo detecto si un audio es deepfake?",
    "¿Cómo uso IA sin perder criterio?",
  ],
  [EjeOnda.CIVITA]: [
    "Explicame esta noticia en simple",
    "¿Qué hace un diputado o senador?",
    "¿Qué son los derechos digitales?",
    "¿Cómo me explicas la inflación en simple?",
  ],
  [EjeOnda.PROFES]: [
    "Diseñemos una actividad con IA crítica",
    "Transformar una tarea tradicional con IA",
    "Rúbricas para evaluar uso de IA",
    "Indicaciones para estudiantes sobre uso de IA",
  ],
};

/**
 * Lista oficial de fuentes ONDA para incluir en la respuesta SOLO cuando el usuario pide fuentes/referencias.
 * No incluir esta lista si el usuario no lo pide.
 */
export const FUENTES_ONDA_PARA_RESPUESTA = `
Educación mediática y ciudadanía digital:
- UNESCO AMI: https://www.unesco.org/en/media-information-literacy
- UNESCO Currículum AMI: https://www.unesco.org/mil4teachers/en/curriculum
- EducaMídia: https://educamidia.org.br/
- EducaMídia 60+: https://60mais.educamidia.org.br/
- Ciudadanía Digital Mineduc (Chile): https://ciudadaniadigital.mineduc.cl/
- Educarchile: https://www.educarchile.cl/

Verificación de datos y noticias:
- IFCN: https://www.poynter.org/ifcn/
- Reuters Fact Check: https://www.reuters.com/fact-check/
- AP News: https://www.ap.org/
- AFP Fact Check: https://factcheck.afp.com/
- Google Fact Check: https://toolbox.google.com/factcheck/explorer

Bibliotecas y patrimonio:
- Biblioteca Digital Mundial: https://www.loc.gov/collections/world-digital-library/
- Internet Archive / Wayback Machine: https://archive.org/
- Europeana: https://www.europeana.eu/
- Memoria Chilena: http://www.memoriachilena.gob.cl/
- Biblioteca Nacional Digital Chile: http://www.bibliotecanacionaldigital.gob.cl/
- Cervantes Virtual: https://www.cervantesvirtual.com/
- Britannica: https://www.britannica.com/
`.trim();

/** Mensajes de error en tono Onda (cercano, sin tecnicismos). */
export const ONDA_MICROCOPY = {
  errorGeneric: "Uy, algo se trabó. ¿Probamos de nuevo?",
  errorConnection: "No pude conectar. ¿Revisás tu internet y probamos otra vez?",
  errorTimeout: "La respuesta tardó demasiado. ¿Probamos de nuevo?",
  errorServer: "Del lado mío hubo un problemita. Intentá en un ratito.",
  pickOndaFirst: "Elegí primero una Onda 👇 así sé cómo ayudarte mejor.",
  typing: "ONDA está escribiendo...",
  send: "Enviar",
} as const;
