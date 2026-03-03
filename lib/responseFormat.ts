/**
 * Formato de respuesta preferido por el usuario (en las 3 Ondas).
 * Permite que la pregunta y la respuesta se entreguen como el usuario pide: texto, audio, imagen/infografía.
 */

/** Detecta si el usuario pide explícitamente respuesta en voz/audio */
export function wantsAudio(userMessage: string): boolean {
  const t = (userMessage || "").toLowerCase().trim();
  const terms = [
    "con voz",
    "en audio",
    "por voz",
    "por audio",
    "hablame",
    "háblame",
    "respondeme con voz",
    "respóndeme con voz",
    "mandame audio",
    "mándame audio",
    "en voz",
    "como audio",
    "en nota de voz",
    "nota de voz",
  ];
  return terms.some((term) => t.includes(term));
}

/** Detecta si el usuario pide fuentes, referencias o en qué te basas */
export function wantsSources(userMessage: string): boolean {
  const t = (userMessage || "").toLowerCase().trim();
  const terms = [
    "fuentes",
    "referencias",
    "en qué te basas",
    "en que te basas",
    "cita las fuentes",
    "dame las fuentes",
    "bibliografía",
    "de dónde sale",
    "de donde sale",
    "qué fuentes",
    "que fuentes",
    "enlace",
    "enlaces",
    "links",
    "sources",
  ];
  return terms.some((term) => t.includes(term));
}

/** Detecta si el usuario pide explícitamente imagen o infografía */
export function wantsImage(userMessage: string): boolean {
  const t = (userMessage || "").toLowerCase().trim();
  const terms = [
    "en imagen",
    "en imágenes",
    "una imagen",
    "una infografía",
    "infografía",
    "infografica",
    "en gráfico",
    "gráfico",
    "mandame una imagen",
    "mándame una imagen",
    "como imagen",
    "con imagen",
    "con una guía",
    "una guía visual",
  ];
  return terms.some((term) => t.includes(term));
}

/** IDs de guías permitidos (imágenes estáticas en public/guides/) */
export const GUIDE_IDS = [
  "estafa",
  "phishing",
  "deepfake",
  "criterio",
  "instituciones",
  "derechos",
  "actividad",
];
const GUIDE_IDS_SET = new Set(GUIDE_IDS);

const FORMATO_AUDIO_REGEX = /\[ONDA_FORMATO:audio\]/gi;
const GUIA_REGEX = /\[ONDA_GUIA:([a-z0-9_-]+)\]/gi;
/** [ONDA_SUGERENCIAS: pregunta1 | pregunta2 | pregunta3] → preguntas relacionadas, fraseo como usuario */
const SUGERENCIAS_REGEX = /\[ONDA_SUGERENCIAS:\s*([^\]]+)\]/gi;

export interface ParsedResponse {
  /** Texto limpio (sin marcadores) para mostrar y para TTS */
  text: string;
  /** Si debemos enviar además la respuesta en audio */
  sendAudio: boolean;
  /** Si el modelo indicó una guía, el id (solo si está en GUIDE_IDS) */
  guideId: string | null;
  /** 2–4 preguntas de seguimiento relacionadas, redactadas como la usuaria preguntaría */
  suggestions: string[];
}

/**
 * Parsea la respuesta del modelo: quita marcadores [ONDA_FORMATO:audio] y [ONDA_GUIA:xxx]
 * y devuelve texto limpio + flags para enviar audio o imagen.
 */
export function parseResponseFormat(reply: string): ParsedResponse {
  let text = reply || "";
  let sendAudio = false;
  let guideId: string | null = null;
  let suggestions: string[] = [];

  text = text.replace(FORMATO_AUDIO_REGEX, () => {
    sendAudio = true;
    return "";
  });
  text = text.replace(GUIA_REGEX, (_, id: string) => {
    const normalized = id.toLowerCase().trim();
    if (GUIDE_IDS_SET.has(normalized)) {
      guideId = normalized;
    }
    return "";
  });
  text = text.replace(SUGERENCIAS_REGEX, (_, inner: string) => {
    const parts = inner.split(/\s*\|\s*/).map((p: string) => p.trim()).filter(Boolean);
    if (parts.length >= 1 && parts.length <= 6) suggestions = parts;
    return "";
  });

  text = text.replace(/\n{3,}/g, "\n\n").trim();
  return { text, sendAudio, guideId, suggestions };
}
