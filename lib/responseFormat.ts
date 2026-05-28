/**
 * Formato de respuesta preferido por el usuario (en las 3 Ondas).
 * Permite que la pregunta y la respuesta se entreguen como el usuario pide: texto, audio, imagen/infografía.
 */

import {
  buildInfographicPayloadFromModelText,
  type BuildInfographicOptions,
  type InfographicPayload,
} from "./infographicPayload";

export type { InfographicPayload, BuildInfographicOptions } from "./infographicPayload";

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

/**
 * Versión "relaxed" de wantsSources: detecta señales más amplias de que la persona quiere
 * respaldo, pruebas o cómo lo sabes. Útil para Modo Desinformación 360 y verificación, sin
 * forzar la lista oficial completa (eso lo hace wantsSources). No inventa fuentes si no hay
 * contexto externo inyectado.
 */
export function wantsSourcesRelaxed(userMessage: string): boolean {
  const t = (userMessage || "").toLowerCase().trim();
  if (!t) return false;
  if (wantsSources(t)) return true;
  const extras = [
    "evidencia",
    "evidencias",
    "respaldo",
    "respaldar",
    "pruebas",
    "prueba de que",
    "cómo sabes",
    "como sabes",
    "cómo lo sabes",
    "como lo sabes",
    "en base a qué",
    "en base a que",
    "de dónde viene",
    "de donde viene",
    "comprobar",
    "comprobado",
    "verifica",
    "verificable",
    "fuente confiable",
    "documento que lo respalde",
  ];
  return extras.some((term) => t.includes(term));
}

/** Detecta si el usuario pide explícitamente imagen, infografía o diagrama */
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
    "diagrama",
    "hazme un diagrama",
    "hazme una infografía",
    "mandame una imagen",
    "mándame una imagen",
    "como imagen",
    "con imagen",
    "con una guía",
    "una guía visual",
    "resumen visual",
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

/** Marcador estándar: [ONDA_FORMATO:texto|audio|infografia|imagen] */
const FORMATO_REGEX = /\[ONDA_FORMATO:\s*(texto|audio|infografia|imagen)\s*\]/gi;
const GUIA_REGEX = /\[ONDA_GUIA:([a-z0-9_-]+)\]/gi;
/** [ONDA_SUGERENCIAS: pregunta1 | pregunta2 | pregunta3] → preguntas relacionadas, fraseo como usuario */
const SUGERENCIAS_REGEX = /\[ONDA_SUGERENCIAS:\s*([^\]]+)\]/gi;

export type FormatoSalida = "texto" | "audio" | "infografia" | "imagen";

export type ParseResponseFormatOptions = {
  /** Contexto para infografía: idioma, modo accesible, eje. */
  infographic?: BuildInfographicOptions;
};

export interface ParsedResponse {
  text: string;
  formato: FormatoSalida;
  sendAudio: boolean;
  guideId: string | null;
  suggestions: string[];
  /** Cuando formato===infografia: payload para renderizar la infografía */
  infographicPayload?: InfographicPayload;
}

/**
 * Compat: mismo resultado que buildInfographicPayloadFromModelText sin opciones de canal.
 */
export function extractInfographicPayload(text: string): InfographicPayload {
  return buildInfographicPayloadFromModelText(text, {});
}

/**
 * Parsea la respuesta del modelo: quita marcadores [ONDA_FORMATO:...], [ONDA_GUIA:xxx], [ONDA_SUGERENCIAS: ...]
 * y devuelve texto limpio + formato + flags para audio/guía.
 */
export function parseResponseFormat(reply: string, options?: ParseResponseFormatOptions): ParsedResponse {
  let text = reply || "";
  let formato: FormatoSalida = "texto";
  let guideId: string | null = null;
  let suggestions: string[] = [];

  text = text.replace(FORMATO_REGEX, (_, value: string) => {
    const v = (value || "").toLowerCase().trim();
    if (v === "audio" || v === "infografia" || v === "imagen" || v === "texto") {
      formato = v as FormatoSalida;
    }
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
  const f = formato as FormatoSalida;
  const sendAudio = f === "audio";
  const infographicPayload =
    f === "infografia" ? buildInfographicPayloadFromModelText(text, options?.infographic) : undefined;
  return { text, formato: f, sendAudio, guideId, suggestions, infographicPayload };
}
