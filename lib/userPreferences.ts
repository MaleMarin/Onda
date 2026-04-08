/**
 * Preferencias de inclusión y accesibilidad conversacional (Onda).
 * Persistencia web: localStorage bajo STORAGE_KEY.
 */

export type ResponseDepth = "simple" | "brief" | "detailed" | "step_by_step";
export type ReadingMode = "standard" | "easy";
export type OutputMode = "text" | "audio" | "auto";
export type BandwidthMode = "standard" | "low";
export type AudienceProfile =
  | "general"
  | "older_adult"
  | "youth"
  | "teacher"
  | "community_mediator";
export type OndaChatLocale = "es-LATAM" | "pt-BR";

export type OndaUserPreferences = {
  responseDepth: ResponseDepth;
  readingMode: ReadingMode;
  outputMode: OutputMode;
  bandwidthMode: BandwidthMode;
  audienceProfile: AudienceProfile;
  locale: OndaChatLocale;
  /** Código ISO2 en mayúsculas o "LATAM" para marco regional genérico */
  userCountry: string | null;
};

export const STORAGE_KEY_ONDA_USER_PREFERENCES = "onda_user_preferences";
/** Título corto del último tema (memoria temática del chat). */
export const STORAGE_KEY_ONDA_ULTIMO_TEMA = "onda_ultimo_tema";

export const DEFAULT_ONDA_USER_PREFERENCES: OndaUserPreferences = {
  responseDepth: "detailed",
  readingMode: "standard",
  outputMode: "text",
  bandwidthMode: "standard",
  audienceProfile: "general",
  locale: "es-LATAM",
  userCountry: null,
};

const DEPTHS: ResponseDepth[] = ["simple", "brief", "detailed", "step_by_step"];
const READING: ReadingMode[] = ["standard", "easy"];
const OUTPUTS: OutputMode[] = ["text", "audio", "auto"];
const BAND: BandwidthMode[] = ["standard", "low"];
const AUD: AudienceProfile[] = ["general", "older_adult", "youth", "teacher", "community_mediator"];
const LOCALES: OndaChatLocale[] = ["es-LATAM", "pt-BR"];

function pick<T extends string>(v: unknown, allowed: T[], fallback: T): T {
  return typeof v === "string" && allowed.includes(v as T) ? (v as T) : fallback;
}

export function mergeOndaUserPreferences(
  base: OndaUserPreferences,
  patch: Partial<OndaUserPreferences> | null | undefined
): OndaUserPreferences {
  if (!patch || typeof patch !== "object") return base;
  return {
    responseDepth: pick(patch.responseDepth, DEPTHS, base.responseDepth),
    readingMode: pick(patch.readingMode, READING, base.readingMode),
    outputMode: pick(patch.outputMode, OUTPUTS, base.outputMode),
    bandwidthMode: pick(patch.bandwidthMode, BAND, base.bandwidthMode),
    audienceProfile: pick(patch.audienceProfile, AUD, base.audienceProfile),
    locale: pick(patch.locale, LOCALES, base.locale),
    userCountry:
      patch.userCountry === undefined
        ? base.userCountry
        : patch.userCountry === null || patch.userCountry === ""
          ? null
          : String(patch.userCountry).slice(0, 32).toUpperCase(),
  };
}

/** Parsea el objeto enviado desde el cliente (POST /api/chat/stream). */
export function parseUserPreferencesFromApi(raw: unknown): OndaUserPreferences {
  if (raw === null || raw === undefined) return { ...DEFAULT_ONDA_USER_PREFERENCES };
  if (typeof raw !== "object") return { ...DEFAULT_ONDA_USER_PREFERENCES };
  return mergeOndaUserPreferences(DEFAULT_ONDA_USER_PREFERENCES, raw as Partial<OndaUserPreferences>);
}

export function loadOndaUserPreferencesFromStorage(): OndaUserPreferences {
  if (typeof window === "undefined") return { ...DEFAULT_ONDA_USER_PREFERENCES };
  try {
    const s = localStorage.getItem(STORAGE_KEY_ONDA_USER_PREFERENCES);
    if (!s) return { ...DEFAULT_ONDA_USER_PREFERENCES };
    const j = JSON.parse(s) as unknown;
    return parseUserPreferencesFromApi(j);
  } catch {
    return { ...DEFAULT_ONDA_USER_PREFERENCES };
  }
}

/** Locale guardado (cliente); usar en saludos antes de hidratar React. */
export function readStoredChatLocale(): OndaChatLocale {
  if (typeof window === "undefined") return "es-LATAM";
  return loadOndaUserPreferencesFromStorage().locale;
}

export function saveOndaUserPreferencesToStorage(prefs: OndaUserPreferences): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_ONDA_USER_PREFERENCES, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

/** Si es true, no usar caché de respuesta corta (misma pregunta puede variar según prefs). */
export function shouldSkipCacheForInclusivePrefs(prefs: OndaUserPreferences | null | undefined): boolean {
  if (!prefs) return false;
  return JSON.stringify(prefs) !== JSON.stringify(DEFAULT_ONDA_USER_PREFERENCES);
}

export function isDefaultOndaUserPreferences(prefs: OndaUserPreferences): boolean {
  return JSON.stringify(prefs) === JSON.stringify(DEFAULT_ONDA_USER_PREFERENCES);
}
