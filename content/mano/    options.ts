import type { MenuOption } from '../types';

export const IA_SUBMENU_OPTIONS: MenuOption[] = [
  { id: 'IA_ST', label: '📚 IA para estudiar y aprender', intro: '📚 **IA para estudiar y aprender**\nLa IA ayuda a entender textos, resumir ideas o generar preguntas de práctica.', internalPrompt: 'Proporciona 3 ejemplos de prompts para estudiar: Entender, Resumir y Practicar.' },
  { id: 'IA_TR', label: '🧑‍💼 IA para organizar trabajo', intro: '🧑‍💼 **IA para organizar trabajo**\nOrdena pendientes, redacta borradores o planifica semanas.', internalPrompt: 'Proporciona 3 ejemplos de prompts para trabajo: Ordenar, Borradores y Planificar.' },
  { id: 'IA_CR', label: '🎨 IA para creatividad', intro: '🎨 **IA para creatividad**\nBusca ideas iniciales o explora estilos creativos.', internalPrompt: 'Proporciona 3 prompts creativos éticos.' },
  { id: 'IA_DD', label: '🧩 IA día a día', intro: '🧩 **IA día a día**\nEntender temas complejos, comparar info u organizar notas.', internalPrompt: 'Proporciona 3 prompts para la vida cotidiana.' },
  { id: 'IA_IC', label: '🧾 Indicaciones con criterio', intro: '🧾 **Usar IA con criterio**\nCompara fuentes, sé transparente y analiza siempre con tu propio juicio.', internalPrompt: 'Explica las reglas de oro para usar IA con responsabilidad.' }
];

export const A_MANO_OPTIONS: MenuOption[] = [
  { id: 'A_M1', label: '🔍 Entender una noticia o un texto', intro: 'Puedes enviarme una noticia, captura, texto, link o audio. La revisaré y te daré una explicación clara, sin tecnicismos y paso a paso. ¿Quieres enviarlo ahora?', internalPrompt: 'Explica el contenido enviado en lenguaje simple, párrafos cortos, con 2-3 puntos clave. No opines, solo entrega contexto y posibles riesgos.' },
  { id: 'A_M2', label: '🔥 Despejar una duda (posible estafa)', intro: 'Si algo te dejó con duda, puedes contarme o enviarme una captura, audio, mensaje o link. Revisaremos si hay señales de engaño. ¿Quieres enviarlo ahora?', internalPrompt: 'Busca señales de estafa (urgencia, premios, datos sensibles). Entrega análisis y señales de alerta claras.' },
  { id: 'A_M3', label: '✋ Estoy viviendo algo incómodo', intro: 'Gracias por confiar en este espacio. 🙏 ¿Ocurrió en una red social, chat, juego online u otro lugar?', internalPrompt: 'Responde con empatía absoluta. Sugiere opciones de protección (bloquear, silenciar, denunciar) según la plataforma.' },
  { id: 'A_M4', label: '🔔 Radar de alertas', intro: 'Aquí juntamos un radar de alertas digitales recientes (estafas, contenidos con IA, tendencias). ¿Te gustaría verlas ahora?', internalPrompt: 'Genera 3 alertas digitales realistas y recientes sobre seguridad digital.' },
  { id: 'A_M5', label: '👀 Entrenar mi ojo', intro: 'Vamos con un mini-reto digital para afinar tu ojo. 👀 Te mostraré un caso y tendrás que detectar lo que no cuadra. ¿Empezamos?', internalPrompt: 'Presenta un caso de desinformación/montaje y pide al usuario encontrar el error. Luego explica.' },
  { id: 'A_M6', label: '🤖 Aprender a usar IA', intro: 'La IA puede ser una buena aliada si la usas con criterio. 🤖🧠 ¿En qué te gustaría usarla hoy?', isSubmenu: true },
  { id: 'A_M7', label: '🎧 Descubrir algo que valga la pena', intro: 'Dime cómo estás hoy: ¿Tranquilo, Motivante, Profundo o Sorprendente?', internalPrompt: 'Recomienda música, cine, podcasts o libros que inspiren y ayuden a entrenar el criterio.' },
  { id: 'A_M8', label: '🍃 Tomar aire', intro: 'Vamos a hacer una pequeña pausa digital. Cierra los ojos, inspira profundo... ¿Quieres volver al menú o ver otra opción tranquila?', internalPrompt: 'Guía un ejercicio breve de respiración y bienestar digital.' },
  { id: 'A_M9', label: '💬 Dar mi opinión', intro: 'Tu opinión también construye este espacio. 🙌 ¿Qué es lo que más te preocupa o incomoda del mundo digital hoy?', internalPrompt: 'Escucha la opinión del usuario y ofrece herramientas o validación empática.' },
  { id: 'A_M10', label: '✨ Compartir Onda', intro: 'Si quieres invitar a alguien más, aquí tienes un mensaje listo para reenviar:\n\n> "Prueba Onda, un asistente que ayuda a moverse con más criterio digital. Útil, simple y cero ruido."', internalPrompt: 'Facilita el compartir el bot con otros.' }
];
