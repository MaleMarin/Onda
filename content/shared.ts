import { EjeOnda, type EjeConfig, type MenuOption } from "./types";

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
Tu espacio para ver con calma lo que te llega cada día: mensajes, noticias, videos, audios y todo lo que aparece en tus pantallas.

Aquí podemos:  
🔍 Mirar juntos lo que te llegó y entenderlo mejor.  
🚨 Detectar señales de engaño o manipulación.  
🤖🧠 Usar IA como apoyo para estudiar, trabajar o crear, sin perder tu propio criterio.

**¿Qué quieres hacer ahora en Onda a Mano?** 👇`;

export const WELCOME_CIVITA = `🟣 **Estás en Onda Civita.**  
Aquí aterrizamos en simple lo que pasa en tu país y tu barrio: 🏛️ instituciones, ⚖️ leyes, 💰 economía, 🌱 medio ambiente, 🕰️ historia y actualidad política.

🔎 **Siempre somos apartidarios:** No apoyamos ni atacamos a ningún partido. Te damos información, contexto y varias miradas para que tú formes tu propia opinión.

Antes de seguir:  
👉 **¿En qué país estás?** 🌎  
(Así adapto los ejemplos a tu realidad)`;

export const WELCOME_PROFES = `🟢 **Estás en Onda Profes.**  
Un espacio para **docentes y facilitadores** que quieren trabajar con IA y mundo digital de forma crítica, creativa y responsable.

Aquí Onda te acompaña a:  
🧩 Diseñar actividades donde el estudiantado use IA con transparencia.  
🔍 Incluir siempre pensamiento crítico y comparación de fuentes.  
🎓 Adaptar ideas a distintos niveles educativos y edades.

Onda Profes **no hace la tarea por nadie:** te ayuda a armar la experiencia, las preguntas, las rúbricas y los cuidados.

**¿Qué quieres hacer ahora en Onda Profes?** 👇`;

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

/** Opciones del menú Onda A Mano (10 opciones + submenú IA) */
export const A_MANO_OPTIONS: MenuOption[] = [
  { id: "A_M1", label: "🔍 Entender una noticia o un texto", intro: "Puedes enviarme una noticia, captura, texto, link o audio.\nLo reviso y te devuelvo una explicación clara, sin tecnicismos y sin opiniones personales.\n\n**Envíame ahora lo que quieres entender mejor.** 📎", internalPrompt: "Explica el contenido enviado en lenguaje simple, párrafos cortos, con 2-3 puntos clave. No opines, solo entrega contexto y posibles riesgos." },
  { id: "A_M2", label: "🔥 Despejar una duda (posible estafa)", intro: "Si algo te dejó con una sensación rara, puedes enviarlo: 📸 captura, 📝 texto, 🎙️ audio o 🔗 link.\nLo revisamos buscando señales típicas de engaño.\n\n**Envíame ahora eso que te genera duda.** 📎", internalPrompt: "Busca señales de estafa (urgencia, premios, datos sensibles). Entrega análisis y señales de alerta claras." },
  { id: "A_M3", label: "✋ Estoy viviendo algo incómodo", intro: "Gracias por confiar en este espacio. 🙏\nPuedes contar con tus palabras lo que pasó o enviar una captura, audio o texto.\n\n¿Ocurrió en una red social, chat, juego online u otro lugar?", internalPrompt: "Responde con empatía absoluta. Sugiere opciones de protección (bloquear, silenciar, denunciar) según la plataforma." },
  { id: "A_M4", label: "🔔 Radar de alertas", intro: "Aquí juntamos un radar de alertas digitales recientes:\n• Estafas que se están moviendo.\n• Contenidos con IA que se están usando para engañar.\n• Tendencias que buscan manipular emociones u opiniones.\n\n**¿Quieres ver ahora un resumen de alertas?** 👀", internalPrompt: "Genera 3 alertas digitales realistas y recientes sobre seguridad digital." },
  { id: "A_M5", label: "🎮 Entrenar mi ojo", intro: "Te propongo un mini-reto digital. 👀\nVeremos un ejemplo y tendrás que encontrar lo que no cuadra.\n\n**¿Quieres empezar con el primer reto?**", internalPrompt: "Presenta un caso de desinformación/montaje y pide al usuario encontrar el error. Luego explica." },
  { id: "A_M6", label: "🤖 Aprender a usar IA", intro: "La IA puede ser una buena herramienta si la usas con criterio. 🤖🧠\nNo está para hacer todo por ti, sino para acompañarte.\n\n**¿En qué quieres usarla hoy?** 👇", isSubmenu: true },
  { id: "A_M7", label: "🎧 Descubrir algo que valga la pena", intro: "Dime cómo estás hoy:\n• ¿Algo tranquilo?\n• ¿Algo motivante?\n• ¿Algo profundo?\n• ¿Algo que te sorprenda?\n\nSegún eso, puedo sugerir música, cine, podcasts o lecturas que informen e inspiren. 🙂", internalPrompt: "Recomienda música, cine, podcasts o libros que inspiren y ayuden a entrenar el criterio." },
  { id: "A_M8", label: "🍃 Tomar aire", intro: "A veces lo mejor es una mini-pausa digital.\nTe propongo:\n1️⃣ Deja el celular sobre la mesa.\n2️⃣ Respira profundo 3 veces.\n3️⃣ Mira algo que no sea la pantalla por unos segundos.\n\nCuando quieras, puedes volver al menú y seguir conversando. 💛", internalPrompt: "Guía un ejercicio breve de respiración y bienestar digital." },
  { id: "A_M9", label: "💬 Dar mi opinión", intro: "Tu opinión también construye este espacio. 🙌\nHoy la pregunta es:\n\n**¿Qué es lo que más te preocupa o incomoda de lo digital hoy?**\n(Puede ser redes, IA, noticias, videojuegos, lo que quieras)", internalPrompt: "Escucha la opinión del usuario y ofrece herramientas o validación empática." },
  { id: "A_M10", label: "✨ Compartir Onda", intro: "Si quieres invitar a alguien más, aquí tienes un mensaje listo para reenviar:\n\n> \"Prueba Onda, un asistente que te ayuda a moverte con más criterio digital. Útil, simple y cero ruido.\"\n\n¿Quieres que lo adapte para alguien en especial? 📲", internalPrompt: "Facilita el compartir el bot con otros." },
];

/** Submenú de IA dentro de Onda A Mano (opción A_M6) */
export const IA_SUBMENU_OPTIONS: MenuOption[] = [
  { id: "IA_ST", label: "📚 IA para estudiar y aprender", intro: "La IA puede ayudarte a entender textos difíciles, resumir ideas y generar preguntas de práctica.\nNo reemplaza tu esfuerzo: es un apoyo.\n\n¿Sobre qué tema quieres practicar?", internalPrompt: "Proporciona 3 ejemplos de prompts para estudiar: Entender, Resumir y Practicar. Recuerda que la nota depende de la persona." },
  { id: "IA_TR", label: "🧑‍💼 IA para trabajar y organizar", intro: "La IA puede ayudarte a ordenar tareas, redactar borradores y planificar tu semana.\nAl final, tú decides qué se envía o se usa.\n\n¿En qué quieres que te ayude?", internalPrompt: "Proporciona 3 ejemplos de prompts para trabajo: Ordenar tareas, Borradores de correo y Planificar semana." },
  { id: "IA_CR", label: "🎨 IA para creatividad", intro: "La IA también puede ser un compañero creativo: ideas, títulos, estilos, historias.\nTu voz y tu mirada son lo principal.\n\n¿Qué quieres crear hoy?", internalPrompt: "Proporciona 3 prompts creativos éticos. Recalca que la autoría humana es lo central." },
  { id: "IA_DD", label: "🧩 IA en el día a día", intro: "En el día a día, la IA puede ayudarte a entender formularios, comparar opciones y organizar información.\n\n¿Sobre qué necesitas ayuda?", internalPrompt: "Proporciona 3 prompts para la vida cotidiana: entender documentos, comparar opciones, organizar info." },
  { id: "IA_IC", label: "🧾 Indicaciones para usar IA con criterio", intro: "La idea es que la IA sea herramienta en medio del proceso, no el principio ni el final.\n\n1️⃣ Tú formulas la pregunta.\n2️⃣ La IA entrega ideas.\n3️⃣ Tú comparas, verificas y decides.\n\n¿Quieres saber más sobre cómo usar IA con sentido crítico?", internalPrompt: "Explica las reglas de oro para usar IA con responsabilidad: comparar fuentes, transparencia de prompts, criterio final humano." },
];

/** Opciones del menú Onda Civita (9 opciones + volver) */
export const CIVITA_OPTIONS: MenuOption[] = [
  { id: "C_N1", label: "📰 Entender una noticia o decisión pública", intro: "Puedes enviarme una noticia, captura, texto, imagen o link sobre algo público.\nLa idea es bajarla a tierra: qué significa, a quién afecta y qué dudas razonables puedes tener.\n\n**¿Quieres enviarla ahora?**", internalPrompt: "Explica la noticia en simple: qué significa, a quién afecta y qué dudas razonables tener. Sé apartidario." },
  { id: "C_I2", label: "🏛️ Entender una institución o cargo", intro: "Puedes preguntarme por una institución, cargo o poder del Estado de tu país.\nTe explicaré en simple: qué hace, cómo se organiza y qué límites tiene.\n\n**¿Qué institución o cargo quieres entender mejor?**", internalPrompt: "Explica en simple qué es, qué funciones tiene y por qué importa esa institución. Adaptado al país del usuario." },
  { id: "C_D3", label: "📜 Mis derechos y reglas del juego", intro: "Podemos conversar sobre derechos fundamentales, servicios básicos, reglas de convivencia y qué hacer cuando sientes que algo es injusto.\n\n**¿Qué te gustaría entender mejor?**", internalPrompt: "Explica derechos y reglas del juego público basándote en fuentes oficiales. Sin asesoría legal personalizada." },
  { id: "C_E4", label: "💰 Economía en simple", intro: "Inflación, impuestos, empleo, presupuesto del Estado, pensiones.\nLa idea es entender los conceptos básicos y cómo afectan la vida diaria.\n\n**¿Qué tema económico quieres entender mejor?**", internalPrompt: "Aterriza conceptos económicos a la vida cotidiana. Sin consejos de inversión." },
  { id: "C_M5", label: "🌱 Medio ambiente y territorio", intro: "Agua, energía, contaminación, cambio climático, zonas protegidas.\nLa idea es ayudarte a entender qué se está discutiendo y cómo se conecta con tu entorno.\n\n**¿Qué tema ambiental te interesa?**", internalPrompt: "Explica temas ambientales conectándolos con derechos y territorio." },
  { id: "C_H6", label: "🕰️ Historia y contexto", intro: "A veces para entender el presente hay que mirar un poco hacia atrás.\nPuedes preguntar por fechas clave, procesos históricos o hechos que se recuerdan distinto.\n\n**¿Qué momento histórico quieres entender mejor?**", internalPrompt: "Da una versión breve y en simple del contexto histórico de un tema actual." },
  { id: "C_P7", label: "🗳️ Formas de participar", intro: "Cabildos, consultas, organizaciones sociales, juntas de vecinos, reclamos formales.\nPuedo ayudarte a entender qué mecanismos existen en tu país.\n\n**¿Qué tipo de participación te interesa conocer?**", internalPrompt: "Explica mecanismos de participación ciudadana reales del país del usuario." },
  { id: "C_C8", label: "🤝 Convivencia y respeto", intro: "Aquí hablamos de cómo convivir con ideas diferentes, en la vida diaria y en redes:\ncómo disentir sin descalificar, qué es un discurso respetuoso y qué hacer cuando todo se pone tenso.\n\n**¿Quieres contarme una situación?**", internalPrompt: "Ofrece estrategias para disentir sin descalificar y cuidar el espacio común." },
  { id: "C_E9", label: "📚 Ver ejemplos de temas", intro: "En Onda Civita puedes preguntar sobre:\n• Cómo funciona el congreso en tu país\n• Qué significa una nueva ley\n• Qué es la inflación\n• Conflictos ambientales de tu zona\n• Diferencias entre poder ejecutivo, legislativo y judicial\n• Cómo participar en decisiones locales\n\nDime simplemente \"Tengo este tema\" y lo vemos en simple.", internalPrompt: "Muestra ejemplos concretos de preguntas y temas que el usuario puede explorar en Civita." },
];

/** Opciones del menú Onda Profes (9 opciones + volver) */
export const PROFES_OPTIONS: MenuOption[] = [
  { id: "P_A1", label: "🧩 Diseñar actividad con IA crítica", intro: "Vamos a armar una actividad donde el estudiantado use IA con transparencia.\nPara empezar, cuéntame:\n• **Nivel** del grupo (edad aproximada)\n• **Asignatura** o contexto\n• **Tiempo** disponible (una clase, varias sesiones)", internalPrompt: "Propón una estructura de actividad: Preguntas de inicio, Uso de IA (comparar, registrar prompts) y Cierre crítico." },
  { id: "P_T2", label: "✏️ Transformar tarea tradicional", intro: "Si tienes una tarea tradicional (resumen, ensayo, presentación, informe), podemos transformarla para incluir IA + pensamiento crítico.\n\n**Copia aquí el enunciado actual o descríbelo en pocas líneas.**", internalPrompt: "Transforma una tarea tradicional en una experiencia de 3 partes (Antes de IA, Con IA, Análisis crítico)." },
  { id: "P_E3", label: "🎓 Ejemplos por nivel educativo", intro: "Dime el nivel y la asignatura:\n• Educación básica\n• Educación media\n• Educación superior\n• Personas adultas / adultas mayores\n• Formación técnica / oficios", internalPrompt: "Propón 2-3 ejemplos de actividades adaptadas al nivel y asignatura, donde la IA sea herramienta y la reflexión sea humana." },
  { id: "P_R4", label: "📏 Rúbricas y criterios de evaluación", intro: "Podemos armar criterios de evaluación que incluyan el uso responsable de IA:\n• Claridad al documentar qué IA se usó\n• Comparar respuestas de distintas fuentes\n• Análisis crítico de errores y sesgos\n• Aporte propio\n\n**¿Qué tipo de trabajo quieres evaluar?**", internalPrompt: "Construye una rúbrica con descriptores para evaluar el uso responsable de IA (Excelente, Adecuado, En desarrollo)." },
  { id: "P_I5", label: "📢 Indicaciones para estudiantes", intro: "Podemos crear un texto claro para estudiantes donde se explique:\n• Cuándo y cómo pueden usar IA\n• Qué deben registrar (prompts, herramientas)\n• Qué está permitido y qué no\n• Cómo se valorará el uso crítico\n\n**¿Para qué nivel o asignatura lo necesitas?**", internalPrompt: "Genera un texto de indicaciones para el aula sobre el uso honesto y crítico de la IA." },
  { id: "P_T6", label: "🧑‍🏫 Talleres para grupos diversos", intro: "Si trabajas con organizaciones, bibliotecas, municipios o personas mayores, podemos diseñar talleres.\nCuéntame:\n• **Tipo de grupo**\n• **Duración** aproximada\n• **Objetivo** principal", internalPrompt: "Propón un guion de taller (Inicio, Parte central, Cierre) adaptado al grupo." },
  { id: "P_X7", label: "🤖 Explicar IA a un curso", intro: "Podemos preparar una explicación corta y clara sobre:\n• Qué es la IA\n• Qué puede hacer y qué no\n• Cómo se conecta con noticias falsas y deepfakes\n\n**¿Para qué edad o nivel es esta explicación?**", internalPrompt: "Prepara una explicación corta, metáforas y 3 preguntas para conversar con el grupo." },
  { id: "P_L8", label: "📂 Proyectos largos con IA", intro: "Si quieres ir más allá de una actividad puntual, podemos diseñar un proyecto de varias semanas.\nCuéntame:\n• **Nivel** del grupo\n• **Duración** (ej: 4, 6, 8 semanas)\n• **Tema** general", internalPrompt: "Diseña un proyecto de varias semanas (Explorar, Investigar, Analizar, Crear, Compartir)." },
  { id: "P_S9", label: "📚 Recursos sugeridos", intro: "Puedo sugerirte tipos de recursos útiles:\n• Centros de recursos educativos de tu país\n• Organismos de educación y derechos humanos\n• Herramientas de IA accesibles\n• Materiales para personas adultas y mayores\n\n**¿En qué país y nivel trabajas?**", internalPrompt: "Sugiere tipos de fuentes y recursos confiables para docentes." },
];

/** Mapa de opciones de menú por Onda */
export const EJE_MENU_OPTIONS: Record<EjeOnda, MenuOption[]> = {
  [EjeOnda.A_MANO]: A_MANO_OPTIONS,
  [EjeOnda.CIVITA]: CIVITA_OPTIONS,
  [EjeOnda.PROFES]: PROFES_OPTIONS,
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
