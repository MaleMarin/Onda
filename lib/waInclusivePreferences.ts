/**
 * Preferencias de inclusión por número de WhatsApp (memoria en proceso).
 * Se combinan con /onda … en el mensaje. No sustituye un CRM; sirve para activación gradual del canal.
 */

import type { OndaUserPreferences } from "./userPreferences";
import {
  DEFAULT_ONDA_USER_PREFERENCES,
  mergeOndaUserPreferences,
} from "./userPreferences";

const store = new Map<string, OndaUserPreferences>();

export function getWaInclusivePrefs(phone: string): OndaUserPreferences {
  const p = store.get(phone);
  return p ? { ...p } : { ...DEFAULT_ONDA_USER_PREFERENCES };
}

export function patchWaInclusivePrefs(
  phone: string,
  patch: Partial<OndaUserPreferences>
): OndaUserPreferences {
  const next = mergeOndaUserPreferences(getWaInclusivePrefs(phone), patch);
  store.set(phone, next);
  return next;
}

/** Mensaje de ayuda corto para quien escribe /onda */
export const WA_ONDA_PREFS_HELP =
  "Ajustes Onda (escribe solo una línea):\n" +
  "/onda simple | breve | detalle | pasos\n" +
  "/onda lectura facil | lectura normal\n" +
  "/onda audio | texto | auto\n" +
  "/onda bajo | normal\n" +
  "/onda perfil general | mayor | joven | docente | comunidad\n" +
  "/onda pais CL (código ISO2) o LATAM\n" +
  "/onda idioma es | pt\n" +
  "/onda ayuda";

/**
 * Si el texto empieza por /onda, aplica parche y devuelve el resto (o vacío si solo era comando).
 */
export function parseWaInclusiveCommand(
  phone: string,
  rawText: string
): { outgoingText: string; prefs: OndaUserPreferences; helpReply?: string } {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  if (lower === "/onda" || lower === "/onda ayuda" || lower === "/onda help") {
    return {
      outgoingText: "",
      prefs: getWaInclusivePrefs(phone),
      helpReply: WA_ONDA_PREFS_HELP,
    };
  }

  if (!lower.startsWith("/onda ")) {
    return { outgoingText: rawText, prefs: getWaInclusivePrefs(phone) };
  }

  const arg = text.slice("/onda ".length).trim().toLowerCase();
  const patch: Partial<OndaUserPreferences> = {};

  if (arg === "simple") patch.responseDepth = "simple";
  else if (arg === "breve") patch.responseDepth = "brief";
  else if (arg === "detalle") patch.responseDepth = "detailed";
  else if (arg === "pasos") patch.responseDepth = "step_by_step";
  else if (arg === "lectura facil" || arg === "lectura fácil") patch.readingMode = "easy";
  else if (arg === "lectura normal") patch.readingMode = "standard";
  else if (arg === "audio") patch.outputMode = "audio";
  else if (arg === "texto") patch.outputMode = "text";
  else if (arg === "auto") patch.outputMode = "auto";
  else if (arg === "bajo") patch.bandwidthMode = "low";
  else if (arg === "normal") patch.bandwidthMode = "standard";
  else if (arg === "perfil general") patch.audienceProfile = "general";
  else if (arg === "perfil mayor") patch.audienceProfile = "older_adult";
  else if (arg === "perfil joven") patch.audienceProfile = "youth";
  else if (arg === "perfil docente") patch.audienceProfile = "teacher";
  else if (arg === "perfil comunidad") patch.audienceProfile = "community_mediator";
  else if (arg.startsWith("pais ") || arg.startsWith("país ")) {
    const code = arg.replace(/^pa[ií]s\s+/, "").trim().toUpperCase().slice(0, 8);
    if (code) patch.userCountry = code;
  } else if (arg === "idioma es" || arg === "idioma esp") patch.locale = "es-LATAM";
  else if (arg === "idioma pt" || arg === "idioma br") patch.locale = "pt-BR";
  else {
    return {
      outgoingText: rawText,
      prefs: getWaInclusivePrefs(phone),
      helpReply: `No reconocí ese comando. ${WA_ONDA_PREFS_HELP}`,
    };
  }

  const prefs = patchWaInclusivePrefs(phone, patch);
  return {
    outgoingText: "",
    prefs,
    helpReply: `Listo. Ajustes guardados para esta conversación.`,
  };
}
