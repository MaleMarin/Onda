/**
 * Single source of truth: each menu item has EXACTLY 3 questions.
 * When the user clicks an option, the bot shows only these 3 questions as a friendly message.
 * Language: neutral Spanish (tú, aquí), warm and direct. Not Argentine (no vos, no voseo).
 */

export type MenuQuestionTriple = [string, string, string];

export const MENU_QUESTIONS: Record<string, MenuQuestionTriple> = {
  // ═══════════════════════════════ ONDA A MANO ═══════════════════════════════
  A_M1: [
    "¿Tienes el texto o la noticia a mano? Puedes pegarlo aquí directamente.",
    "¿Qué es lo que no te quedó claro — el tema en sí, el contexto, o las palabras que usa?",
    "¿Quieres que te lo explique simple, o prefieres una versión más completa con fuentes?",
  ],
  A_M2: [
    "¿Qué fue lo que te llegó o te dijeron? Puedes contármelo o pegarlo tal cual.",
    "¿Te lo mandaron por WhatsApp, email, redes sociales, o fue en persona?",
    "¿Ya hiciste algo al respecto — respondiste, hiciste clic en algún link, diste datos?",
  ],
  A_M3: [
    "¿Quieres contarme qué está pasando, o prefieres que te haga algunas preguntas para entender mejor?",
    "¿Esto está pasando en el trabajo, en lo personal, o en el mundo digital?",
    "¿Buscas entender qué está pasando, o encontrar qué hacer?",
  ],
  A_M4: [
    "¿Sobre qué temas quieres estar alerta — salud, dinero, tecnología, política, seguridad digital?",
    "¿Hay algo puntual que te preocupa últimamente o que estás siguiendo de cerca?",
    "¿Prefieres que te dé contexto de por qué algo es importante, o solo el dato concreto?",
  ],
  A_M5: [
    "¿Quieres entrenar tu ojo para detectar noticias falsas, manipulación visual, o discursos engañosos?",
    "¿Prefieres trabajar con ejemplos reales o que te explique primero cómo funciona cada trampa?",
    "¿Empezamos con algo que hayas visto últimamente, o quieres que yo elija un caso para analizar juntos?",
  ],
  A_M6: [
    "¿Eres principiante o ya usas alguna herramienta de IA y quieres ir más lejos?",
    "¿Para qué quieres usar IA — trabajo, estudio, creatividad, o en tu vida diaria?",
    "¿Prefieres aprender probando en vivo conmigo, o primero que te explique cómo funciona?",
  ],
  A_M7: [
    "¿Qué formato prefieres — un artículo, un documental, un podcast, un libro, o una cuenta que seguir?",
    "¿Sobre qué temas te interesa descubrir algo nuevo?",
    "¿Quieres algo que te haga pensar, que te inspire, o que simplemente disfrutes?",
  ],
  A_M8: [
    "¿Qué te llama más ahora mismo — una película, una canción, un artista, o una obra de arte?",
    "¿Buscas algo nuevo que descubrir o prefieres profundizar en algo que ya te gusta?",
    "¿Quieres que conversemos sobre eso o prefieres que te recomiende algo directamente?",
  ],
  A_M9: [
    "¿Sobre qué tema quieres dar tu opinión — algo que leíste, algo que viviste, o algo que te molesta?",
    "¿Quieres que yo también dé mi punto de vista, o prefieres que te ayude a ordenar el tuyo?",
    "¿Te interesa saber qué piensan otras posturas sobre lo mismo?",
  ],
  A_M10: [
    "¿A quién quieres compartirle Onda — un familiar, un amigo, o alguien en particular?",
    "¿Qué fue lo que más te sirvió de Onda para recomendárselo?",
    "¿Quieres que te ayude a escribir un mensaje para presentárselo de forma natural?",
  ],

  // ═══════════════════════════════ ONDA CIVITA ═══════════════════════════════
  C_N1: [
    "¿Tienes una noticia o decisión concreta que quieres entender, o buscas contexto sobre un tema en general?",
    "¿Qué es lo que más te cuesta entender — quién decide, por qué lo hacen, o qué impacto tiene?",
    "¿Quieres una explicación simple o prefieres entender también el trasfondo político o histórico?",
  ],
  C_I2: [
    "¿Hay una institución o cargo específico que quieres entender, o no sabes por dónde empezar?",
    "¿Lo que más te interesa es saber qué hace, quién manda, o cómo se relaciona con tu vida diaria?",
    "¿Quieres que te lo explique desde cero o ya tienes algo de base?",
  ],
  C_D3: [
    "¿Hay algo concreto que te pasó o que quieres saber si es legal o justo?",
    "¿El tema es laboral, familiar, de consumo, o algo que viste en las noticias?",
    "¿Buscas entender la regla general o quieres saber qué puedes hacer tú en tu situación?",
  ],
  C_E4: [
    "¿Hay un concepto, noticia económica o término que quieres entender?",
    "¿Te interesa más cómo te afecta a ti directamente, o entender cómo funciona el sistema?",
    "¿Prefieres ejemplos concretos de la vida diaria o una explicación más general?",
  ],
  C_M5: [
    "¿Hay un tema ambiental concreto que te preocupa o quieres entender mejor?",
    "¿Te interesa lo que pasa a nivel local, nacional o global?",
    "¿Buscas entender el problema, conocer qué se está haciendo, o saber qué puedes hacer tú?",
  ],
  C_H6: [
    "¿Hay algo que está pasando hoy que quieres entender mejor con contexto histórico?",
    "¿Hay un período, evento o figura histórica que te interesa explorar?",
    "¿Prefieres una línea de tiempo simple o que conversemos sobre causas y consecuencias?",
  ],
  C_P7: [
    "¿Buscas participar en algo concreto — votar, organizarte, reclamar — o quieres saber qué opciones existen?",
    "¿El contexto es tu barrio, tu trabajo, tu ciudad, o el país en general?",
    "¿Quieres entender cómo funciona el proceso o directamente saber qué puedes hacer hoy?",
  ],
  C_C8: [
    "¿Hay una situación concreta que quieres entender o manejar mejor?",
    "¿El contexto es en el espacio público, en redes sociales, o en un grupo cercano?",
    "¿Buscas entender qué está pasando o encontrar cómo responder?",
  ],
  C_E9: [
    "¿Quieres ver ejemplos de temas que Onda puede ayudarte a entender?",
    "¿Te interesa más el mundo público, el digital, o tu vida cotidiana?",
    "¿Arrancamos con un tema al azar o prefieres elegir el área?",
  ],
  C_T10: [
    "¿Hay una tecnología, app, o tendencia concreta que quieres entender?",
    "¿Te interesa más cómo usarla, cómo funciona, o qué impacto tiene en la sociedad?",
    "¿Buscas algo práctico para tu vida diaria o quieres entender el panorama general?",
  ],

  // ═══════════════════════════════ ONDA PROFES ═══════════════════════════════
  P_A1: [
    "¿Para qué nivel o curso es la actividad — básica, media, superior, o formación de adultos?",
    "¿Qué habilidad quieres trabajar — análisis, debate, verificación de información, o pensamiento crítico?",
    "¿Tienes un tema o asignatura en mente, o quieres que te proponga algo?",
  ],
  P_T2: [
    "¿Cuál es la tarea que quieres transformar? Puedes describirla o pegarla aquí.",
    "¿Qué quieres que cambie — que sea más interactiva, que incluya IA, o que fomente el pensamiento propio?",
    "¿El objetivo es que los estudiantes usen IA como herramienta, o que aprendan a cuestionarla?",
  ],
  P_E3: [
    "¿Para qué nivel necesitas ejemplos — básica, media, superior, o educación no formal?",
    "¿Qué asignatura o área te interesa más?",
    "¿Buscas ejemplos de actividades, de preguntas para el aula, o de proyectos completos?",
  ],
  P_R4: [
    "¿Para qué actividad o habilidad necesitas la rúbrica?",
    "¿El foco es evaluar el uso de IA, el pensamiento crítico, o el resultado final del estudiante?",
    "¿Quieres una rúbrica simple con pocos criterios o una más detallada?",
  ],
  P_I5: [
    "¿Para qué actividad necesitas las indicaciones?",
    "¿El grupo ya tiene experiencia usando IA o es primera vez?",
    "¿Quieres indicaciones que guíen el proceso paso a paso, o que dejen espacio para que exploren?",
  ],
  P_T6: [
    "¿Cuántas personas tiene el grupo y cuál es su perfil — estudiantes, docentes, apoderados, comunidad?",
    "¿El taller es presencial, online, o mixto?",
    "¿Qué quieres que el grupo se lleve — una habilidad concreta, una reflexión, o una experiencia práctica?",
  ],
  P_X7: [
    "¿Para qué edad o nivel es el curso?",
    "¿Quieres explicar qué es la IA, cómo usarla bien, o los riesgos que tiene?",
    "¿Prefieres una explicación para que tú la adaptes, o una actividad lista para hacer con el curso?",
  ],
  P_L8: [
    "¿Cuánto tiempo dura el proyecto — semanas, un semestre, o todo el año?",
    "¿El proyecto lo hacen los estudiantes solos, en grupos, o junto contigo?",
    "¿Qué quieres que los estudiantes logren al final — un producto, una investigación, o una presentación?",
  ],
  P_S9: [
    "¿Buscas recursos para usar en el aula, para tu formación docente, o para compartir con estudiantes?",
    "¿Qué formato prefieres — guías, videos, artículos, herramientas, o ejemplos prácticos?",
    "¿Hay algún tema específico sobre IA y educación que te interese explorar?",
  ],
};

/**
 * Formats the 3 questions as a single friendly bot message (not a form).
 * User can answer one or all at once in free text.
 */
export function formatMenuIntro(optionId: string): string | null {
  const q = MENU_QUESTIONS[optionId];
  if (!q || q.length !== 3) return null;
  return q.map((line, i) => `${i + 1}. ${line}`).join("\n\n");
}
