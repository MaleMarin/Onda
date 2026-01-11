import type { MenuOption } from '../types';

export const CIVITA_OPTIONS: MenuOption[] = [
  { id: 'C_N1', label: '📰 Entender noticia o decisión pública', intro: 'Puedes enviarme una noticia, proyecto de ley o decisión del gobierno. ¿Quieres enviarla ahora?', internalPrompt: 'Explica la noticia en simple: qué significa, a quién afecta y qué dudas razonables tener.' },
  { id: 'C_I2', label: '🏛️ Entender institución o cargo', intro: '¿Qué institución o cargo de tu país quieres entender mejor? (Congreso, ministerios, municipios, etc.)', internalPrompt: 'Explica en simple qué es, qué funciones tiene y por qué importa esa institución.' },
  { id: 'C_D3', label: '📜 Mis derechos y reglas', intro: 'Hablemos de derechos fundamentales, servicios básicos o reglas de convivencia. ¿Qué te gustaría entender mejor?', internalPrompt: 'Explica derechos y reglas del juego público basándote en fuentes oficiales.' },
  { id: 'C_E4', label: '💰 Economía en simple', intro: 'Inflación, impuestos, empleo o presupuesto. ¿Qué tema económico quieres aterrizar hoy?', internalPrompt: 'Aterriza conceptos económicos a la vida cotidiana.' },
  { id: 'C_M5', label: '🌱 Medio ambiente y territorio', intro: 'Agua, energía, cambio climático o conflictos territoriales. ¿Qué tema ambiental te interesa?', internalPrompt: 'Explica temas ambientales conectándolos con derechos y territorio.' },
  { id: 'C_H6', label: '🕰️ Historia y contexto', intro: 'A veces hay que mirar atrás para entender hoy. ¿Qué tema te gustaría contextualizar históricamente?', internalPrompt: 'Da una versión breve y en simple del contexto histórico de un tema actual.' },
  { id: 'C_P7', label: '🗳️ Formas de participar', intro: 'Cabildos, consultas, juntas de vecinos o reclamos. ¿Qué tipo de participación te interesa conocer?', internalPrompt: 'Explica mecanismos de participación ciudadana reales del país del usuario.' },
  { id: 'C_C8', label: '🤝 Convivencia y respeto', intro: '¿Tuviste alguna discusión o situación de desacuerdo público que quieras revisar con calma?', internalPrompt: 'Ofrece estrategias para disentir sin descalificar y cuidar el espacio común.' },
  { id: 'C_E9', label: '📚 Ver ejemplos de temas', intro: 'Aquí tienes ideas de lo que puedes preguntarme en Onda Civita. 👇', isSubmenu: true }
];

  