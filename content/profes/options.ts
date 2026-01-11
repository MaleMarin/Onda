import type { MenuOption } from '../types';

export const PROFES_OPTIONS: MenuOption[] = [
  { id: 'P_A1', label: '🧩 Diseñar actividad con IA crítica', intro: 'Vamos a diseñar una actividad pedagógica. Cuéntame: ¿Nivel del grupo, asignatura y tiempo disponible?', internalPrompt: 'Propón una estructura de actividad: Inicio, Uso de IA (Comparar/Registrar) y Cierre crítico.' },
  { id: 'P_T2', label: '✏️ Transformar tarea tradicional', intro: 'Copia aquí el enunciado de tu tarea actual y la transformaremos para incluir IA + pensamiento crítico.', internalPrompt: 'Transforma una tarea tradicional en una experiencia de 3 partes (Antes, Con IA, Análisis crítico).' },
  { id: 'P_E3', label: '🎓 Ejemplos por nivel educativo', intro: 'Dime el nivel: Básica, Media, Superior o Personas Adultas. ¿Qué asignatura te interesa?', internalPrompt: 'Propón 2 ejemplos de actividades adaptadas al nivel y asignatura.' },
  { id: 'P_R4', label: '📏 Rúbricas y criterios', intro: 'Ayúdame a saber qué actividad quieres evaluar y armaremos criterios de transparencia y análisis crítico.', internalPrompt: 'Construye una rúbrica con descriptores para evaluar el uso responsable de IA.' },
  { id: 'P_I5', label: '📢 Indicaciones para estudiantes', intro: 'Podemos crear un mensaje claro para tus estudiantes sobre qué está permitido y qué no con la IA.', internalPrompt: 'Genera un texto de indicaciones para el aula sobre el uso honesto y crítico de la IA.' },
  { id: 'P_T6', label: '🧑‍🏫 Talleres para grupos diversos', intro: '¿Tipo de grupo, duración y objetivo? Diseñaremos un taller para facilitar el uso de la IA.', internalPrompt: 'Propón un guion de taller (Inicio, Parte central, Cierre).' },
  { id: 'P_X7', label: '🤖 Explicar IA a un curso', intro: '¿Para qué edad es la explicación? Prepararemos algo sobre qué es la IA y cómo se conecta con desinformación.', internalPrompt: 'Prepara una explicación corta, metáforas y 3 preguntas para conversar con el grupo.' },
  { id: 'P_L8', label: '📂 Proyectos largos con IA', intro: 'Cuéntame nivel, duración y tema. Diseñaremos un proyecto de varias fases.', internalPrompt: 'Diseña un proyecto de varias semanas (Explorar, Investigar, Analizar, Crear, Compartir).' },
  { id: 'P_S9', label: '📚 Recursos sugeridos', intro: 'Dime tu país y nivel, y te sugeriré tipos de instituciones y palabras clave para buscar materiales.', internalPrompt: 'Sugiere tipos de fuentes y recursos confiables para docentes.' }
];
