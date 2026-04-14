/**
 * Etiquetado y sanitización para ONDA Insights (sin LLM por defecto).
 * No almacenar PII: solo patrones y dominios agregados.
 */

import type { ConversationIntent } from "@/lib/intentClassifier";
import { EjeOnda } from "@/content/types";
import type { RiskPipelineFlags } from "@/lib/riskModes";
import {
  detectScamKeywords,
  detectScamQuestion,
  localeToRiskLocale,
} from "@/lib/riskModes";
import type { OndaChatLocale } from "@/lib/userPreferences";

export type DetectedIntent =
  | "link_noticia"
  | "pantallazo"
  | "emergencia"
  | "estafa"
  | "microleccion"
  | "pref_change"
  | "transparencia"
  | "general";

const URL_FULL = /\bhttps?:\/\/[^\s)\]}>"']+/gi;
const EMAIL_RE = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi;
const PHONE_RE =
  /\b(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}[\s.-]?\d{2,6}\b/g;
const RUT_CL_RE = /\b\d{1,2}(?:\.\d{3}){2}-[\dkK]\b/gi;
const CPF_BR_RE = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
const CARD_LIKE = /\b(?:\d[ -]*?){13,19}\b/g;
const OTP_LINE = /\b(?:2fa|mfa|otp|codigo|c[oó]digo)\s*[:#]?\s*[\w-]{4,32}\b/gi;

/**
 * Elimina o anonimiza PII y URLs completas (deja dominio cuando es posible).
 */
export function sanitizeTextForTelemetry(text: string): string {
  let s = (text ?? "").slice(0, 8000);
  s = s.replace(EMAIL_RE, "[REDACTED]");
  s = s.replace(CPF_BR_RE, "[REDACTED]");
  s = s.replace(RUT_CL_RE, "[REDACTED]");
  s = s.replace(CARD_LIKE, "[REDACTED]");
  s = s.replace(OTP_LINE, "[REDACTED]");
  s = s.replace(URL_FULL, (url) => {
    try {
      const u = new URL(url);
      return `[url:${u.hostname}]`;
    } catch {
      return "[url]";
    }
  });
  s = s.replace(PHONE_RE, "[REDACTED]");
  return s.trim();
}

export function userRequestedTelemetryOptOut(message: string): boolean {
  const t = (message ?? "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  if (!t.trim()) return false;
  return (
    /\bno guardar\b/.test(t) ||
    /\bno registres\b/.test(t) ||
    /\bno almacenes\b/.test(t) ||
    /\bprivacidad\b.*\b(no|sin)\s+(guardar|datos|anal[ií]tica)\b/.test(t) ||
    /\b(opt[- ]?out|desactivar)\s+(anal[ií]tica|telemetr[ií]a)\b/.test(t)
  );
}

export function buildRiskFlagsForTelemetry(
  risk: RiskPipelineFlags,
  text: string,
  locale: OndaChatLocale | null | undefined
): { emergency: boolean; scam: boolean; sensitive: boolean; simple3: boolean } {
  const rl = localeToRiskLocale(locale);
  const scam = detectScamKeywords(text, rl) || detectScamQuestion(text);
  const t = (text ?? "").trim();
  const simple3 = t.length > 0 && t.length < 90 && !/\bhttps?:\/\//i.test(t);
  return {
    emergency: Boolean(risk.emergency),
    scam,
    sensitive: Boolean(risk.sensitive),
    simple3,
  };
}

export function detectIntentType(params: {
  userText: string;
  conversationIntent: ConversationIntent;
  hasLink: boolean;
  hasImage: boolean;
  hasAudio: boolean;
  transparency: boolean;
  risk: RiskPipelineFlags;
  prefChangeOnly?: boolean;
  locale?: OndaChatLocale | null;
}): DetectedIntent {
  if (params.prefChangeOnly) return "pref_change";
  if (params.transparency) return "transparencia";
  if (params.risk.emergency) return "emergencia";
  const rl = localeToRiskLocale(params.locale);
  const scamHit = detectScamKeywords(params.userText, rl) || detectScamQuestion(params.userText);
  if (
    params.hasAudio &&
    /\b(deep\s*fake|deepfake|audio\s*falso|voz\s*clonad)\b/i.test(params.userText)
  ) {
    return "estafa";
  }
  if (params.hasImage && params.risk.pantallazoDetective && !params.risk.emergency) return "pantallazo";
  if (params.hasLink) return "link_noticia";
  if (scamHit || params.conversationIntent === "fact_check" || params.conversationIntent === "disinformation") {
    return "estafa";
  }
  if (params.conversationIntent === "action") return "microleccion";
  if (
    params.conversationIntent === "explanation" &&
    /\b(aprend|clase|estudi|tutorial|mini|docente)\b/i.test(params.userText)
  ) {
    return "microleccion";
  }
  return "general";
}

const MAX_TAGS = 8;

/**
 * Tags cortos para agregación (sin texto literal largo).
 */
export function detectTopicTags(
  message: string,
  eje: EjeOnda | null,
  riskFlags: { emergency: boolean; scam: boolean; sensitive: boolean; simple3: boolean },
  hasLink: boolean,
  hasImage: boolean,
  hasAudio: boolean
): string[] {
  const t = (message ?? "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const tags = new Set<string>();
  if (eje) tags.add(`eje_${eje.toLowerCase()}`);
  if (hasLink) tags.add("con_link");
  if (hasImage) tags.add("imagen");
  if (hasAudio) tags.add("audio");
  if (riskFlags.emergency) tags.add("emergencia");
  if (riskFlags.scam) tags.add("estafa_phishing");
  if (riskFlags.sensitive) tags.add("datos_sensibles_aviso");
  if (riskFlags.simple3) tags.add("consulta_corta");
  if (/\b(phishing|estafa|golpe|fraude|clon)\b/.test(t)) tags.add("estafa");
  if (/\b(deep\s*fake|deepfake|audio\s*falso)\b/.test(t)) tags.add("deepfake_audio");
  if (/\b(congreso|senado|diputad|ley|decreto|ministerio)\b/.test(t)) tags.add("civita_institucion");
  if (/\b(whatsapp|wsp|cadena|reenvi)\b/.test(t)) tags.add("cadena_whatsapp");
  if (/\b(banco|transferencia|cvu|cbu|pix)\b/.test(t)) tags.add("finanzas_estafa");
  if (/\b(noticia|titular|medio|period)\b/.test(t)) tags.add("noticia");
  if (/\b(profes|aula|alumn|rubric)\b/.test(t)) tags.add("educacion");
  const out = [...tags];
  return out.slice(0, MAX_TAGS);
}

/**
 * Resumen seguro heurístico (≤160 chars), sin contenido literal del usuario.
 */
export function buildHeuristicSummarySafe(params: {
  detectedIntent: DetectedIntent;
  contentType: "text" | "audio" | "image" | "link" | "mixed";
  eje: EjeOnda | null;
}): string {
  const parts: string[] = [];
  parts.push(`Intent:${params.detectedIntent}`);
  parts.push(`Formato:${params.contentType}`);
  if (params.eje) parts.push(`Onda:${params.eje}`);
  const base = parts.join(" · ");
  if (base.length <= 160) return base;
  return base.slice(0, 157) + "...";
}
