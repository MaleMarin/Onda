/**
 * Preferencias unificadas Web + WhatsApp (idioma, formato, longitud, fuentes).
 * Comandos de preferencia: solo coincidencia exacta del mensaje completo (sin falsos positivos en frases largas).
 */

import type { OndaChatLocale, OndaUserPreferences } from "@/lib/userPreferences";
import { mergeOndaUserPreferences } from "@/lib/userPreferences";

export type PrefLocale = "auto" | "pt" | "es";
export type PrefFormat = "auto" | "texto" | "audio" | "infografia";
export type PrefVerbosity = "curto" | "normal" | "longo";

export type UserPrefs = {
  locale: PrefLocale;
  format: PrefFormat;
  verbosity: PrefVerbosity;
  sources: boolean;
};

/** @deprecated usar PrefLocale */
export type UserPrefsLocale = PrefLocale;
/** @deprecated usar PrefFormat */
export type UserPrefsFormat = PrefFormat;
/** @deprecated usar PrefVerbosity */
export type UserPrefsVerbosity = PrefVerbosity;

export const DEFAULT_USER_PREFS: UserPrefs = {
  locale: "auto",
  format: "auto",
  verbosity: "normal",
  sources: false,
};

export const STORAGE_KEY_ONDA_PREFS_V1 = "onda_prefs_v1";

const LOCALES: PrefLocale[] = ["auto", "pt", "es"];
const FORMATS: PrefFormat[] = ["auto", "texto", "audio", "infografia"];
const VERBS: PrefVerbosity[] = ["curto", "normal", "longo"];

function pick<T extends string>(v: unknown, allowed: T[], fallback: T): T {
  return typeof v === "string" && allowed.includes(v as T) ? (v as T) : fallback;
}

export function normalizePrefs(raw: unknown): UserPrefs {
  if (raw === null || raw === undefined || typeof raw !== "object") {
    return { ...DEFAULT_USER_PREFS };
  }
  const o = raw as Record<string, unknown>;
  const localeRaw = o.locale ?? o.lang;
  return {
    locale: pick(localeRaw, LOCALES, DEFAULT_USER_PREFS.locale),
    format: pick(o.format, FORMATS, DEFAULT_USER_PREFS.format),
    verbosity: pick(o.verbosity, VERBS, DEFAULT_USER_PREFS.verbosity),
    sources: typeof o.sources === "boolean" ? o.sources : DEFAULT_USER_PREFS.sources,
  };
}

export function mergePrefs(base: UserPrefs, patch: Partial<UserPrefs> | null | undefined): UserPrefs {
  if (!patch || typeof patch !== "object") return { ...base };
  return {
    locale: pick(patch.locale, LOCALES, base.locale),
    format: pick(patch.format, FORMATS, base.format),
    verbosity: pick(patch.verbosity, VERBS, base.verbosity),
    sources: typeof patch.sources === "boolean" ? patch.sources : base.sources,
  };
}

function norm(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

/**
 * Señal de idioma por texto (heurística ligera; sin preferencia guardada).
 */
export function inferLocaleFromMessage(text: string): "pt" | "es" | "unknown" {
  const t = (text || "").trim();
  if (t.length < 4) return "unknown";
  const lower = norm(t);
  let ptScore = 0;
  let esScore = 0;
  if (
    /\b(nao|nao|voce|você|obrigad|como\s+faço|mensagem|preciso|hoje|assim|nesse|nesta|por\s+favor)\b/.test(lower)
  )
    ptScore += 2;
  if (/\b(gracias|necesito|donde|cuando|quiero|mensaje|hoy|asi|este|puedes|por\s+favor)\b/.test(lower))
    esScore += 2;
  if (/[ãõç]/.test(t)) ptScore += 1;
  if (/¿|¡/.test(t)) esScore += 1;
  for (const w of lower.split(/\s+/)) {
    if (["nao", "voce", "muito", "obrigado", "obrigada"].includes(w)) ptScore += 1;
    if (["gracias", "quieres", "podrias"].includes(w)) esScore += 1;
  }
  if (ptScore >= 2 && ptScore > esScore) return "pt";
  if (esScore >= 2 && esScore > ptScore) return "es";
  return "unknown";
}

/**
 * Mapea preferencias unificadas al locale del modelo inclusivo.
 * - pt → pt-BR, es → es-LATAM
 * - auto → inferencia por `fallbackFromText`; si unknown → pt-BR
 */
export function mapPrefsToOndaChatLocale(prefs: UserPrefs, fallbackFromText: string): OndaChatLocale {
  const u = normalizePrefs(prefs);
  if (u.locale === "pt") return "pt-BR";
  if (u.locale === "es") return "es-LATAM";
  const sig = inferLocaleFromMessage(fallbackFromText);
  if (sig === "pt") return "pt-BR";
  if (sig === "es") return "es-LATAM";
  return "pt-BR";
}

/** @deprecated usar mapPrefsToOndaChatLocale */
export function resolveOndaLocale(unified: UserPrefs, userText: string): OndaChatLocale {
  return mapPrefsToOndaChatLocale(unified, userText);
}

function labelLocalePt(l: PrefLocale): string {
  if (l === "pt") return "PT";
  if (l === "es") return "ES";
  return "AUTO";
}

function labelLocaleEs(l: PrefLocale): string {
  if (l === "pt") return "PT";
  if (l === "es") return "ES";
  return "AUTO";
}

function labelFormatPt(f: PrefFormat): string {
  const m: Record<PrefFormat, string> = {
    auto: "auto",
    texto: "texto",
    audio: "áudio",
    infografia: "infográfico",
  };
  return m[f];
}

function labelFormatEs(f: PrefFormat): string {
  const m: Record<PrefFormat, string> = {
    auto: "auto",
    texto: "texto",
    audio: "audio",
    infografia: "infografía",
  };
  return m[f];
}

function labelVerbPt(v: PrefVerbosity): string {
  return v;
}

function labelVerbEs(v: PrefVerbosity): string {
  if (v === "curto") return "corto";
  if (v === "longo") return "largo";
  return "normal";
}

/** Textos de confirmación tras aplicar el parche (estado completo tras merge). */
export function buildPreferenceAckTexts(merged: UserPrefs): { pt: string; es: string } {
  const m = normalizePrefs(merged);
  const pt = `Preferências atualizadas: idioma=${labelLocalePt(m.locale)}, formato=${labelFormatPt(m.format)}, tamanho=${labelVerbPt(m.verbosity)}, fontes=${m.sources ? "sim" : "não"}.`;
  const es = `Preferencias actualizadas: idioma=${labelLocaleEs(m.locale)}, formato=${labelFormatEs(m.format)}, longitud=${labelVerbEs(m.verbosity)}, fuentes=${m.sources ? "sí" : "no"}.`;
  return { pt, es };
}

/** Elige PT o ES según el locale efectivo tras el comando. */
export function pickPreferenceAck(merged: UserPrefs, ack: { pt: string; es: string }, fallbackUiLocale?: OndaChatLocale): string {
  const m = normalizePrefs(merged);
  if (m.locale === "es") return ack.es;
  if (m.locale === "pt") return ack.pt;
  if (fallbackUiLocale === "es-LATAM") return ack.es;
  return ack.pt;
}

/**
 * Comando de preferencia solo si el mensaje completo coincide exactamente (tras normalizar tildes/minúsculas).
 */
export function parsePreferenceCommand(
  text: string,
  currentPrefs: UserPrefs
): { type: "prefs_update"; patch: Partial<UserPrefs>; ackText: { pt: string; es: string } } | null {
  const raw = (text ?? "").trim();
  if (!raw) return null;
  const key = norm(raw);
  const patch = PURE_PREF_CMD.get(key);
  if (!patch) return null;
  const merged = mergePrefs(currentPrefs, patch);
  return {
    type: "prefs_update",
    patch,
    ackText: buildPreferenceAckTexts(merged),
  };
}

/** Mapa: norm(mensaje) → parche parcial (un solo comando por mensaje). */
const PURE_PREF_CMD = buildPurePrefCommandMap();

function buildPurePrefCommandMap(): Map<string, Partial<UserPrefs>> {
  const m = new Map<string, Partial<UserPrefs>>();
  const add = (s: string, p: Partial<UserPrefs>) => {
    m.set(norm(s), p);
  };
  // Idioma
  add("pt", { locale: "pt" });
  add("portugues", { locale: "pt" });
  add("português", { locale: "pt" });
  add("es", { locale: "es" });
  add("espanol", { locale: "es" });
  add("español", { locale: "es" });
  add("auto", { locale: "auto" });
  // Formato
  add("texto", { format: "texto" });
  add("só texto", { format: "texto" });
  add("so texto", { format: "texto" });
  add("solo texto", { format: "texto" });
  add("audio", { format: "audio" });
  add("áudio", { format: "audio" });
  add("en audio", { format: "audio" });
  add("em audio", { format: "audio" });
  add("em áudio", { format: "audio" });
  add("por voz", { format: "audio" });
  add("infografia", { format: "infografia" });
  add("infográfico", { format: "infografia" });
  add("infografico", { format: "infografia" });
  add("infografía", { format: "infografia" });
  add("diagrama", { format: "infografia" });
  add("formato auto", { format: "auto" });
  // Longitud
  add("curto", { verbosity: "curto" });
  add("corto", { verbosity: "curto" });
  add("normal", { verbosity: "normal" });
  add("longo", { verbosity: "longo" });
  add("largo", { verbosity: "longo" });
  // Fuentes
  add("com fontes", { sources: true });
  add("con fuentes", { sources: true });
  add("sem fontes", { sources: false });
  add("sin fuentes", { sources: false });
  return m;
}

/**
 * Pedido explícito de formato en el mensaje (este turno manda sobre prefs.format).
 * No usa solo match exacto: detecta frases como "responde em áudio".
 */
export function shouldForceFormat(prefs: UserPrefs, userText: string): PrefFormat | null {
  void prefs;
  const t = (userText || "").trim();
  const lower = norm(t);
  if (
    /\bem\s+áudio\b|\bem\s+audio\b|\bpor\s+áudio\b|\bpor\s+audio\b|\bno\s+áudio\b|\ben\s+voz\b|\bpor\s+voz\b|\bresponda\s+em\s+áudio\b/i.test(
      t
    ) ||
    /^áudio\.?$/i.test(lower) ||
    /^audio\.?$/i.test(lower)
  ) {
    return "audio";
  }
  if (
    /\binfográfico\b|\binfografico\b|\binfografía\b|\binfografia\b|\bdiagrama\b|\bimagem\s+explicativa\b/i.test(t)
  ) {
    return "infografia";
  }
  if (
    /^texto\.?$/i.test(lower) ||
    /^so\s+texto\.?$/i.test(lower) ||
    /^só\s+texto\.?$/i.test(lower) ||
    /^solo\s+texto\.?$/i.test(lower)
  ) {
    return "texto";
  }
  return null;
}

/** Formato efectivo: mensaje explícito > prefs. */
export function effectiveFormat(unified: UserPrefs, userText: string): PrefFormat {
  const forced = shouldForceFormat(unified, userText);
  if (forced) return forced;
  return unified.format;
}

/** Mapea verbosidad unificada a profundidad del modelo inclusivo. */
export function verbosityToResponseDepth(v: PrefVerbosity): OndaUserPreferences["responseDepth"] {
  switch (v) {
    case "curto":
      return "simple";
    case "longo":
      return "step_by_step";
    case "normal":
    default:
      return "detailed";
  }
}

/**
 * Fusiona preferencias inclusivas (panel) + unificadas (onda_prefs_v1 / WA) + texto del turno.
 */
export function buildOndaPreferencesForRequest(
  inclusive: OndaUserPreferences,
  unified: UserPrefs,
  userText: string
): OndaUserPreferences {
  const u = normalizePrefs(unified);
  const eff = effectiveFormat(u, userText);
  const outputMode: OndaUserPreferences["outputMode"] =
    eff === "audio" ? "audio" : eff === "auto" ? "auto" : "text";

  return mergeOndaUserPreferences(inclusive, {
    locale: mapPrefsToOndaChatLocale(u, userText),
    outputMode,
    responseDepth: verbosityToResponseDepth(u.verbosity),
  });
}

/** Prefijo de infográfico alineado con WhatsApp (`maybeInfographicHint`). */
export function maybeInfographicUserPrefix(unified: UserPrefs, userText: string): string {
  const eff = effectiveFormat(unified, userText);
  if (eff !== "infografia") return userText;
  if (/ONDA_FORMATO|infograf/i.test(userText)) return userText;
  return `[Pedido de infográfico] ${userText}`;
}

export function parseUserPrefsFromApi(raw: unknown): UserPrefs {
  return normalizePrefs(raw);
}

export function loadUnifiedPrefsFromStorage(): UserPrefs {
  if (typeof window === "undefined") return { ...DEFAULT_USER_PREFS };
  try {
    const s = localStorage.getItem(STORAGE_KEY_ONDA_PREFS_V1);
    if (!s) return { ...DEFAULT_USER_PREFS };
    return normalizePrefs(JSON.parse(s) as unknown);
  } catch {
    return { ...DEFAULT_USER_PREFS };
  }
}

export function saveUnifiedPrefsToStorage(prefs: UserPrefs): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_ONDA_PREFS_V1, JSON.stringify(normalizePrefs(prefs)));
  } catch {
    /* ignore */
  }
}

export function isDefaultUserPrefs(p: UserPrefs): boolean {
  return JSON.stringify(normalizePrefs(p)) === JSON.stringify(DEFAULT_USER_PREFS);
}

/** Convierte preferencias Onda (panel inclusivo) a parche UserPrefs (p. ej. tras cargar storage). */
export function ondaLocaleToUnifiedLocale(locale: OndaChatLocale): PrefLocale {
  if (locale === "pt-BR") return "pt";
  if (locale === "es-LATAM") return "es";
  return "auto";
}

export function unifiedLocaleToOndaLocale(l: PrefLocale, userText: string): OndaChatLocale {
  return mapPrefsToOndaChatLocale({ ...DEFAULT_USER_PREFS, locale: l }, userText);
}

/**
 * Locale efectivo persistido (onda_prefs_v1 + inferencia auto con texto vacío).
 * Usar en saludos antes de hidratar React para alinear con la fuente única de idioma.
 */
export function readEffectiveChatLocaleFromStorage(): OndaChatLocale {
  if (typeof window === "undefined") return "pt-BR";
  const u = loadUnifiedPrefsFromStorage();
  return mapPrefsToOndaChatLocale(u, "");
}

/** Si idioma unificado es `auto` y el mensaje del usuario permite inferir pt/es, devuelve prefs actualizadas para persistir. */
export function persistAutoInferredUnifiedLocale(unified: UserPrefs, userMessage: string): UserPrefs | null {
  const u = normalizePrefs(unified);
  if (u.locale !== "auto") return null;
  const sig = inferLocaleFromMessage(userMessage);
  if (sig === "unknown") return null;
  return { ...u, locale: sig };
}

/**
 * Refuerzo de system prompt: una sola lengua en la respuesta del modelo (alineado a `effectiveLocale` ya resuelto en la petición).
 */
export function buildOutputLanguageLockAppend(
  ondaLocale: OndaChatLocale,
  unifiedUserPrefs: UserPrefs | null | undefined
): string {
  const u = normalizePrefs(unifiedUserPrefs ?? DEFAULT_USER_PREFS);
  const auto = u.locale === "auto";
  if (ondaLocale === "pt-BR") {
    if (auto) {
      return "\n\n--- IDIOMA (preferência automática) ---\nEscreva TODA a resposta em português brasileiro (pt-BR) coerente com a mensagem da pessoa. Não misture espanhol na mesma resposta.";
    }
    return "\n\n--- IDIOMA (fixo: pt-BR) ---\nEscreva TODA a resposta em português brasileiro correto. É proibido misturar espanhol ou frases híbridas.";
  }
  if (auto) {
    return "\n\n--- IDIOMA (preferencia automática) ---\nEscribe TODA la respuesta en español neutro latinoamericano coherente con el mensaje de la persona. No mezcles portugués en la misma respuesta.";
  }
  return "\n\n--- IDIOMA (fijo: español) ---\nEscribe TODA la respuesta en español neutro latinoamericano. Está prohibido mezclar portugués o frases híbridas.";
}

/**
 * Refuerzo de system prompt cuando hay preferencias de formato unificadas (no sustituye pedido explícito en el mensaje: ya va en effectiveFormat).
 */
export function buildUnifiedFormatPromptAppend(userText: string, unified: UserPrefs | null | undefined): string {
  if (!unified) return "";
  const u = normalizePrefs(unified);
  const eff = effectiveFormat(u, userText);
  if (eff === "auto") return "";
  if (eff === "audio") {
    return `
--- PREFERENCIA DE FORMATO (cuenta unificada) ---
La persona eligió audio para esta respuesta. Abre con la marca exacta [ONDA_FORMATO:audio] y redacta un guion breve para leer en voz (frases cortas).`.trim();
  }
  if (eff === "infografia") {
    return `
--- PREFERENCIA DE FORMATO (cuenta unificada) ---
La persona eligió infografía. Cumple la estructura de infografía Onda y cierra con [ONDA_FORMATO:infografia].`.trim();
  }
  if (eff === "texto") {
    return `
--- PREFERENCIA DE FORMATO (cuenta unificada) ---
La persona eligió solo texto. Cierra la respuesta con [ONDA_FORMATO:texto].`.trim();
  }
  return "";
}
