/**
 * Textos de UI del chat (base i18n). Ampliar aquí para más pantallas.
 * Todas las funciones reciben `OndaChatLocale` desde el estado de la app (default es-LATAM).
 */

import { EjeOnda } from "@/content/types";
import type { OndaChatLocale } from "./userPreferences";

export type InclusionUiStrings = {
  panelTitle: string;
  panelClose: string;
  openPanel: string;
  skipToInput: string;
  responseDepth: string;
  depthSimple: string;
  depthBrief: string;
  depthDetailed: string;
  depthSteps: string;
  readingMode: string;
  readingStandard: string;
  readingEasy: string;
  outputMode: string;
  outputText: string;
  outputAudio: string;
  outputAuto: string;
  bandwidth: string;
  bandwidthStandard: string;
  bandwidthLow: string;
  audience: string;
  audGeneral: string;
  audOlder: string;
  audYouth: string;
  audTeacher: string;
  audCommunity: string;
  country: string;
  countryNone: string;
  locale: string;
  localeEs: string;
  localePt: string;
  guidedTitle: string;
  routeWeirdMsg: string;
  routeNews: string;
  routeScam: string;
  routePublic: string;
  routeTeacher: string;
  routeIa: string;
  orgTitle: string;
  orgWorkshop: string;
  orgClassroom: string;
  orgCommunity: string;
  orgGroup: string;
};

const ES: InclusionUiStrings = {
  panelTitle: "Inclusión y acceso",
  panelClose: "Cerrar",
  openPanel: "Acceso e inclusión",
  skipToInput: "Ir al campo de mensaje",
  responseDepth: "Cómo quiero la respuesta",
  depthSimple: "En simple",
  depthBrief: "Breve",
  depthDetailed: "Más detalle",
  depthSteps: "Paso a paso",
  readingMode: "Lectura",
  readingStandard: "Estándar",
  readingEasy: "Lectura fácil",
  outputMode: "Salida",
  outputText: "Solo texto",
  outputAudio: "Incluir audio",
  outputAuto: "Automático",
  bandwidth: "Conexión",
  bandwidthStandard: "Normal",
  bandwidthLow: "Bajo consumo",
  audience: "Perfil",
  audGeneral: "General",
  audOlder: "Persona mayor",
  audYouth: "Joven",
  audTeacher: "Docente",
  audCommunity: "Mediación comunitaria",
  country: "País o región",
  countryNone: "Sin especificar (LatAm)",
  locale: "Idioma de la interfaz y respuesta",
  localeEs: "Español (LatAm)",
  localePt: "Portugués (Brasil)",
  guidedTitle: "Rutas guiadas",
  routeWeirdMsg: "Me llegó un mensaje raro",
  routeNews: "Quiero entender una noticia",
  routeScam: "¿Puede ser una estafa?",
  routePublic: "No entiendo un tema público",
  routeTeacher: "Soy docente: necesito una actividad",
  routeIa: "Usar IA con más criterio",
  orgTitle: "Usos en equipo",
  orgWorkshop: "Para un taller",
  orgClassroom: "Para el aula",
  orgCommunity: "Acompañamiento comunitario",
  orgGroup: "Conversación grupal",
};

const PT: InclusionUiStrings = {
  panelTitle: "Inclusão e acesso",
  panelClose: "Fechar",
  openPanel: "Acesso e inclusão",
  skipToInput: "Ir para o campo de mensagem",
  responseDepth: "Como quero a resposta",
  depthSimple: "Bem simples",
  depthBrief: "Curta",
  depthDetailed: "Mais detalhes",
  depthSteps: "Passo a passo",
  readingMode: "Leitura",
  readingStandard: "Padrão",
  readingEasy: "Leitura fácil",
  outputMode: "Saída",
  outputText: "Só texto",
  outputAudio: "Incluir áudio",
  outputAuto: "Automático",
  bandwidth: "Conexão",
  bandwidthStandard: "Normal",
  bandwidthLow: "Baixo consumo",
  audience: "Perfil",
  audGeneral: "Geral",
  audOlder: "Pessoa idosa",
  audYouth: "Jovem",
  audTeacher: "Professor(a)",
  audCommunity: "Mediação comunitária",
  country: "País ou região",
  countryNone: "Não especificar (LatAm)",
  locale: "Idioma da interface e resposta",
  localeEs: "Espanhol (LatAm)",
  localePt: "Português (Brasil)",
  guidedTitle: "Caminhos guiados",
  routeWeirdMsg: "Recebi uma mensagem estranha",
  routeNews: "Quero entender uma notícia",
  routeScam: "Isso pode ser golpe?",
  routePublic: "Não entendo um tema público",
  routeTeacher: "Sou professor(a): preciso de uma atividade",
  routeIa: "Usar IA com mais critério",
  orgTitle: "Uso em equipe",
  orgWorkshop: "Para uma oficina",
  orgClassroom: "Para a sala de aula",
  orgCommunity: "Acompanhamento comunitário",
  orgGroup: "Conversa em grupo",
};

export function getInclusionUiStrings(locale: OndaChatLocale): InclusionUiStrings {
  return locale === "pt-BR" ? PT : ES;
}

export type GuidedPrompts = {
  weirdMsg: string;
  news: string;
  scam: string;
  publicTopic: string;
  teacher: string;
  iaCriteria: string;
  orgWorkshop: string;
  orgClassroom: string;
  orgCommunity: string;
  orgGroup: string;
};

const PROMPTS_ES: GuidedPrompts = {
  weirdMsg:
    "Me llegó un mensaje raro por WhatsApp o redes. Ayúdame a ver si puede ser peligroso y qué pasos seguir sin asustarme.",
  news: "Tengo una noticia o un enlace y quiero entenderla con calma. Guíame en simple qué revisar primero.",
  scam: "Creo que algo puede ser una estafa o phishing. Dame pasos concretos para verificar sin exponerme.",
  publicTopic:
    "No entiendo un tema de ciudadanía o trámite público. Explícamelo en neutro y dime qué suele variar por país.",
  teacher:
    "Soy docente: necesito una actividad corta sobre alfabetización mediática o uso responsable de IA. No hagas el trabajo completo de los estudiantes.",
  iaCriteria:
    "Quiero usar la IA con más criterio en el día a día. Dame ideas prácticas y preguntas que deba hacerme antes de confiar.",
  orgWorkshop:
    "Voy a usar esto en un taller: necesito una explicación breve que pueda leer en voz alta y una dinámica de 10 minutos.",
  orgClassroom:
    "Voy a usar esto en el aula: necesito una consigna clara y una rúbrica mínima para evaluar sin copiar de la IA.",
  orgCommunity:
    "Voy a acompañar a mi comunidad: ayúdame a explicar cómo contrastar rumores sin generar pánico.",
  orgGroup:
    "Voy a conversar en grupo: dame 3 preguntas guía para que todos participen sin pelearse.",
};

const PROMPTS_PT: GuidedPrompts = {
  weirdMsg:
    "Recebi uma mensagem estranha no WhatsApp ou nas redes. Me ajude a ver se pode ser perigoso e que passos seguir sem me assustar.",
  news: "Tenho uma notícia ou um link e quero entender com calma. Me guie de forma simples no que revisar primeiro.",
  scam: "Acho que pode ser golpe ou phishing. Me dê passos concretos para verificar sem me expor.",
  publicTopic:
    "Não entendo um tema de cidadania ou trâmite público. Explique de forma neutra e diga o que costuma variar por país.",
  teacher:
    "Sou professor(a): preciso de uma atividade curta sobre letramento midiático ou uso responsável de IA. Não faça o trabalho completo dos estudantes.",
  iaCriteria:
    "Quero usar IA com mais critério no dia a dia. Me dê ideias práticas e perguntas que devo fazer antes de confiar.",
  orgWorkshop:
    "Vou usar em uma oficina: preciso de uma explicação breve para ler em voz alta e uma dinâmica de 10 minutos.",
  orgClassroom:
    "Vou usar na sala de aula: preciso de um enunciado claro e uma rubrica mínima para avaliar sem copiar da IA.",
  orgCommunity:
    "Vou acompanhar minha comunidade: ajude a explicar como checar rumores sem gerar pânico.",
  orgGroup:
    "Vou conversar em grupo: me dê 3 perguntas-guia para todos participarem sem briga.",
};

export function getGuidedPrompts(locale: OndaChatLocale): GuidedPrompts {
  return locale === "pt-BR" ? PROMPTS_PT : PROMPTS_ES;
}

/** Textos de chat visibles (errores, composer, chips) según locale. */
export type ChatUiMicrocopy = {
  errorGeneric: string;
  errorImage: string;
  errorConnection: string;
  errorTimeout: string;
  errorServer: string;
  pickOndaFirst: string;
  pickOndaDismiss: string;
  typing: string;
  typingSr: string;
  streamDone: string;
  send: string;
  linkHelpBotMessage: string;
  linkHelpPlaceholder: string;
  linkHelpCta: string;
  placeholderGeneric: string;
  menuIntroFreeText: string;
  menuIntroAtajos: readonly string[];
  compartir: string;
  compartirCopiado: string;
  fuenteVerificada: string;
  clearConversation: string;
  clearConversationTitle: string;
  backHome: string;
  backHomeTitle: string;
  switchEjePrefix: string;
  messagesRegion: string;
  listenAudio: string;
  stopAudio: string;
  formComposerAria: string;
  micStop: string;
  micRecordTitle: string;
  micRecordAria: string;
  imageUploadTitle: string;
  removeAttachment: string;
  chooseOndaTooltip: string;
  chooseOndaSendTitle: string;
  inputAriaNeedEje: string;
  conversationAria: string;
  /** Confirmación al guardar solo comandos de preferencia (sin llamar al modelo). */
  prefsSavedAck: string;
  /** Tip breve cerca del input: comandos de preferencia (sin panel). */
  prefsCommandsTip: string;
  /** Botones del menú por eje (lista / submenú IA). */
  menuWriteFreely: string;
  menuBackToMenu: string;
  menuViewMenu: string;
  /** Cabecera: enlace logo + marca → sitio Precisar. */
  precisarSiteLinkAria: string;
  /** Tabs Onda (role=tablist). */
  ejeTablistAria: string;
  /** Picker grande: prefijo aria “Elegir …”. */
  ejePickerChoosePrefix: string;
  /** Picker grande: prefijo aria “Continuar en …”. */
  ejePickerContinuePrefix: string;
  /** Badge “Continuar” en tarjeta preferida. */
  pickerContinueBadge: string;
  /** title botón volver a submenú / menú. */
  menuShowSubmenuAgainTitle: string;
  /** title botón inicio (menú principal, texto largo). */
  menuMainGoInicioLongTitle: string;
  /** Enlace texto bajo composer: volver al menú. */
  composerBackToMenuLink: string;
  /** title enlace volver al menú (composer). */
  composerShowMenuTitle: string;
  /** title enlace inicio (composer). */
  composerGoInicioTitle: string;
  /** Grabación de voz demasiado corta. */
  audioTooShortHint: string;
  /** Alt imagen adjunta. */
  attachmentPreviewAlt: string;
  /** Etiqueta mensaje usuario sustituto (voz). */
  attachmentVoiceLabel: string;
  /** Etiqueta mensaje usuario sustituto (imagen). */
  attachmentImageLabel: string;
};

const CHAT_UI_ES: ChatUiMicrocopy = {
  errorGeneric: "Uy, algo se trabó. ¿Probamos de nuevo?",
  errorImage: "No pude analizar la imagen. Prueba con otra más liviana o cuéntame por texto qué ves.",
  errorConnection: "No pude conectar. ¿Revisas tu internet y probamos otra vez?",
  errorTimeout: "La respuesta tardó demasiado. ¿Probamos de nuevo?",
  errorServer: "Del lado mío hubo un problemita. Intenta en un ratito.",
  pickOndaFirst: "Elige primero una Onda 👇 así sé cómo ayudarte mejor.",
  pickOndaDismiss: "Entendido",
  typing: "ONDA está escribiendo...",
  typingSr: "Onda está preparando su respuesta",
  streamDone: "Onda terminó de responder",
  send: "Enviar",
  linkHelpBotMessage:
    "Pega el texto, el pantallazo de la noticia o el link y te lo explico. Si quieres, dime qué necesitas: un resumen, contexto, ideas clave o qué significa para ti.",
  linkHelpPlaceholder: "Pega el texto, pantallazo o link… y lo explico.",
  linkHelpCta: "Explicar",
  placeholderGeneric: "Dime en qué te puedo ayudar hoy",
  menuIntroFreeText: "O pregúntame libremente qué quieres saber",
  menuIntroAtajos: ["Tengo otra pregunta", "Quiero contarte algo", "Busco información sobre un tema"] as const,
  compartir: "Compartir",
  compartirCopiado: "Copiado",
  fuenteVerificada: "Fuente verificada por Onda",
  clearConversation: "Borrar esta conversación",
  clearConversationTitle: "Elimina el historial de esta conversación de tu dispositivo",
  backHome: "🏠 Volver al inicio",
  backHomeTitle: "Reiniciar y elegir otra Onda",
  switchEjePrefix: "Ahora en",
  messagesRegion: "Mensajes del chat",
  listenAudio: "🔊 Escuchar",
  stopAudio: "⏹ Parar audio",
  formComposerAria: "Escribe y envía tu mensaje a Onda",
  micStop: "Detener",
  micRecordTitle: "Grabar tu pregunta en voz",
  micRecordAria: "Grabar pregunta en voz (no es para escuchar al bot)",
  imageUploadTitle: "Subir imagen o pegar (Ctrl+V)",
  removeAttachment: "Quitar",
  chooseOndaTooltip: "¡Casi listo! Elige una Onda arriba para enviar tu pregunta.",
  chooseOndaSendTitle: "¡Casi listo! Elige una Onda arriba para enviar tu pregunta.",
  inputAriaNeedEje: "Escribe tu mensaje (elige una Onda arriba para enviar)",
  conversationAria: "Conversación con Onda",
  prefsSavedAck: "Listo: guardé tus preferencias para esta conversación.",
  prefsCommandsTip: "Tip: escribe ‘pt’, ‘es’, ‘curto’, ‘infografía’, ‘con fuentes’.",
  menuWriteFreely: "✏️ Escribe lo que quieras",
  menuBackToMenu: "↩️ Volver al menú",
  menuViewMenu: "📋 Ver menú",
  precisarSiteLinkAria: "Fundación Precisar, sitio web (se abre en una pestaña nueva)",
  ejeTablistAria: "Elegir Onda: perfil de la conversación",
  ejePickerChoosePrefix: "Elegir",
  ejePickerContinuePrefix: "Continuar en",
  pickerContinueBadge: "Continuar",
  menuShowSubmenuAgainTitle: "Ver de nuevo las opciones de esta Onda",
  menuMainGoInicioLongTitle: "Reiniciar y elegir otra Onda (A Mano, Civita, Profes)",
  composerBackToMenuLink: "📋 Volver al menú",
  composerShowMenuTitle: "Ver de nuevo las opciones de esta Onda",
  composerGoInicioTitle: "Reiniciar conversación y elegir otra Onda",
  audioTooShortHint: "Graba un poco más (al menos 2 segundos) y vuelve a intentar.",
  attachmentPreviewAlt: "Adjunto",
  attachmentVoiceLabel: "🎤 Mensaje de voz",
  attachmentImageLabel: "🖼️ Imagen",
};

const CHAT_UI_PT: ChatUiMicrocopy = {
  errorGeneric: "Ops, algo travou. Tentamos de novo?",
  errorImage: "Não consegui analisar a imagem. Tente outra mais leve ou conte por texto o que você vê.",
  errorConnection: "Não consegui conectar. Você pode checar a internet e tentar de novo?",
  errorTimeout: "A resposta demorou demais. Tentamos de novo?",
  errorServer: "Do meu lado tive um probleminha. Tente daqui a pouco.",
  pickOndaFirst: "Escolha primeiro uma Onda 👇 assim sei como ajudar melhor.",
  pickOndaDismiss: "Entendi",
  typing: "A ONDA está escrevendo...",
  typingSr: "A Onda está preparando a resposta",
  streamDone: "A Onda terminou de responder",
  send: "Enviar mensagem",
  linkHelpBotMessage:
    "Cole o texto, o print da notícia ou o link que eu explico. Se quiser, diga o que precisa: resumo, contexto, ideias principais ou o que isso significa para você.",
  linkHelpPlaceholder: "Cole o texto, print ou link… que eu explico.",
  linkHelpCta: "Explicar",
  placeholderGeneric: "Diga em que posso ajudar hoje",
  menuIntroFreeText: "Ou me pergunte livremente o que quiser saber",
  menuIntroAtajos: ["Tenho outra pergunta", "Quero te contar algo", "Busco informação sobre um tema"] as const,
  compartir: "Compartilhar",
  compartirCopiado: "Copiado",
  fuenteVerificada: "Fonte verificada pela Onda",
  clearConversation: "Apagar esta conversa",
  clearConversationTitle: "Remove o histórico desta conversa do seu dispositivo",
  backHome: "🏠 Voltar ao início",
  backHomeTitle: "Reiniciar e escolher outra Onda",
  switchEjePrefix: "Agora em",
  messagesRegion: "Mensagens do chat",
  listenAudio: "🔊 Ouvir",
  stopAudio: "⏹ Parar áudio",
  formComposerAria: "Escreva e envie sua mensagem para a Onda",
  micStop: "Parar",
  micRecordTitle: "Gravar sua pergunta em voz",
  micRecordAria: "Gravar pergunta em voz (não é para ouvir o bot)",
  imageUploadTitle: "Enviar imagem ou colar (Ctrl+V)",
  removeAttachment: "Remover",
  chooseOndaTooltip: "Quase lá! Escolha uma Onda acima para enviar sua pergunta.",
  chooseOndaSendTitle: "Quase lá! Escolha uma Onda acima para enviar sua pergunta.",
  inputAriaNeedEje: "Escreva sua mensagem (escolha uma Onda acima para enviar)",
  conversationAria: "Conversa com a Onda",
  prefsSavedAck: "Pronto: salvei suas preferências para esta conversa.",
  prefsCommandsTip: "Dica: escreva ‘pt’, ‘es’, ‘curto’, ‘infográfico’, ‘com fontes’.",
  menuWriteFreely: "✏️ Escreva o que quiser",
  menuBackToMenu: "↩️ Voltar ao menu",
  menuViewMenu: "📋 Ver menu",
  precisarSiteLinkAria: "Fundação Precisar, site oficial (abre em uma nova aba)",
  ejeTablistAria: "Escolher Onda: perfil da conversa",
  ejePickerChoosePrefix: "Escolher",
  ejePickerContinuePrefix: "Continuar em",
  pickerContinueBadge: "Continuar",
  menuShowSubmenuAgainTitle: "Ver de novo as opções desta Onda",
  menuMainGoInicioLongTitle: "Reiniciar e escolher outra Onda (A Mano, Civita, Profes)",
  composerBackToMenuLink: "📋 Voltar ao menu",
  composerShowMenuTitle: "Ver de novo as opções desta Onda",
  composerGoInicioTitle: "Reiniciar a conversa e escolher outra Onda",
  audioTooShortHint: "Grave um pouco mais (pelo menos 2 segundos) e tente de novo.",
  attachmentPreviewAlt: "Anexo",
  attachmentVoiceLabel: "🎤 Mensagem de voz",
  attachmentImageLabel: "🖼️ Imagem",
};

export function getChatMicrocopy(locale: OndaChatLocale): ChatUiMicrocopy {
  return locale === "pt-BR" ? CHAT_UI_PT : CHAT_UI_ES;
}

/** aria-label del input principal según Onda elegida. */
export function getChatInputAriaLabel(locale: OndaChatLocale, ejeName: string | null): string {
  const mc = getChatMicrocopy(locale);
  if (ejeName) {
    return locale === "pt-BR"
      ? `Escreva sua mensagem para ${ejeName}`
      : `Escribe tu mensaje para ${ejeName}`;
  }
  return mc.inputAriaNeedEje;
}

/** Placeholder por eje (composer cuando hay pestaña activa). */
export function getEjePlaceholder(locale: OndaChatLocale, eje: EjeOnda): string {
  if (locale === "pt-BR") {
    const PT: Record<EjeOnda, string> = {
      [EjeOnda.A_MANO]: "Pergunte sobre uma notícia, um link ou como usar IA hoje...",
      [EjeOnda.CIVITA]: "Vamos ver como funcionam instituições ou conceitos de economia...",
      [EjeOnda.PROFES]: "Vamos desenhar uma atividade educativa crítica com IA...",
    };
    return PT[eje];
  }
  const ES: Record<EjeOnda, string> = {
    [EjeOnda.A_MANO]: "Pregúntame sobre una noticia, un link o cómo usar IA hoy...",
    [EjeOnda.CIVITA]: "Exploremos cómo funcionan las instituciones o conceptos de economía...",
    [EjeOnda.PROFES]: "Diseñemos una actividad educativa crítica con IA...",
  };
  return ES[eje];
}

const EJE_CARD_SUBTITLE_ES: Record<EjeOnda, string> = {
  [EjeOnda.A_MANO]: "Vida digital cotidiana, criterio e IA.",
  [EjeOnda.CIVITA]: "Vida pública, instituciones y ciudadanía.",
  [EjeOnda.PROFES]: "Docencia y proyectos educativos con IA.",
};

const EJE_CARD_SUBTITLE_PT: Record<EjeOnda, string> = {
  [EjeOnda.A_MANO]: "Vida digital do dia a dia, critério e IA.",
  [EjeOnda.CIVITA]: "Vida pública, instituições e cidadania.",
  [EjeOnda.PROFES]: "Docência e projetos educativos com IA.",
};

/** Subtítulo de tarjeta Onda (picker / tabs): siempre según locale efectivo. */
export function getEjeCardSubtitle(locale: OndaChatLocale, eje: EjeOnda): string {
  return locale === "pt-BR" ? EJE_CARD_SUBTITLE_PT[eje] : EJE_CARD_SUBTITLE_ES[eje];
}

/** aria-label del picker grande (enlaces neumórficos). */
export function buildEjePickerAriaLabel(
  locale: OndaChatLocale,
  ejeName: string,
  subtitle: string,
  isPreferred: boolean
): string {
  const mc = getChatMicrocopy(locale);
  const prefix = isPreferred ? mc.ejePickerContinuePrefix : mc.ejePickerChoosePrefix;
  return `${prefix} ${ejeName}. ${subtitle}`;
}

/** Códigos ISO2 com nombre para selector (UI español/neutro). */
export const COUNTRY_OPTIONS: { code: string; label: string }[] = [
  { code: "", label: "—" },
  { code: "LATAM", label: "Latinoamérica / Caribe (marco general)" },
  { code: "AR", label: "Argentina" },
  { code: "BO", label: "Bolivia" },
  { code: "BR", label: "Brasil" },
  { code: "CL", label: "Chile" },
  { code: "CO", label: "Colombia" },
  { code: "CR", label: "Costa Rica" },
  { code: "CU", label: "Cuba" },
  { code: "EC", label: "Ecuador" },
  { code: "SV", label: "El Salvador" },
  { code: "ES", label: "España" },
  { code: "GT", label: "Guatemala" },
  { code: "HN", label: "Honduras" },
  { code: "MX", label: "México" },
  { code: "NI", label: "Nicaragua" },
  { code: "PA", label: "Panamá" },
  { code: "PY", label: "Paraguay" },
  { code: "PE", label: "Perú" },
  { code: "DO", label: "Rep. Dominicana" },
  { code: "UY", label: "Uruguay" },
  { code: "VE", label: "Venezuela" },
];

/** Etiquetas de país para el selector (pt-BR: al menos el marco regional). */
export function getCountryOptions(locale: OndaChatLocale): { code: string; label: string }[] {
  if (locale !== "pt-BR") return COUNTRY_OPTIONS;
  return COUNTRY_OPTIONS.map((o) =>
    o.code === "LATAM" ? { ...o, label: "América Latina / Caribe (visão geral)" } : o
  );
}
