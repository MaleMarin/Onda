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

/** Payload para renderizar infografía PNG: título, bullets, por qué importa, qué hacer, fuentes opcionales */
export interface InfographicPayload {
  title: string;
  summaryBullets: string[];
  whyMatters: string[];
  nextSteps: string[];
  sources?: string[];
}

export interface ParsedResponse {
  text: string;
  formato: FormatoSalida;
  sendAudio: boolean;
  guideId: string | null;
  suggestions: string[];
  /** Cuando formato===infografia: payload para renderizar la infografía */
  infographicPayload?: InfographicPayload;
}

const BULLET_REGEX = /^[\s]*[-*•]\s+/;
const NUMBERED_REGEX = /^[\s]*\d+[.)]\s+/;

function isBulletLine(line: string): boolean {
  const t = line.trim();
  return BULLET_REGEX.test(t) || NUMBERED_REGEX.test(t);
}

function stripBullet(line: string): string {
  return line.replace(BULLET_REGEX, "").replace(NUMBERED_REGEX, "").trim();
}

const MAX_WORDS_BULLET = 12;

function trimToMaxWords(s: string, maxWords: number): string {
  const parts = s.trim().split(/\s+/);
  if (parts.length <= maxWords) return s.trim();
  return parts.slice(0, maxWords).join(" ") + (s.trim().endsWith("…") ? "" : "…");
}

function sourceToShortLabel(raw: string): string {
  const t = raw.trim();
  const urlMatch = t.match(/https?:\/\/([^/]+)/i);
  if (urlMatch) {
    const domain = urlMatch[1].replace(/^www\./, "");
    const short = domain.split(".").slice(-2, -1)[0] ?? domain;
    return short.charAt(0).toUpperCase() + short.slice(1);
  }
  return t.slice(0, 40);
}

/**
 * Extrae del texto del modelo un payload estructurado para la infografía.
 * Heurística: título (primera línea), bullets (líneas con - * • o 1. 2.), secciones "por qué importa" / "qué hacer".
 */
export function extractInfographicPayload(text: string): InfographicPayload {
  const raw = (text || "").trim();
  if (!raw) {
    return {
      title: "Infografía ONDA",
      summaryBullets: [],
      whyMatters: [],
      nextSteps: [],
    };
  }

  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const bullets: string[] = [];
  let title = "";
  const whyMatters: string[] = [];
  const nextSteps: string[] = [];
  const sources: string[] = [];

  let i = 0;
  if (lines.length > 0 && !isBulletLine(lines[0])) {
    title = lines[0].slice(0, 120);
    i = 1;
  }
  while (i < lines.length && bullets.length < 5) {
    const line = lines[i];
    if (isBulletLine(line)) {
      bullets.push(trimToMaxWords(stripBullet(line), MAX_WORDS_BULLET));
    } else if (/^(por qué importa|porque importa|qué importa|por qué es importante)/i.test(line)) {
      i++;
      for (let j = 0; j < 3 && i + j < lines.length; j++) {
        if (isBulletLine(lines[i + j])) whyMatters.push(trimToMaxWords(stripBullet(lines[i + j]), MAX_WORDS_BULLET));
      }
      i += 3;
      continue;
    } else if (/^(qué hacer|cómo verificar|pasos|siguiente|qué hacer ahora)/i.test(line)) {
      i++;
      for (let j = 0; j < 4 && i + j < lines.length; j++) {
        if (isBulletLine(lines[i + j])) nextSteps.push(trimToMaxWords(stripBullet(lines[i + j]), MAX_WORDS_BULLET));
      }
      i += 4;
      continue;
    } else if (/^(fuentes|referencias|📚)/i.test(line)) {
      i++;
      for (let j = 0; j < 5 && i + j < lines.length && sources.length < 3; j++) {
        const ln = lines[i + j].trim();
        if (ln && (/\d+\./.test(ln) || /[-*•]/.test(ln) || /https?:\/\//i.test(ln))) {
          sources.push(sourceToShortLabel(ln.replace(/^\d+[.)]\s*/, "").replace(/^[-*•]\s*/, "")));
        }
      }
      i += 5;
      break;
    }
    i++;
  }

  if (!title && bullets.length > 0) title = bullets.shift()?.slice(0, 120) ?? "Infografía ONDA";
  if (!title) title = raw.slice(0, 80).split("\n")[0] || "Infografía ONDA";
  if (whyMatters.length === 0 && bullets.length > 1) {
    whyMatters.push(bullets[bullets.length - 1] ?? "Resumen del contenido.");
  }
  if (nextSteps.length === 0) {
    nextSteps.push("Revisar fuentes.", "Compartir con criterio.", "Seguir explorando.");
  }

  return { title, summaryBullets: bullets.slice(0, 5), whyMatters: whyMatters.slice(0, 2), nextSteps: nextSteps.slice(0, 3), sources: sources.length ? sources.slice(0, 3) : undefined };
}

/**
 * Parsea la respuesta del modelo: quita marcadores [ONDA_FORMATO:...], [ONDA_GUIA:xxx], [ONDA_SUGERENCIAS: ...]
 * y devuelve texto limpio + formato + flags para audio/guía.
 */
export function parseResponseFormat(reply: string): ParsedResponse {
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
  const infographicPayload = f === "infografia" ? extractInfographicPayload(text) : undefined;
  return { text, formato: f, sendAudio, guideId, suggestions, infographicPayload };
}
