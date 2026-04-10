/**
 * Sesión WhatsApp en @vercel/kv — eje, prefs e historial por número.
 * Key: wa:session:<phone> · TTL 7 días · Fallback Map solo en development.
 */

import { kv } from "@vercel/kv";
import {
  WA_CLARIFY_INTENT_PROMPT,
  WA_ONDA_CONFIRM_A_MANO,
  WA_ONDA_CONFIRM_CIVITA,
  WA_ONDA_CONFIRM_PROFES,
  WA_PROMPT_CHOOSE_ONDA_LONG,
  WA_PROMPT_CHOOSE_ONDA_SHORT,
} from "@/content/shared";
import { EjeOnda } from "@/content/types";
import type { HistoryEntry } from "@/lib/ondaReply";
import { inferChatLocaleFromMessage } from "@/lib/inferChatLocale";
import {
  DEFAULT_ONDA_USER_PREFERENCES,
  mergeOndaUserPreferences,
  type OndaUserPreferences,
} from "@/lib/userPreferences";
import {
  buildOndaPreferencesForRequest,
  DEFAULT_USER_PREFS,
  mergePrefs,
  normalizePrefs,
  type UserPrefs,
} from "@/lib/userPrefs";

export const WA_SESSION_TTL_SECONDS = 604800;
export const WA_HISTORY_MAX_MESSAGES = 10;

/** Mismo esquema que Web (`onda_prefs_v1`). */
export type WaPrefs = UserPrefs;

export type WaHistoryRole = "user" | "assistant";

export type WaSessionMessage = {
  role: WaHistoryRole;
  content: string;
  ts: number;
};

export type WaEjeKey = "A_MANO" | "CIVITA" | "PROFES";

export type WaSession = {
  eje: WaEjeKey | null;
  prefs: WaPrefs;
  history: WaSessionMessage[];
  updatedAt: number;
  /** Ya se envió la pregunta larga de elección de Onda */
  ejePromptShown?: boolean;
  /**
   * Resumen heurístico 1–2 líneas de turnos recortados del historial (conserva intención/tema).
   */
  summary?: string;
  /**
   * Preferencias Onda fusionadas (/onda, profundidad, lectura…).
   * En cada guardado se alinea con lo enviado al modelo; `prefs` (WaPrefs) se deriva para API explícita.
   */
  ondaMerged?: OndaUserPreferences | null;
};

function kvConfigured(): boolean {
  return !!(process.env.KV_REST_API_URL?.trim() && process.env.KV_REST_API_TOKEN?.trim());
}

function useDevMemory(): boolean {
  return process.env.NODE_ENV === "development";
}

function safePhone(phone: string): string {
  return String(phone).replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 200) || "unknown";
}

function sessionKey(phone: string): string {
  return `wa:session:${safePhone(phone)}`;
}

const mem = new Map<string, WaSession>();

export function defaultWaSession(): WaSession {
  return {
    eje: null,
    prefs: { ...DEFAULT_USER_PREFS },
    history: [],
    updatedAt: Date.now(),
    ejePromptShown: false,
    summary: undefined,
    ondaMerged: null,
  };
}

const SUMMARY_MAX_CHARS = 320;

function resolveSummaryLang(locale: WaPrefs["locale"], textSample: string): "pt" | "es" {
  if (locale === "es") return "es";
  if (locale === "pt") return "pt";
  return inferChatLocaleFromMessage(textSample, "pt-BR") === "es-LATAM" ? "es" : "pt";
}

/**
 * Resume mensajes que se van a descartar al aplicar el tope del historial (sin LLM).
 */
export function buildHeuristicHistorySummary(
  dropped: WaSessionMessage[],
  previousSummary: string | undefined,
  locale: WaPrefs["locale"]
): string {
  const blob = dropped.map((m) => m.content).join("\n");
  const userTexts = dropped
    .filter((m) => m.role === "user")
    .map((m) => m.content.trim())
    .filter(Boolean);
  const lastUser = userTexts.slice(-2).join(" ");
  const snippet = lastUser.slice(0, 120).replace(/\s+/g, " ").trim();
  const sl = resolveSummaryLang(locale, blob + lastUser);

  const hasLink = /https?:\/\//i.test(blob);
  const wantsAudio = /\b(áudio|audio|voz)\b/i.test(blob);
  const wantsInfo = /\b(infográf|infograf|diagrama|imagem\s+explicativa)\b/i.test(blob);
  const tags: string[] = [];
  if (hasLink) tags.push(sl === "es" ? "enlace" : "link");
  if (wantsAudio) tags.push(sl === "es" ? "audio" : "áudio");
  if (wantsInfo) tags.push(sl === "es" ? "infografía" : "infográfico");

  const focus =
    snippet || (sl === "es" ? "mensajes anteriores" : "mensagens anteriores");
  const tagPart = tags.length ? (sl === "es" ? `; pistas: ${tags.join(", ")}` : `; pistas: ${tags.join(", ")}`) : "";

  let line =
    sl === "es"
      ? `Contexto recortado: foco en «${focus}»${tagPart}.`
      : `Resumo do histórico cortado: foco em «${focus}»${tagPart}.`;

  if (previousSummary?.trim()) {
    const prev = previousSummary.trim().slice(0, 140);
    line = `${prev} … ${line}`;
  }

  return line.slice(0, SUMMARY_MAX_CHARS).trim();
}

/**
 * Aplica tope de historial y acumula resumen de lo eliminado en `session.summary`.
 */
export function applyHistoryCap(session: WaSession, history: WaSessionMessage[]): WaSession {
  if (history.length <= WA_HISTORY_MAX_MESSAGES) {
    return { ...session, history };
  }
  const dropped = history.slice(0, history.length - WA_HISTORY_MAX_MESSAGES);
  const kept = history.slice(-WA_HISTORY_MAX_MESSAGES);
  const summary = buildHeuristicHistorySummary(dropped, session.summary, session.prefs.locale);
  return { ...session, history: kept, summary };
}

function parseSession(raw: unknown): WaSession | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  let eje: WaEjeKey | null = null;
  if (o.eje === "A_MANO" || o.eje === "CIVITA" || o.eje === "PROFES") eje = o.eje;
  const rawPrefs =
    o.prefs && typeof o.prefs === "object" ? (o.prefs as Record<string, unknown>) : {};
  const prefs = normalizePrefs({
    ...rawPrefs,
    locale: rawPrefs.locale ?? rawPrefs.lang,
  });
  const history: WaSessionMessage[] = [];
  if (Array.isArray(o.history)) {
    for (const m of o.history) {
      if (typeof m !== "object" || m === null) continue;
      const r = (m as { role?: string }).role;
      const c = (m as { content?: string }).content;
      const ts = typeof (m as { ts?: number }).ts === "number" ? (m as { ts: number }).ts : Date.now();
      if ((r === "user" || r === "assistant") && typeof c === "string") {
        history.push({ role: r, content: c, ts });
      }
    }
  }
  let ondaMerged: OndaUserPreferences | null = null;
  if (o.ondaMerged && typeof o.ondaMerged === "object") {
    ondaMerged = mergeOndaUserPreferences(DEFAULT_ONDA_USER_PREFERENCES, o.ondaMerged as Partial<OndaUserPreferences>);
  }
  const summary =
    typeof o.summary === "string" && o.summary.trim() ? o.summary.trim().slice(0, 400) : undefined;
  const base: WaSession = {
    eje,
    prefs,
    history,
    updatedAt: typeof o.updatedAt === "number" ? o.updatedAt : Date.now(),
    ejePromptShown: Boolean(o.ejePromptShown),
    ondaMerged,
    summary,
  };
  return applyHistoryCap(base, history);
}

export async function getWaSession(phone: string): Promise<WaSession> {
  if (!phone || phone === "unknown") return defaultWaSession();
  const k = sessionKey(phone);
  if (!kvConfigured()) {
    if (useDevMemory()) return mem.get(k) ?? defaultWaSession();
    return defaultWaSession();
  }
  try {
    const raw = await kv.get<string>(k);
    if (raw == null || raw === "") return defaultWaSession();
    const parsed = parseSession(JSON.parse(raw));
    return parsed ?? defaultWaSession();
  } catch (e) {
    console.warn("[waSession] get fail-open:", e);
    if (useDevMemory()) return mem.get(k) ?? defaultWaSession();
    return defaultWaSession();
  }
}

export async function saveWaSession(phone: string, session: WaSession): Promise<void> {
  if (!phone || phone === "unknown") return;
  const k = sessionKey(phone);
  const capped = applyHistoryCap(session, session.history);
  const payload: WaSession = {
    ...capped,
    updatedAt: Date.now(),
  };
  if (!kvConfigured()) {
    if (useDevMemory()) mem.set(k, payload);
    return;
  }
  try {
    await kv.set(k, JSON.stringify(payload), { ex: WA_SESSION_TTL_SECONDS });
  } catch (e) {
    console.warn("[waSession] save fail-open:", e);
    if (useDevMemory()) mem.set(k, payload);
  }
}

export async function patchWaSession(
  phone: string,
  patch: Partial<Pick<WaSession, "eje" | "ejePromptShown" | "ondaMerged">> & {
    prefs?: Partial<WaPrefs>;
    history?: WaSessionMessage[];
  }
): Promise<WaSession> {
  const cur = await getWaSession(phone);
  const prefs: WaPrefs =
    patch.prefs !== undefined ? mergePrefs(cur.prefs, patch.prefs) : cur.prefs;
  const rawHistory = patch.history ?? cur.history;
  let next: WaSession = {
    eje: patch.eje !== undefined ? patch.eje : cur.eje,
    prefs,
    history: rawHistory,
    updatedAt: Date.now(),
    ejePromptShown: patch.ejePromptShown !== undefined ? patch.ejePromptShown : cur.ejePromptShown,
    ondaMerged: patch.ondaMerged !== undefined ? patch.ondaMerged : cur.ondaMerged,
    summary: cur.summary,
  };
  next = applyHistoryCap(next, next.history);
  await saveWaSession(phone, next);
  return next;
}

export function appendWaHistory(
  session: WaSession,
  userContent: string,
  assistantContent: string
): WaSession {
  const now = Date.now();
  const next = [...session.history];
  const u = (userContent || "").trim();
  const a = (assistantContent || "").trim();
  if (u) next.push({ role: "user", content: u, ts: now });
  if (a) next.push({ role: "assistant", content: a, ts: now + 1 });
  return applyHistoryCap({ ...session, updatedAt: now }, next);
}

export function waHistoryToOndaHistory(session: WaSession): HistoryEntry[] {
  const combined = session.history.map((m) => m.content).join("\n");
  const sl = resolveSummaryLang(session.prefs.locale, combined + (session.summary ?? ""));
  const base: HistoryEntry[] = session.history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    content: m.content,
  }));
  const s = session.summary?.trim();
  if (!s) return base;
  const prefix =
    sl === "es" ? `Resumen del contexto anterior: ${s}` : `Resumo do contexto anterior: ${s}`;
  return [{ role: "model", content: prefix }, ...base];
}

export function waEjeToEnum(e: WaEjeKey | null): EjeOnda | null {
  if (e === "A_MANO") return EjeOnda.A_MANO;
  if (e === "CIVITA") return EjeOnda.CIVITA;
  if (e === "PROFES") return EjeOnda.PROFES;
  return null;
}

export function enumToWaEje(e: EjeOnda | null): WaEjeKey | null {
  if (e === EjeOnda.A_MANO) return "A_MANO";
  if (e === EjeOnda.CIVITA) return "CIVITA";
  if (e === EjeOnda.PROFES) return "PROFES";
  return null;
}

/** Preferencias finales para el modelo: snapshot /onda + overrides de WaPrefs (idioma, formato, verbosidad). */
export function buildWaModelPreferences(
  session: WaSession,
  userText: string,
  inclusiveCommandPrefs?: OndaUserPreferences | null
): OndaUserPreferences {
  const base = mergeOndaUserPreferences(
    DEFAULT_ONDA_USER_PREFERENCES,
    session.ondaMerged ?? {}
  );
  let merged = buildOndaPreferencesForRequest(base, normalizePrefs(session.prefs), userText);
  if (inclusiveCommandPrefs) {
    merged = mergeOndaUserPreferences(merged, inclusiveCommandPrefs);
  }
  return merged;
}

export function waSessionToOndaPrefs(session: WaSession, userText: string): OndaUserPreferences {
  return buildOndaPreferencesForRequest(
    DEFAULT_ONDA_USER_PREFERENCES,
    normalizePrefs(session.prefs),
    userText
  );
}

/** Tras /onda u otro parche del parser inclusivo, volcar a WaPrefs. */
export function ondaPrefsToWaPrefsPatch(p: OndaUserPreferences): Partial<WaPrefs> {
  const locale: WaPrefs["locale"] =
    p.locale === "pt-BR" ? "pt" : p.locale === "es-LATAM" ? "es" : "auto";
  const format: WaPrefs["format"] =
    p.outputMode === "audio" ? "audio" : p.outputMode === "auto" ? "auto" : "texto";
  const verbosity: WaPrefs["verbosity"] =
    p.responseDepth === "simple"
      ? "curto"
      : p.responseDepth === "step_by_step"
        ? "longo"
        : "normal";
  return { locale, format, verbosity };
}

/** Sincroniza `prefs` y `ondaMerged` tras un turno con prefs de modelo resueltas. */
export function alignWaSessionAfterModelTurn(
  session: WaSession,
  prefsForModel: OndaUserPreferences
): WaSession {
  const prefsPatch = ondaPrefsToWaPrefsPatch(prefsForModel);
  return {
    ...session,
    prefs: { ...session.prefs, ...prefsPatch },
    ondaMerged: prefsForModel,
    updatedAt: Date.now(),
  };
}

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

const EJE_CONFIRM: Record<WaEjeKey, string> = {
  A_MANO: WA_ONDA_CONFIRM_A_MANO,
  CIVITA: WA_ONDA_CONFIRM_CIVITA,
  PROFES: WA_ONDA_CONFIRM_PROFES,
};

/**
 * Detecta comando de eje al inicio o mensaje solo con el nombre del perfil.
 */
export function consumeWaEjeCommand(
  text: string,
  session: WaSession
): {
  session: WaSession;
  confirmation: string | null;
  remainder: string;
} {
  const raw = (text || "").trim();
  if (!raw) return { session, confirmation: null, remainder: "" };

  const prefix =
    /^(a\s*mano|mão|mao|civita|cívita|profes|professores|professoras|profe)\s*[:.\-–]\s*(.+)$/i.exec(
      raw
    );
  if (prefix) {
    const head = prefix[1].toLowerCase();
    const rest = (prefix[2] ?? "").trim();
    const eje = headToEje(head);
    if (eje && rest.length > 0) {
      return {
        session: { ...session, eje, ejePromptShown: false, updatedAt: Date.now() },
        confirmation: null,
        remainder: rest,
      };
    }
  }

  const n = norm(raw);
  const compact = n.replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();

  const only: Array<{ re: RegExp; eje: WaEjeKey }> = [
    { re: /^(a\s*mano|amano|mao|mão|mano)$/, eje: "A_MANO" },
    { re: /^(civita|cívita)$/, eje: "CIVITA" },
    {
      re: /^(profes|professores|professoras|profe|professor|docentes)$/,
      eje: "PROFES",
    },
  ];
  for (const { re, eje } of only) {
    if (re.test(compact)) {
      return {
        session: { ...session, eje, ejePromptShown: false, updatedAt: Date.now() },
        confirmation: EJE_CONFIRM[eje],
        remainder: "",
      };
    }
  }

  return { session, confirmation: null, remainder: raw };
}

function headToEje(head: string): WaEjeKey | null {
  const h = head.replace(/\s+/g, " ").trim().toLowerCase();
  if (/^a\s*mano$|^mão$|^mao$/.test(h)) return "A_MANO";
  if (/^civita|cívita$/.test(h)) return "CIVITA";
  if (/^profes|professores|professoras|profe$|^professor$/.test(h)) return "PROFES";
  return null;
}

/** Si falta eje y hay texto de usuario, respuesta de bloqueo (pregunta 1 vez larga, luego corta). */
export function responseWhenEjeMissing(session: WaSession, userLine: string): { text: string; session: WaSession } | null {
  if (session.eje != null) return null;
  const line = (userLine || "").trim();
  if (!line) return null;
  if (!session.ejePromptShown) {
    return {
      text: WA_PROMPT_CHOOSE_ONDA_LONG,
      session: { ...session, ejePromptShown: true, updatedAt: Date.now() },
    };
  }
  return {
    text: WA_PROMPT_CHOOSE_ONDA_SHORT,
    session: { ...session, updatedAt: Date.now() },
  };
}

function isVagueUserIntent(text: string): boolean {
  const t = (text || "").trim();
  if (!t || t.length > 28) return false;
  const n = norm(t).replace(/[!?.…]+$/u, "").trim();
  if (/^(oi|ola|olá|opa|e\s*a[ií]|ei|hey|hi|hola)\.?$/iu.test(n)) return true;
  if (/^(ajuda|help|\?)$/.test(n)) return true;
  if (/^(bom\s*dia|boa\s*tarde|boa\s*noite|buenas)\.?$/iu.test(n)) return true;
  return false;
}

/** Con Onda ya elegida: saludo o mensaje demasiado vago → menú de intención (sin llamar al modelo). */
export function responseWhenVagueIntent(
  session: WaSession,
  userLine: string
): { text: string; session: WaSession } | null {
  if (session.eje == null) return null;
  if (!isVagueUserIntent(userLine)) return null;
  return {
    text: WA_CLARIFY_INTENT_PROMPT.trim(),
    session: { ...session, updatedAt: Date.now() },
  };
}

/** Heurística PT vs ES y frases explícitas. */
export function applyLanguageAndFormatFromText(session: WaSession, text: string): WaSession {
  const t = (text || "").trim();
  if (!t) return session;
  let prefs = { ...session.prefs };
  const lower = norm(t);

  if (/\bem\s+portugues\b|\bportugues\b|\bportuguês\b|\bidioma\s+pt\b/.test(lower)) {
    prefs.locale = "pt";
  } else if (/\ben\s+español\b|\bespañol\b|\bidioma\s+es\b/.test(lower)) {
    prefs.locale = "es";
  } else if (prefs.locale === "auto") {
    const ptTok =
      /\b(voce|você|não|nao|pra\b|muito|obrigad|como\s+faço|vocês)\b/.test(lower) ||
      /[ãõç]/.test(t);
    const esTok =
      /\b(quiero|puedo|ustedes|información|por\s+favor|gracias|qué\s+hago)\b/.test(lower) ||
      /¿|¡/.test(t);
    let ptScore = ptTok ? 2 : 0;
    let esScore = esTok ? 2 : 0;
    const words = lower.split(/\s+/);
    for (const w of words) {
      if (["não", "nao", "você", "voce", "muito"].includes(w)) ptScore += 1;
      if (["quiero", "puedo", "gracias", "información"].includes(w)) esScore += 1;
    }
    if (ptScore >= 2 && ptScore > esScore) prefs.locale = "pt";
    else if (esScore >= 2 && esScore > ptScore) prefs.locale = "es";
  }

  if (
    /\bem\s+áudio|\bem\s+audio|\bpor\s+áudio|\bpor\s+audio|\bno\s+áudio|\bo\s+áudio|\bresponda\s+em\s+áudio/i.test(
      t
    )
  ) {
    prefs.format = "audio";
  }
  if (/\binfográfico|\binfografico|\bimagem\s+explicativa|\bdiagrama\b/i.test(t)) {
    prefs.format = "infografia";
  }

  const compactCmd = lower.replace(/\s+/g, " ").trim();
  if (/^imagem\.?$/i.test(compactCmd)) {
    prefs.format = "infografia";
  }
  if (/^(texto|so\s+texto|só\s+texto)$/i.test(compactCmd)) {
    prefs.format = "texto";
  }
  if (/\bcom\s+fontes?\b/i.test(lower) || /\bcom\s+lista\s+de\s+fontes\b/i.test(lower)) {
    prefs.sources = true;
  }
  if (/\bsem\s+fontes?\b/i.test(lower)) {
    prefs.sources = false;
  }
  if (
    /^(curto|normal|longo)\.?$/i.test(compactCmd) ||
    /^modo\s+(curto|normal|longo)\.?$/i.test(compactCmd)
  ) {
    const vm = compactCmd.match(/(curto|normal|longo)/i);
    if (vm) {
      const v = vm[1].toLowerCase();
      if (v === "curto") prefs.verbosity = "curto";
      else if (v === "longo") prefs.verbosity = "longo";
      else prefs.verbosity = "normal";
    }
  }

  if (JSON.stringify(prefs) === JSON.stringify(session.prefs)) return session;
  return { ...session, prefs, updatedAt: Date.now() };
}

/** Prefijo para un turno con formato infografía (el modelo marca [ONDA_FORMATO:infografia]). */
export function maybeInfographicHint(session: WaSession, userLine: string): string {
  if (session.prefs.format !== "infografia") return userLine;
  if (/ONDA_FORMATO|infograf/i.test(userLine)) return userLine;
  return `[Pedido de infográfico] ${userLine}`;
}

/** Alias para código que ya usaba getSession/setSession. */
export const getSession = getWaSession;
export const setSession = saveWaSession;
