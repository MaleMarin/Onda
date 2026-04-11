"use client";

/**
 * UI del chat Onda. Cambios estéticos: ver .cursor/rules/onda-ui-no-romper-interactividad.mdc
 * No tocar: onClick/onSubmit en botones y form; no añadir pointer-events:none ni overlays sobre .onda-shell.
 */

import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useCallback,
  type CSSProperties,
} from "react";
import {
  isStalePickerGreeting,
  migrateMainWelcomeClosingCopy,
  MAIN_WELCOME,
  EJE_CONFIGS,
  EJE_MENU_OPTIONS,
  IA_SUBMENU_OPTIONS,
  ORDERED_EJES,
} from "@/content/shared";
import { formatMenuIntro } from "@/content/menuQuestions";
import { displayMenuOptionLabel, userPickedMenuOption } from "@/content/menus";
import { EjeOnda, type Message } from "@/content/types";
import { parseResponseFormat } from "@/lib/responseFormat";
import { consumeChatNdjsonStream } from "@/lib/chatStreamClient";
import { computeWebPlayAudioDecision } from "@/lib/playAudioContract";
import { useOndaTheme } from "@/lib/useOndaTheme";
import { ondaStyles } from "@/lib/ondaStyles";
import { ChatBubble } from "./components/ChatBubble";
import { EjeSelector } from "./components/EjeSelector";
import { OfflineBanner, type HealthBannerStatus } from "./components/OfflineBanner";
import { InclusionSettingsPanel } from "./components/InclusionSettingsPanel";
import {
  buildEjePickerAriaLabel,
  getChatMicrocopy,
  getChatInputAriaLabel,
  getEjeCardSubtitle,
  getInclusionUiStrings,
} from "@/lib/chatI18n";
import { mergeOndaUserPreferences } from "@/lib/userPreferences";
import type { OndaChatLocale, OndaUserPreferences } from "@/lib/userPreferences";
import {
  DEFAULT_USER_PREFS,
  loadUnifiedPrefsFromStorage,
  mapPrefsToOndaChatLocale,
  mergePrefs,
  normalizePrefs,
  ondaLocaleToUnifiedLocale,
  parsePreferenceCommand,
  persistAutoInferredUnifiedLocale,
  pickPreferenceAck,
  saveUnifiedPrefsToStorage,
  unifiedLocaleToOndaLocale,
  type UserPrefs,
} from "@/lib/userPrefs";
import {
  getLocalizedGreetingNewDay,
  getLocalizedMainWelcome,
  getLocalizedMessageAfterPickerChoice,
  getLocalizedWelcomeWithPreferredEje,
  getLocalizedWelcomeWithTema,
} from "@/lib/welcomeI18n";
import { useOndaUserPreferences } from "@/lib/useOndaUserPreferences";
import { PRECISAR_PUBLIC_SITE_URL } from "@/lib/precisarPublicSite";
import { warnLocaleMixInDev } from "@/lib/localeMixGuard";

/** Textos de la superficie del chat siempre en español neutro (respuestas del modelo siguen la preferencia guardada). */
const CHAT_UI_LOCALE: OndaChatLocale = "es-LATAM";

const CHAT_INPUT_PLACEHOLDER = "Escribe tu pregunta o pega un link...";

const VOLVER_AL_INICIO = "Volver al inicio";

function newMessage(role: "user" | "model", content: string, extra?: Partial<Message>): Message {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    timestamp: Date.now(),
    ...extra,
  };
}

/** Primer mensaje idéntico en servidor y cliente (evita hydration mismatch: no UUID aleatorio ni reloj). */
const HYDRATION_SAFE_INITIAL_MESSAGE: Message = {
  id: "onda-hydration-placeholder",
  role: "model",
  content: MAIN_WELCOME,
  timestamp: 0,
};

const URL_REGEX = /\b(https?:\/\/\S+|www\.\S+)/i;
function hasUrl(text: string): boolean {
  return URL_REGEX.test(text);
}

/** Comprime la imagen para que el envío no supere límites (body/API). Máx 1200px ancho, JPEG 0.82. */
function compressImage(dataUrl: string): Promise<string> {
  const maxWidth = 1200;
  const quality = 0.82;
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!dataUrl.startsWith("data:")) img.crossOrigin = "anonymous";
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const scale = w > maxWidth ? maxWidth / w : 1;
      const cw = Math.round(w * scale);
      const ch = Math.round(h * scale);
      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, cw, ch);
      try {
        const out = canvas.toDataURL("image/jpeg", quality);
        resolve(out);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
    img.src = dataUrl;
  });
}

const STORAGE_KEY_VISITED = "onda_visited";
const STORAGE_KEY_RESTORE = "onda_chat_restore";
const STORAGE_KEY_PREFERRED = "onda_preferida";
const STORAGE_KEY_ULTIMO_TEMA = "onda_ultimo_tema";
/** Recupera `?eje=` tras remount en React Strict Mode (dev): el primer paso hace replaceState y la URL queda sin query. */
const SESSION_KEY_PENDING_EJE_QUERY = "onda_pending_eje_query";
const RESTORE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 días
/** Si la última actividad fue hace más de 12 h o en otro día, se considera "nuevo día" y se muestra saludo contextual. */
const SAME_SESSION_MS = 12 * 60 * 60 * 1000;

function isSameCalendarDay(ts1: number, ts2: number): boolean {
  return new Date(ts1).toDateString() === new Date(ts2).toDateString();
}

function isWithinSameSession(savedAt: number): boolean {
  return isSameCalendarDay(savedAt, Date.now()) && Date.now() - savedAt < SAME_SESSION_MS;
}

function getPreferredEjeFromStorage(): EjeOnda | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(STORAGE_KEY_PREFERRED);
  if (v === EjeOnda.A_MANO || v === EjeOnda.CIVITA || v === EjeOnda.PROFES) return v as EjeOnda;
  return null;
}

/** Lee `eje` de la query o de sessionStorage si Strict Mode ya borró la query (misma carga de página). */
function peekEjeQueryParamWithStrictRecovery(): { eje: EjeOnda | null; hadInSearch: boolean } {
  if (typeof window === "undefined") return { eje: null, hadInSearch: false };
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("eje");
  if (raw === EjeOnda.A_MANO || raw === EjeOnda.CIVITA || raw === EjeOnda.PROFES) {
    try {
      sessionStorage.setItem(SESSION_KEY_PENDING_EJE_QUERY, raw);
    } catch {
      /* ignore */
    }
    return { eje: raw as EjeOnda, hadInSearch: true };
  }
  try {
    const pending = sessionStorage.getItem(SESSION_KEY_PENDING_EJE_QUERY);
    if (pending === EjeOnda.A_MANO || pending === EjeOnda.CIVITA || pending === EjeOnda.PROFES) {
      return { eje: pending as EjeOnda, hadInSearch: false };
    }
  } catch {
    /* ignore */
  }
  return { eje: null, hadInSearch: false };
}

/** Ordena mensajes por timestamp para que el historial no tenga saltos temporales. */
function sortMessagesByTimestamp(messages: Message[]): Message[] {
  return [...messages].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
}

type UserCheckResult = {
  initialMessage: string;
  shouldRestore: boolean;
  restoredMessages: Message[] | null;
  restoredEje: EjeOnda | null;
  /** Última Onda guardada en localStorage (para resaltar botón y bienvenida personalizada). */
  preferredEje: EjeOnda | null;
};

/**
 * Jerarquía de saludos (useUserCheck):
 * 1. Tema guardado (onda_ultimo_tema) → "¿Seguimos trabajando en [tema] o buscamos nuevas evidencias hoy?"
 * 2. Onda preferida (onda_preferida) → "¿Quieres continuar ahí o exploramos una nueva hoy?"
 * 3. Nuevo día → "¡Hola de nuevo hoy! Qué bueno verte este [Día]. ¿Qué onda activamos hoy?"
 * 4. Usuario nuevo → bienvenida larga con las 3 Ondas.
 * Regla 12 h: si última actividad > 12 h, se borra onda_chat_restore pero se MANTIENEN onda_preferida y onda_ultimo_tema para el saludo.
 */
function useUserCheck(): UserCheckResult | null {
  const [result, setResult] = useState<UserCheckResult | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const locale = CHAT_UI_LOCALE;
    const visited = localStorage.getItem(STORAGE_KEY_VISITED) === "1";
    const raw = localStorage.getItem(STORAGE_KEY_RESTORE);

    // Usuario nuevo: bienvenida extendida explicando las 3 Ondas
    if (!visited) {
      localStorage.setItem(STORAGE_KEY_VISITED, "1");
      setResult({
        initialMessage: getLocalizedMainWelcome(locale),
        shouldRestore: false,
        restoredMessages: null,
        restoredEje: null,
        preferredEje: null,
      });
      return;
    }

    // Usuario conocido: revisar si hay restore válido
    if (raw) {
      try {
        const r = JSON.parse(raw) as {
          messages?: Message[];
          currentEje?: EjeOnda | null;
          savedAt?: number;
        };
        if (
          r.savedAt != null &&
          Date.now() - r.savedAt < RESTORE_MAX_AGE_MS &&
          Array.isArray(r.messages) &&
          r.messages.length > 0
        ) {
          if (isWithinSameSession(r.savedAt)) {
            // Misma sesión: restaurar y no mostrar mensaje nuevo (scroll al final)
            const sorted = sortMessagesByTimestamp(r.messages).map((m) =>
              m.role === "model" && typeof m.content === "string"
                ? { ...m, content: migrateMainWelcomeClosingCopy(m.content) }
                : m
            );
            const inferred = inferEjeFromMessagesStatic(sorted);
            const restoredEje = inferred ?? r.currentEje ?? null;
            setResult({
              initialMessage: "",
              shouldRestore: true,
              restoredMessages: sorted,
              restoredEje,
              preferredEje: null,
            });
            return;
          }
          // Regla de las 12 h: borrar solo onda_chat_restore; MANTENER onda_preferida y onda_ultimo_tema para el saludo
          localStorage.removeItem(STORAGE_KEY_RESTORE);
          const temaNewDay = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY_ULTIMO_TEMA)?.trim() : null;
          const preferredNewDay = getPreferredEjeFromStorage();
          const initialNewDay = temaNewDay
            ? getLocalizedWelcomeWithTema(temaNewDay, locale)
            : preferredNewDay
              ? getLocalizedWelcomeWithPreferredEje(preferredNewDay, locale)
              : getLocalizedGreetingNewDay(r.currentEje ?? null, locale);
          setResult({
            initialMessage: initialNewDay,
            shouldRestore: false,
            restoredMessages: null,
            restoredEje: null,
            preferredEje: preferredNewDay,
          });
          return;
        }
      } catch {
        // ignore
      }
    }

    // Conocido, sin restore (o expirado): jerarquía 1º tema → 2º preferida → 3º saludo nuevo día
    const tema = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY_ULTIMO_TEMA)?.trim() : null;
    const preferred = getPreferredEjeFromStorage();
    const initial = tema
      ? getLocalizedWelcomeWithTema(tema, locale)
      : preferred
        ? getLocalizedWelcomeWithPreferredEje(preferred, locale)
        : getLocalizedGreetingNewDay(null, locale);
    setResult({
      initialMessage: initial,
      shouldRestore: false,
      restoredMessages: null,
      restoredEje: null,
      preferredEje: preferred,
    });
  }, []);

  return result;
}

/** Versión estática de inferEjeFromMessages para usar dentro del hook (sin depender del estado del componente). */
function inferEjeFromMessagesStatic(messages: Message[]): EjeOnda | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role !== "user") continue;
    const label = messages[i].content;
    for (const eje of ORDERED_EJES) {
      if (EJE_MENU_OPTIONS[eje].some((o) => userPickedMenuOption(o, label))) return eje;
      if (eje === EjeOnda.A_MANO && IA_SUBMENU_OPTIONS.some((o) => userPickedMenuOption(o, label))) return eje;
    }
    break;
  }
  return null;
}

/** Sustituye el saludo “elige Onda” por un texto alineado con la Onda elegida (evita que siga mencionando otra Onda). */
function syncFirstBubbleAfterEjeChoice(messages: Message[], eje: EjeOnda, locale: OndaChatLocale): Message[] {
  if (messages.length === 0) return messages;
  const first = messages[0];
  if (first.role !== "model" || first.isGenerated || !isStalePickerGreeting(first.content)) {
    return messages;
  }
  return [{ ...first, content: getLocalizedMessageAfterPickerChoice(eje, locale) }, ...messages.slice(1)];
}

/** Session/conversation id anónimo para métricas (persiste en la pestaña). */
function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  const key = "onda_session_id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

/** Métricas de uso anónimas (fire-and-forget). */
function trackUsage(
  event: "eje_select" | "message_sent" | "session_start",
  eje?: EjeOnda | null,
  extra?: { responseTimeMs?: number }
) {
  if (typeof window === "undefined") return;
  const sessionId = getOrCreateSessionId();
  const payload = JSON.stringify({
    event,
    eje: eje ?? undefined,
    sessionId,
    responseTimeMs: extra?.responseTimeMs,
  });
  fetch("/api/usage", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(() => {});
}

export type ChatPageContentProps = { initialEje?: EjeOnda | null };

export function ChatPageContent({ initialEje = null }: ChatPageContentProps) {
  const t = useOndaTheme(true);
  const S = useMemo(() => ondaStyles(t), [t]);
  const { prefs: userPrefs, setPrefs: setUserPrefs, hydrated: prefsHydrated } = useOndaUserPreferences();
  const [unifiedPrefs, setUnifiedPrefs] = useState<UserPrefs>(DEFAULT_USER_PREFS);
  useEffect(() => {
    setUnifiedPrefs(loadUnifiedPrefsFromStorage());
  }, []);
  const [inclusionPanelOpen, setInclusionPanelOpen] = useState(false);

  const userCheckResult = useUserCheck();
  const hasAppliedUserCheckRef = useRef(false);

  const [messages, setMessages] = useState<Message[]>(() => [HYDRATION_SAFE_INITIAL_MESSAGE]);
  const [currentEje, setCurrentEje] = useState<EjeOnda | null>(initialEje);
  const [preferredEjeForDisplay, setPreferredEjeForDisplay] = useState<EjeOnda | null>(null);

  /** Último mensaje de usuario con texto: inferencia de idioma cuando unified.locale === "auto". */
  const lastUserTextForLocale = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        const c = (messages[i].content ?? "").trim();
        if (c) return c;
      }
    }
    return "";
  }, [messages]);

  /** Fuente única de verdad de idioma en web: onda_prefs_v1 + inferencia por mensaje si auto. */
  const effectiveChatLocale = useMemo(
    () => mapPrefsToOndaChatLocale(normalizePrefs(unifiedPrefs), lastUserTextForLocale),
    [unifiedPrefs, lastUserTextForLocale]
  );

  useEffect(() => {
    if (!prefsHydrated) return;
    if (userPrefs.locale !== effectiveChatLocale) {
      setUserPrefs((prev) =>
        prev.locale === effectiveChatLocale ? prev : { ...prev, locale: effectiveChatLocale }
      );
    }
  }, [prefsHydrated, effectiveChatLocale, userPrefs.locale, setUserPrefs]);

  const setInclusivePrefs = useCallback(
    (next: OndaUserPreferences) => {
      setUserPrefs(next);
      const ul = ondaLocaleToUnifiedLocale(next.locale);
      setUnifiedPrefs((prev) => {
        const merged = mergePrefs(prev, { locale: ul });
        saveUnifiedPrefsToStorage(merged);
        return merged;
      });
    },
    [setUserPrefs]
  );

  const mc = useMemo(() => getChatMicrocopy(CHAT_UI_LOCALE), []);
  const inclusionStrings = useMemo(() => getInclusionUiStrings(CHAT_UI_LOCALE), []);

  useEffect(() => {
    const snippets = ORDERED_EJES.map((eje) => getEjeCardSubtitle(CHAT_UI_LOCALE, eje)).concat([
      CHAT_INPUT_PLACEHOLDER,
      getLocalizedGreetingNewDay(null, CHAT_UI_LOCALE),
    ]);
    warnLocaleMixInDev(effectiveChatLocale, snippets, "chat-ui-static");
  }, [effectiveChatLocale]);

  const [embed, setEmbed] = useState(false);
  useEffect(() => {
    setEmbed(new URLSearchParams(window.location.search).get("embed") === "1");
  }, []);

  /** Aplica el resultado de useUserCheck una sola vez (Nuevo / Conocido misma sesión / Conocido nuevo día). */
  useEffect(() => {
    if (userCheckResult == null || hasAppliedUserCheckRef.current) return;
    hasAppliedUserCheckRef.current = true;
    setPreferredEjeForDisplay(userCheckResult.preferredEje ?? null);
    if (userCheckResult.shouldRestore && userCheckResult.restoredMessages && userCheckResult.restoredMessages.length > 0) {
      setMessages(userCheckResult.restoredMessages);
      setCurrentEje(userCheckResult.restoredEje ?? null);
    } else {
      setMessages([
        newMessage("model", migrateMainWelcomeClosingCopy(userCheckResult.initialMessage)),
      ]);
      setCurrentEje(null);
    }
    trackUsage("session_start", userCheckResult.restoredEje ?? null);

    // Tras fijar el saludo: si la URL trae ?eje=, aplica esa Onda (evita carrera con el efecto anterior y alinea bienvenida + pestaña).
    if (typeof window === "undefined" || userCheckResult.shouldRestore) return;
    const params = new URLSearchParams(window.location.search);
    const { eje: ejeFromQuery, hadInSearch } = peekEjeQueryParamWithStrictRecovery();
    if (ejeFromQuery) {
      const eje = ejeFromQuery;
      localStorage.setItem(STORAGE_KEY_PREFERRED, eje);
      setPreferredEjeForDisplay(eje);
      setCurrentEje(eje);
      setMessages((prev) => syncFirstBubbleAfterEjeChoice(prev, eje, CHAT_UI_LOCALE));
      trackUsage("eje_select", eje);
      params.delete("eje");
      const newSearch = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (newSearch ? "?" + newSearch : ""));
      if (!hadInSearch) {
        try {
          sessionStorage.removeItem(SESSION_KEY_PENDING_EJE_QUERY);
        } catch {
          /* ignore */
        }
      }
    }
  }, [userCheckResult]);

  /** Limpia el respaldo de `?eje=` en sessionStorage tras aplicar (un solo montaje en prod; en dev, tras el segundo paso de Strict Mode). */
  useEffect(() => {
    if (typeof window === "undefined" || currentEje === null) return;
    const t = window.setTimeout(() => {
      try {
        sessionStorage.removeItem(SESSION_KEY_PENDING_EJE_QUERY);
      } catch {
        /* ignore */
      }
    }, 300);
    return () => clearTimeout(t);
  }, [currentEje]);

  /** Inferir Onda desde el último mensaje de usuario (ej. ítem de menú) para que pestaña y chips coincidan con la conversación. */
  function inferEjeFromMessages(messages: Message[]): EjeOnda | null {
    return inferEjeFromMessagesStatic(messages);
  }

  /** Persistir conversación para retomar sin login (últimos 30 mensajes). */
  useEffect(() => {
    if (typeof window === "undefined" || messages.length === 0) return;
    const id = setTimeout(() => {
      const payload = {
        messages: messages.slice(-30),
        currentEje,
        savedAt: Date.now(),
      };
      try {
        localStorage.setItem(STORAGE_KEY_RESTORE, JSON.stringify(payload));
      } catch {
        // ignore quota etc.
      }
    }, 1200);
    return () => clearTimeout(id);
  }, [messages, currentEje]);

  const [input, setInput] = useState("");
  const [attachmentImage, setAttachmentImage] = useState<string | null>(null);
  const [attachmentAudio, setAttachmentAudio] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [audioTooShortHint, setAudioTooShortHint] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [loading, setLoading] = useState(false);
  /** Anuncio único al terminar el stream (lectores de pantalla; no un chunk por token). */
  const [streamDoneAnnouncement, setStreamDoneAnnouncement] = useState("");
  const prevLoadingForA11yRef = useRef(false);
  const [showPickOndaNotice, setShowPickOndaNotice] = useState(false);
  const [highlightOndaButtons, setHighlightOndaButtons] = useState(false);
  const [showEnviarTooltip, setShowEnviarTooltip] = useState(false);
  const [justSwitchedEje, setJustSwitchedEje] = useState<EjeOnda | null>(null);
  const [showMenu, setShowMenu] = useState(true);
  const [showIASubmenu, setShowIASubmenu] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastBubbleRef = useRef<HTMLDivElement>(null);
  const messagesInnerRef = useRef<HTMLDivElement>(null);
  const switchHintRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const embedWrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inclusionOpenButtonRef = useRef<HTMLButtonElement>(null);
  const ttsAudioContextRef = useRef<AudioContext | null>(null);
  const ttsSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [healthStatus, setHealthStatus] = useState<HealthBannerStatus>("unknown");

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = "es";
  }, []);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch("/api/admin/health");
        const data = (await res.json()) as { status?: HealthBannerStatus };
        const s = data.status;
        setHealthStatus(s === "ok" || s === "degraded" || s === "down" ? s : "unknown");
      } catch {
        setHealthStatus("unknown");
      }
    };
    void checkHealth();
    const interval = setInterval(checkHealth, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  /** Desbloquea el audio en Chrome/Mac: debe llamarse de forma síncrona en el gesto del usuario (click). */
  function getTTSAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    if (!ttsAudioContextRef.current) ttsAudioContextRef.current = new Ctx();
    ttsAudioContextRef.current.resume();
    return ttsAudioContextRef.current;
  }

  /** Bajar al final: respuestas siempre ABAJO (orden cronológico: usuario → bot), como WhatsApp. Defensa: try/catch para evitar que un error de scroll fuerce full reload en Fast Refresh. */
  const scrollToBottom = useCallback(() => {
    try {
      const scrollEl = messagesInnerRef.current;
      if (scrollEl && typeof scrollEl.scrollHeight === "number") {
        const max = scrollEl.scrollHeight - scrollEl.clientHeight;
        scrollEl.scrollTop = max > 0 ? max : scrollEl.scrollHeight;
      }
      const last = lastBubbleRef.current;
      if (last && typeof last.scrollIntoView === "function") last.scrollIntoView({ block: "end", behavior: "auto", inline: "nearest" });
    } catch {
      // Evita que errores de scroll (p. ej. durante Fast Refresh) disparen full reload
    }
  }, []);

  useLayoutEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
    const t1 = requestAnimationFrame(scrollToBottom);
    const t2 = setTimeout(scrollToBottom, 30);
    const t3 = setTimeout(scrollToBottom, 120);
    const t4 = setTimeout(scrollToBottom, 300);
    return () => {
      cancelAnimationFrame(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [messages, loading, scrollToBottom]);

  useEffect(() => {
    const scrollEl = messagesInnerRef.current;
    if (!scrollEl) return;
    const ro = new ResizeObserver(() => {
      try {
        scrollToBottom();
      } catch {
        // Evita que errores en scroll durante resize disparen full reload
      }
    });
    ro.observe(scrollEl);
    return () => ro.disconnect();
  }, [scrollToBottom]);

  useEffect(() => {
    const wasLoading = prevLoadingForA11yRef.current;
    prevLoadingForA11yRef.current = loading;
    if (!wasLoading || loading) return;
    const last = messages[messages.length - 1];
    if (last?.role !== "model") return;
    setStreamDoneAnnouncement(mc.streamDone);
    const id = window.setTimeout(() => setStreamDoneAnnouncement(""), 2500);
    return () => clearTimeout(id);
  }, [loading, messages, mc.streamDone]);

  /** En embed: notificar al padre (Wix) la altura real para que el iframe no corte el bot. Mínimo viewport para que se vea completo. */
  useEffect(() => {
    if (!embed) return;
    const el = embedWrapRef.current;
    if (!el || typeof window === "undefined") return;
    const sendHeight = () => {
      const contentH = el.scrollHeight;
      const minH = typeof window !== "undefined" ? Math.max(window.innerHeight || 700, 700) : 700;
      const h = Math.max(contentH, minH);
      if (h > 0) window.parent.postMessage({ height: h }, "*");
    };
    sendHeight();
    const ro = new ResizeObserver(sendHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, [embed, messages.length, currentEje, showMenu, showIASubmenu, input, attachmentImage, attachmentAudio]);

  function confirmEjeSwitch(eje: EjeOnda): void {
    trackUsage("eje_select", eje);
    setPreferredEjeForDisplay(eje);
    if (typeof window !== "undefined") {
      const prevEje = getPreferredEjeFromStorage();
      if (prevEje != null && prevEje !== eje) localStorage.removeItem(STORAGE_KEY_ULTIMO_TEMA);
      localStorage.setItem(STORAGE_KEY_PREFERRED, eje);
    }
    setCurrentEje(eje);
    if (switchHintRef.current) clearTimeout(switchHintRef.current);
    setJustSwitchedEje(eje);
    switchHintRef.current = setTimeout(() => {
      setJustSwitchedEje(null);
      switchHintRef.current = null;
    }, 1500);
  }

  function pickEje(eje: EjeOnda): void {
    setShowPickOndaNotice(false);
    setHighlightOndaButtons(false);
    setShowEnviarTooltip(false);
    confirmEjeSwitch(eje);
    setMessages((prev) => syncFirstBubbleAfterEjeChoice(prev, eje, CHAT_UI_LOCALE));
    setShowMenu(true);
    setShowIASubmenu(false);
    const hasPending = !!(
      input.trim() ||
      attachmentImage ||
      attachmentAudio
    );
    if (hasPending) {
      handleSend(null, { ejeOverride: eje });
    }
  }

  /** Reiniciar el bot: conversación nueva, elegir Onda de nuevo. Siempre disponible (no se deshabilita con loading). */
  function goToInicio(): void {
    setMessages([newMessage("model", getLocalizedMainWelcome(CHAT_UI_LOCALE))]);
    setCurrentEje(null);
    setShowMenu(true);
    setShowIASubmenu(false);
    setShowPickOndaNotice(false);
    setHighlightOndaButtons(false);
    setShowEnviarTooltip(false);
    setInput("");
    setAttachmentImage(null);
    setAttachmentAudio(null);
    setRecording(false);
    setAudioTooShortHint(false);
    try {
      localStorage.removeItem(STORAGE_KEY_RESTORE);
    } catch {
      // ignore
    }
  }

  /** Siempre muestra las 3 preguntas del ítem clicado (por optionId). Cada ítem tiene sus propias 3 preguntas en menuQuestions.ts. */
  function handleMenuOption(optionId: string, label: string, intro: string, isSubmenu?: boolean): void {
    const botText = formatMenuIntro(optionId) ?? intro;
    if (isSubmenu) {
      setShowIASubmenu(true);
      setMessages((m) => [...m, newMessage("model", botText, { isMenuIntro: true })]);
      return;
    }
    setShowMenu(false);
    setShowIASubmenu(false);
    setMessages((m) => [
      ...m,
      newMessage("user", label),
      newMessage("model", botText, { isMenuIntro: true, menuOptionId: optionId }),
    ]);
  }

  async function handleSend(e: React.FormEvent | null, opts?: { audioOverride?: string; ejeOverride?: EjeOnda }) {
    e?.preventDefault();
    const audioOverride = opts?.audioOverride;
    const ejeToUse = opts?.ejeOverride ?? currentEje;
    const text = input.trim();
    const hasContent = text || attachmentImage || attachmentAudio || !!audioOverride;
    if (!hasContent || loading) return;

    const prefCmd = parsePreferenceCommand(text, unifiedPrefs);
    if (prefCmd && !attachmentImage && !attachmentAudio && !audioOverride) {
      const merged = mergePrefs(unifiedPrefs, prefCmd.patch);
      setUnifiedPrefs(merged);
      saveUnifiedPrefsToStorage(merged);
      setUserPrefs((prev) =>
        mergeOndaUserPreferences(prev, {
          locale: unifiedLocaleToOndaLocale(merged.locale, text),
        })
      );
      const ack = pickPreferenceAck(merged, prefCmd.ackText, unifiedLocaleToOndaLocale(merged.locale, text));
      setInput("");
      setMessages((m) => [...m, newMessage("user", text), newMessage("model", ack)]);
      return;
    }

    if (ejeToUse === null) {
      setShowPickOndaNotice(true);
      setHighlightOndaButtons(true);
      setShowEnviarTooltip(true);
      if (audioOverride) setAttachmentAudio(audioOverride);
      setTimeout(() => {
        setShowEnviarTooltip(false);
        setHighlightOndaButtons(false);
      }, 4000);
      return;
    }
    setShowEnviarTooltip(false);
    setHighlightOndaButtons(false);
    const sendStartMs = Date.now();

    const pinUnified = persistAutoInferredUnifiedLocale(unifiedPrefs, text);
    let unifiedForSend = unifiedPrefs;
    if (pinUnified) {
      unifiedForSend = pinUnified;
      setUnifiedPrefs(pinUnified);
      saveUnifiedPrefsToStorage(pinUnified);
    }
    const requestLocale = mapPrefsToOndaChatLocale(normalizePrefs(unifiedForSend), text);
    const userPreferencesForApi = mergeOndaUserPreferences(userPrefs, { locale: requestLocale });

    setInput("");
    const imageToSend = attachmentImage;
    const audioToSend = audioOverride ?? attachmentAudio;
    setAttachmentImage(null);
    setAttachmentAudio(null);

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const userMsg = newMessage("user", text || (audioToSend ? mc.attachmentVoiceLabel : mc.attachmentImageLabel), {
      image: imageToSend ?? undefined,
      audio: !!audioToSend,
    });
    const placeholderMsg = newMessage("model", "", { isGenerated: true });
    setMessages((m) => [...m, userMsg, placeholderMsg]);
    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60_000);

    try {
      const sessionId = getOrCreateSessionId();
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionId ? { "x-session-id": sessionId } : {}),
        },
        body: JSON.stringify({
          message: text,
          image: imageToSend ?? undefined,
          audio: audioToSend ?? undefined,
          eje: ejeToUse,
          history,
          sessionId: sessionId || undefined,
          userPreferences: userPreferencesForApi,
          prefs: unifiedForSend,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        clearTimeout(timeoutId);
        const data = await res.json().catch(() => ({}));
        const isImage = !!imageToSend;
        const errMsg =
          data?.error ||
          (res.status === 413 && isImage ? mc.errorImage : mc.errorGeneric);
        setMessages((m) =>
          m.map((msg) =>
            msg.id === placeholderMsg.id ? { ...msg, content: errMsg } : msg
          )
        );
        setLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      let fullContent = "";
      let receivedAnyText = false;
      let serverPlayAudio: boolean | undefined;
      if (reader) {
        const meta = await consumeChatNdjsonStream(
          reader,
          (chunk) => {
            receivedAnyText = true;
            setMessages((m) =>
              m.map((msg) =>
                msg.id === placeholderMsg.id ? { ...msg, content: msg.content + chunk } : msg
              )
            );
            setTimeout(() => scrollToBottom(), 0);
          },
          (errLine) => {
            receivedAnyText = true;
            setMessages((m) =>
              m.map((msg) => (msg.id === placeholderMsg.id ? { ...msg, content: errLine } : msg))
            );
          }
        );
        receivedAnyText = receivedAnyText || meta.receivedAnyText;
        fullContent = meta.fullContent;
        serverPlayAudio = meta.serverPlayAudio;
      }
      if (receivedAnyText && fullContent) {
        const parsed = parseResponseFormat(fullContent);
        setMessages((m) =>
          m.map((msg) =>
            msg.id === placeholderMsg.id
              ? {
                  ...msg,
                  content: parsed.text,
                  guideId: parsed.guideId ?? undefined,
                  suggestions: parsed.suggestions?.length ? parsed.suggestions : undefined,
                }
              : msg
          )
        );
        const fallbackAudio = computeWebPlayAudioDecision({
          outputMode: userPrefs.outputMode,
          userMessage: text,
          parsed,
        });
        const shouldPlay =
          serverPlayAudio !== undefined ? serverPlayAudio : fallbackAudio.play;
        if (shouldPlay) {
          window.setTimeout(() => void playTTS(parsed.text), 320);
        }
        trackUsage("message_sent", ejeToUse, { responseTimeMs: Date.now() - sendStartMs });
      } else if (!receivedAnyText) {
        setMessages((m) =>
          m.map((msg) =>
            msg.id === placeholderMsg.id ? { ...msg, content: mc.errorGeneric } : msg
          )
        );
      }
      clearTimeout(timeoutId);
    } catch (err) {
      clearTimeout(timeoutId);
      const isAbort = err instanceof Error && err.name === "AbortError";
      setMessages((m) =>
        m.map((msg) =>
          msg.id === placeholderMsg.id
            ? {
                ...msg,
                content: isAbort
                  ? mc.errorTimeout
                  : mc.errorConnection,
              }
            : msg
        )
      );
    } finally {
      setLoading(false);
    }
  }

  function useSuggestion(suggestion: string) {
    setInput(suggestion);
    setShowPickOndaNotice(false);
  }

  /** Clic en un botón de la burbuja de las 3 preguntas: envía esa pregunta o enfoca el input (frase libre). */
  function handleMenuIntroChipClick(text: string) {
    if (text === mc.menuIntroFreeText) {
      inputRef.current?.focus();
      return;
    }
    sendChipText(text);
  }

  /** Borrar conversación: limpia localStorage y reinicia el chat (privacidad). */
  function handleClearConversation() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY_RESTORE);
    setMessages([newMessage("model", getLocalizedMainWelcome(CHAT_UI_LOCALE))]);
    setCurrentEje(null);
    setShowMenu(false);
    setShowIASubmenu(false);
    setShowPickOndaNotice(false);
    setHighlightOndaButtons(false);
    setShowEnviarTooltip(false);
  }

  /** Feedback 👍/👎: registra voto y, si es 👎, registra fallo para auditoría. */
  function handleFeedback(messageId: string, vote: "up" | "down") {
    const conversationId = getOrCreateSessionId();
    fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, vote, conversationId }),
      keepalive: true,
    }).catch(() => {});
    if (vote === "down") {
      const idx = messages.findIndex((m) => m.id === messageId);
      const botMsg = idx >= 0 ? messages[idx] : null;
      let userMessage = "";
      if (idx > 0) {
        for (let i = idx - 1; i >= 0; i--) {
          if (messages[i].role === "user") {
            userMessage = messages[i].content ?? "";
            break;
          }
        }
      }
      fetch("/api/errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "chat",
          userMessage: userMessage || undefined,
          botResponse: botMsg?.content ?? undefined,
        }),
        keepalive: true,
      }).catch(() => {});
    }
  }

  /** Enviar un mensaje de texto directo (p. ej. chip de pregunta relacionada) sin pasar por el input. */
  function sendChipText(text: string, ejeForSend?: EjeOnda | null) {
    const ej = ejeForSend ?? currentEje;
    const t = text.trim();
    if (!t || loading || ej === null) return;
    const chipPref = parsePreferenceCommand(t, unifiedPrefs);
    if (chipPref) {
      const merged = mergePrefs(unifiedPrefs, chipPref.patch);
      setUnifiedPrefs(merged);
      saveUnifiedPrefsToStorage(merged);
      setUserPrefs((prev) =>
        mergeOndaUserPreferences(prev, {
          locale: unifiedLocaleToOndaLocale(merged.locale, t),
        })
      );
      const ack = pickPreferenceAck(merged, chipPref.ackText, unifiedLocaleToOndaLocale(merged.locale, t));
      setMessages((m) => [...m, newMessage("user", t), newMessage("model", ack)]);
      return;
    }
    const sendStartMs = Date.now();
    const pinChip = persistAutoInferredUnifiedLocale(unifiedPrefs, t);
    let unifiedChip = unifiedPrefs;
    if (pinChip) {
      unifiedChip = pinChip;
      setUnifiedPrefs(pinChip);
      saveUnifiedPrefsToStorage(pinChip);
    }
    const requestLocaleChip = mapPrefsToOndaChatLocale(normalizePrefs(unifiedChip), t);
    const userPreferencesChipApi = mergeOndaUserPreferences(userPrefs, { locale: requestLocaleChip });

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const userMsg = newMessage("user", t);
    const placeholderMsg = newMessage("model", "", { isGenerated: true });
    setMessages((m) => [...m, userMsg, placeholderMsg]);
    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60_000);
    (async () => {
      try {
        const sessionIdChip = getOrCreateSessionId();
        const res = await fetch("/api/chat/stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(sessionIdChip ? { "x-session-id": sessionIdChip } : {}),
          },
          body: JSON.stringify({
            message: t,
            eje: ej,
            history,
            sessionId: sessionIdChip || undefined,
            userPreferences: userPreferencesChipApi,
            prefs: unifiedChip,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setMessages((m) =>
            m.map((msg) =>
              msg.id === placeholderMsg.id ? { ...msg, content: data?.error || mc.errorGeneric } : msg
            )
          );
          setLoading(false);
          return;
        }
        const reader = res.body?.getReader();
        let fullContent = "";
        let receivedAnyText = false;
        let serverPlayAudio: boolean | undefined;
        if (reader) {
          const meta = await consumeChatNdjsonStream(
            reader,
            (chunk) => {
              receivedAnyText = true;
              setMessages((m) =>
                m.map((msg) =>
                  msg.id === placeholderMsg.id ? { ...msg, content: msg.content + chunk } : msg
                )
              );
              setTimeout(() => scrollToBottom(), 0);
            },
            (errLine) => {
              receivedAnyText = true;
              setMessages((m) =>
                m.map((msg) => (msg.id === placeholderMsg.id ? { ...msg, content: errLine } : msg))
              );
            }
          );
          receivedAnyText = receivedAnyText || meta.receivedAnyText;
          fullContent = meta.fullContent;
          serverPlayAudio = meta.serverPlayAudio;
        }
        if (receivedAnyText && fullContent) {
          const parsed = parseResponseFormat(fullContent);
          setMessages((m) =>
            m.map((msg) =>
              msg.id === placeholderMsg.id
                ? { ...msg, content: parsed.text, guideId: parsed.guideId ?? undefined, suggestions: parsed.suggestions?.length ? parsed.suggestions : undefined }
                : msg
            )
          );
          const fallbackAudio = computeWebPlayAudioDecision({
            outputMode: userPrefs.outputMode,
            userMessage: t,
            parsed,
          });
          const shouldPlay =
            serverPlayAudio !== undefined ? serverPlayAudio : fallbackAudio.play;
          if (shouldPlay) {
            window.setTimeout(() => void playTTS(parsed.text), 320);
          }
          trackUsage("message_sent", ej, { responseTimeMs: Date.now() - sendStartMs });
        } else if (!receivedAnyText) {
          setMessages((m) =>
            m.map((msg) =>
              msg.id === placeholderMsg.id ? { ...msg, content: mc.errorGeneric } : msg
            )
          );
        }
      } catch (err) {
        const isAbort = err instanceof Error && err.name === "AbortError";
        setMessages((m) =>
          m.map((msg) =>
            msg.id === placeholderMsg.id
              ? { ...msg, content: isAbort ? mc.errorTimeout : mc.errorConnection }
              : msg
          )
        );
      } finally {
        setLoading(false);
      }
    })();
  }

  function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        const compressed = await compressImage(dataUrl);
        setAttachmentImage(compressed);
      } catch {
        setAttachmentImage(dataUrl);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  /** Solo intercepta pegado de imagen; el texto (p. ej. https://…) sigue el comportamiento nativo del input. */
  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const items = e.clipboardData?.items;
    if (!items?.length) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file" && item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = async () => {
            const dataUrl = reader.result as string;
            try {
              const compressed = await compressImage(dataUrl);
              setAttachmentImage(compressed);
            } catch {
              setAttachmentImage(dataUrl);
            }
          };
          reader.readAsDataURL(file);
        }
        return;
      }
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (ev) => ev.data.size && chunks.push(ev.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        // Alineado con API: mínimo ~12 KB (audio/webm corto válido)
        if (blob.size < 12 * 1024) {
          setRecording(false);
          setAudioTooShortHint(true);
          setTimeout(() => setAudioTooShortHint(false), 4000);
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          if (currentEje === null) {
            setAttachmentAudio(dataUrl);
            setShowPickOndaNotice(true);
            return;
          }
          handleSend(null, { audioOverride: dataUrl });
        };
        reader.readAsDataURL(blob);
      };
      // Pedir datos cada 250 ms para que haya chunks al detener (Chrome)
      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch (err) {
      console.error("Recording failed", err);
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    setRecording(false);
  }

  async function playTTS(text: string) {
    if (!text.trim()) return;
    if (ttsPlaying) return;
    // Desbloquear audio en Chrome/Mac: tiene que ser síncrono en el click
    const ctx = getTTSAudioContext();
    if (!ctx) {
      console.warn("TTS: AudioContext no disponible");
      return;
    }
    stopTTS();
    setTtsPlaying(true);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, 2048) }),
      });
      if (!res.ok) {
        setTtsPlaying(false);
        return;
      }
      const blob = await res.blob();
      const arrayBuffer = await blob.arrayBuffer();
      ctx.decodeAudioData(
        arrayBuffer,
        (buffer) => {
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          ttsSourceRef.current = source;
          source.onended = () => {
            ttsSourceRef.current = null;
            setTtsPlaying(false);
          };
          source.start(0);
        },
        (err) => {
          console.warn("TTS decode error", err);
          setTtsPlaying(false);
        }
      );
    } catch (err) {
      console.error("TTS failed", err);
      ttsSourceRef.current = null;
      setTtsPlaying(false);
    }
  }

  function stopTTS() {
    try {
      if (ttsSourceRef.current) {
        ttsSourceRef.current.stop();
        ttsSourceRef.current.disconnect();
      }
    } catch {
      // ignore if already stopped
    }
    ttsSourceRef.current = null;
    setTtsPlaying(false);
  }

  /* ── derived styles from S + overrides ── */

  const isEmbed = embed;
  /** En embed (Wix) mismo aspecto que en local: no usar modo compacto. */
  const compact = false;
  /** Colores de los botones Onda como en el diseño: rojo, verde, púrpura (EJE_CONFIGS). */
  const neuPickerColorMap: Record<EjeOnda, string> = {
    [EjeOnda.A_MANO]: EJE_CONFIGS[EjeOnda.A_MANO].color,
    [EjeOnda.CIVITA]: EJE_CONFIGS[EjeOnda.CIVITA].color,
    [EjeOnda.PROFES]: EJE_CONFIGS[EjeOnda.PROFES].color,
  };
  /** Colores oscuros para el texto "Ahora en A Mano / Civita / Profes". */
  const neuPickerColorDarkMap: Record<EjeOnda, string> = {
    [EjeOnda.A_MANO]: "#8B2920",
    [EjeOnda.CIVITA]: "#0F5A4A",
    [EjeOnda.PROFES]: "#4A2655",
  };
  const ejeColor = currentEje ? neuPickerColorMap[currentEje] : t.neuColors.red;

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  /** Modo "pega noticia/link y te lo explico" solo en Onda A Mano; en Civita la persona hace preguntas, no envía noticias. */
  const linkHelp = Boolean(
    currentEje === EjeOnda.A_MANO &&
    lastUserMessage &&
    (hasUrl(lastUserMessage.content) ||
      lastUserMessage.content.includes("Entender una noticia") ||
      lastUserMessage.content.includes("noticia o un texto") ||
      lastUserMessage.content.includes("Entender uma notícia") ||
      lastUserMessage.content.includes("notícia ou um texto"))
  );
  /** Último mensaje son las 3 preguntas del ítem: placeholder vacío y mostrar "O pregúntame libremente qué quieres saber". */
  const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
  const isMenuIntroActive = lastMsg?.role === "model" && (lastMsg as Message).isMenuIntro;
  /** Mismo shell en local y en embed: altura acotada para que el área de mensajes haga scroll (no se quede pegado). */
  const shellStyle: CSSProperties =
    currentEje === null
      ? { ...S.shell, flex: "0 0 auto", minHeight: 420, maxHeight: "calc(100dvh - 48px)", display: "flex", flexDirection: "column", overflow: "hidden" }
      : S.shell;

  const pageStyle: CSSProperties = {
    ...S.page,
    ...(currentEje === null ? { justifyContent: "flex-start", alignItems: "center" } : {}),
  };

  /** En embed: sin padding inline (lo da CSS + safe-area); ancho 100% para móvil/Wix sin scroll horizontal. */
  const embedWrap: CSSProperties | undefined = isEmbed
    ? {
        ...S.page,
        padding: 0,
        width: "100%",
        maxWidth: "100%",
        overflowX: "hidden",
        boxSizing: "border-box",
      }
    : undefined;
  /** Marco neumórfico en embed: ocupa el espacio disponible (flex:1 minHeight:0) y es contenedor flex para que el shell tenga altura acotada y el área de mensajes haga scroll. */
  const embedFrameStyle: CSSProperties | undefined = isEmbed
    ? {
        width: "100%",
        maxWidth: "100%",
        margin: "0 auto",
        borderRadius: 28,
        overflow: "hidden",
        boxShadow: t.shadow.neuRaisedExtra,
        background: t.grad.pageBg,
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }
    : undefined;

  const headerStyle: CSSProperties = compact
    ? { ...S.header, padding: "10px 14px" }
    : S.header;

  const chatBody: CSSProperties = { ...S.chat, overflow: "hidden" };

  const msgsArea: CSSProperties = {
    ...S.messages,
    padding: 0,
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  };

  /** Contenedor de mensajes: flujo estricto hacia abajo (arriba = viejo, abajo = nuevo). paddingBottom para que el menú de abajo no tape el último mensaje. */
  const msgsInner: CSSProperties = {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    overflowX: "hidden",
    overflowAnchor: "none",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    alignContent: "flex-start",
    gap: compact ? 6 : 8,
    padding: currentEje === null ? "8px 14px 32px 14px" : "8px 14px 32px 14px",
  };

  const disabledCursor = loading ? "not-allowed" : "pointer";
  const disabledOpacity = loading ? 0.55 : 1;

  const noticeStyle: CSSProperties = {
    padding: "10px 14px",
    borderRadius: t.r.md,
    background: t.c.warnBg,
    border: `1px solid ${t.c.warnBorder}`,
    color: t.c.warnText,
    fontSize: "0.9375rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  };

  const noticeBtnStyle: CSSProperties = {
    flexShrink: 0,
    padding: "4px 12px",
    borderRadius: t.r.sm,
    border: "none",
    background: t.c.warnBorder,
    color: t.c.warnText,
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "0.875rem",
  };

  const menuList: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 6,
    maxHeight: compact ? 180 : 240,
    overflowY: "auto",
    padding: "0 4px",
  };

  /** Botones del menú: 100% neumorphism (elevados, sombra marcada, hover con lift). */
  const menuBtnStyle: CSSProperties = {
    padding: compact ? "10px 14px" : "12px 16px",
    borderRadius: 16,
    border: `2px solid ${t.glass.border}`,
    background: t.glass.bg,
    color: t.c.ink,
    fontSize: compact ? "0.9375rem" : "1rem",
    fontWeight: 500,
    cursor: disabledCursor,
    opacity: disabledOpacity,
    textAlign: "left",
    width: "100%",
    boxShadow: t.shadow.neuRaisedStrong,
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  };

  /** Secundarios (Escribir libremente, Volver al inicio): neumorphism elevado. */
  const menuSec: CSSProperties = {
    padding: compact ? "8px 12px" : "10px 14px",
    borderRadius: 16,
    border: `2px solid ${t.glass.borderSoft}`,
    background: t.glass.bg,
    color: t.c.muted,
    fontSize: compact ? "0.875rem" : "1rem",
    cursor: "pointer",
    textAlign: "center",
    width: "100%",
    boxShadow: t.shadow.neuRaised,
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  };

  const chipBase: CSSProperties = {
    ...S.chip,
    ...(compact ? { padding: "8px 12px", fontSize: "0.8125rem" } : {}),
    cursor: disabledCursor,
    opacity: disabledOpacity,
    whiteSpace: "nowrap",
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  const chipMuted: CSSProperties = {
    ...S.chip,
    color: t.c.muted,
    borderColor: t.glass.borderSoft,
    background: "rgba(255,255,255,0.06)",
    ...(compact ? { padding: "8px 12px", fontSize: "0.8125rem" } : {}),
  };

  const iconStyle: CSSProperties = {
    ...S.iconBtn,
    ...(compact ? { width: 38, height: 38 } : {}),
    flexShrink: 0,
  };

  /** Micrófono del composer: prominente y distinto del botón Escuchar (que está en las burbujas). Para grabar tu pregunta, no para escuchar al bot. */
  const micBtnStyle: CSSProperties = {
    ...iconStyle,
    ...(compact ? {} : { width: 48, height: 48, fontSize: "1.25rem" }),
    background: t.isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.95)",
    border: `2px solid ${ejeColor || t.c.orange}`,
    boxShadow: `0 4px 14px ${(ejeColor || t.c.orange)}40`,
    flexShrink: 0,
  };

  const stopStyle: CSSProperties = {
    ...iconStyle,
    width: "auto",
    padding: "0 14px",
    background: t.c.danger,
    borderColor: t.c.danger,
    color: "#fff",
    fontWeight: 600,
    fontSize: "0.875rem",
  };

  /** Saludo o mensaje de error: hideActions elimina Escuchar/Compartir/Feedback (limpieza forense de UI). */
  const isWelcomeOrError = (m: Message): boolean => {
    if (m.role !== "model") return false;
    if (!m.isGenerated) return true;
    const c = (m.content ?? "").trim();
    if (
      c.includes("Con qué Onda") ||
      c.includes("Com qual Onda você quer começar") ||
      c.includes("¿Qué onda") ||
      c.includes("Qual onda ativamos") ||
      c.includes("Qual Onda vamos ativar") ||
      c.includes("elija una") ||
      c.includes("escolha uma") ||
      c.includes("Buenos días") ||
      c.includes("Buenas tardes") ||
      c.includes("Buenas noches") ||
      c.includes("Bom dia") ||
      c.includes("Boa tarde") ||
      c.includes("Boa noite") ||
      c.includes("Te doy la bienvenida a Onda") ||
      c.includes("Dou as boas-vindas à Onda")
    )
      return true;
    return [mc.errorGeneric, mc.errorImage, mc.errorConnection, mc.errorTimeout, mc.errorServer].some((e) =>
      c.includes(e)
    );
  };

  const hasContent = !!(input.trim() || attachmentImage || attachmentAudio);
  const canSend = !loading && currentEje !== null && hasContent;
  const canClickEnviar = !loading && hasContent;

  const inpStyle: CSSProperties = {
    ...S.input,
    ...(compact ? { height: 46, fontSize: "1rem" } : {}),
    flex: 1,
    minWidth: 0,
    ...(inputFocused ? { boxShadow: `${t.shadow.neuInsetSoft}, 0 0 0 3px rgba(0,0,0,0.1)` } : {}),
  };

  const sendStyle: CSSProperties = {
    ...S.send,
    ...(compact ? { height: 40, padding: "0 16px" } : {}),
    opacity: 1,
    cursor: canSend ? "pointer" : "not-allowed",
    flexShrink: 0,
  };

  /* ── render ── */

  const content = (
    <main
      id="onda-chat-main"
      role="tabpanel"
      aria-labelledby="onda-eje-tablist"
      aria-label={mc.conversationAria}
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        alignItems: "center",
        boxSizing: "border-box",
      }}
    >
    <a href="#onda-main-input" className="onda-skip-link">
      {inclusionStrings.skipToInput}
    </a>
    <div
      className="onda-shell"
      style={shellStyle}
      data-onda-low-bandwidth={userPrefs.bandwidthMode === "low" ? "1" : "0"}
    >
      {/* Header: logo, nombre y botón borrar conversación (privacidad). */}
      <div
        style={{
          ...headerStyle,
          flexShrink: 0,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={S.titleWrap}>
          <a
            href={PRECISAR_PUBLIC_SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
              color: "inherit",
              borderRadius: 8,
            }}
            aria-label={mc.precisarSiteLinkAria}
          >
            <img
              src="/logo%20onda%20O%20ok.png?v=3"
              alt=""
              width={40}
              height={40}
              style={{ display: "block", objectFit: "contain" }}
            />
            <div aria-hidden="true" style={{ fontWeight: 600, fontSize: compact ? "1.0625rem" : "1.25rem", letterSpacing: ".04em", color: t.c.ink }}>
              ONDA
            </div>
          </a>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap", marginLeft: "auto" }}>
          <button
            ref={inclusionOpenButtonRef}
            type="button"
            onClick={() => setInclusionPanelOpen(true)}
            style={{
              fontSize: "0.8125rem",
              color: t.c.ink,
              background: t.glass.bg,
              border: `1px solid ${t.c.border}`,
              cursor: "pointer",
              padding: "8px 12px",
              borderRadius: t.r.sm,
              fontWeight: 600,
              minHeight: 44,
            }}
            aria-expanded={inclusionPanelOpen}
            aria-controls="onda-inclusion-dialog"
          >
            {inclusionStrings.openPanel}
          </button>
          <button
            type="button"
            onClick={handleClearConversation}
            style={{
              fontSize: "0.8125rem",
              color: t.c.muted,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "6px 10px",
              borderRadius: t.r.sm,
              minHeight: 44,
            }}
            title={mc.clearConversationTitle}
          >
            {mc.clearConversation}
          </button>
        </div>
      </div>

      {/* Chat body */}
      <div style={chatBody}>
        <OfflineBanner status={healthStatus} />
        {/* Messages */}
        <div className="onda-messages" style={msgsArea}>
          <div
            id="onda-messages-container"
            ref={messagesInnerRef}
            className="onda-messages-inner"
            style={msgsInner}
            role="region"
            aria-label={mc.messagesRegion}
          >
          {currentEje === null ? (
            <>
              {messages.length > 0 && (
                <div
                  key={messages[0].id}
                  className="bubble-in"
                  style={{ ...S.row(false) }}
                >
                  <ChatBubble
                    message={messages[0]}
                    color={ejeColor}
                    compact={compact}
                    theme={t}
                    uiLocale={CHAT_UI_LOCALE}
                    onMenuIntroChipClick={handleMenuIntroChipClick}
                    hideActions={true}
                    lowBandwidth={userPrefs.bandwidthMode === "low"}
                  />
                </div>
              )}
              <div
                style={{
                  width: "100%",
                  maxWidth: 560,
                  alignSelf: "center",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  marginTop: 4,
                  marginBottom: 8,
                  position: "relative",
                  zIndex: 11,
                  boxSizing: "border-box",
                  padding: "0 2px",
                }}
                className={highlightOndaButtons ? "onda-picker-highlight" : undefined}
              >
                {ORDERED_EJES.map((eje, idx) => {
                  const config = EJE_CONFIGS[eje];
                  const cardSubtitle = getEjeCardSubtitle(CHAT_UI_LOCALE, eje);
                  const isPreferred = eje === preferredEjeForDisplay;
                  return (
                    <button
                      key={eje}
                      type="button"
                      data-onda-picker-main
                      data-onda-eje={eje}
                      aria-label={buildEjePickerAriaLabel(CHAT_UI_LOCALE, config.name, cardSubtitle, isPreferred)}
                      onClick={() => pickEje(eje)}
                      style={{
                        padding: "22px 24px",
                        borderRadius: 24,
                        border: isPreferred ? "3px solid rgba(255,255,255,0.95)" : "none",
                        outline: isPreferred ? `3px solid ${neuPickerColorMap[eje]}` : "none",
                        outlineOffset: 3,
                        background: neuPickerColorMap[eje],
                        color: "#fff",
                        cursor: "pointer",
                        touchAction: "manipulation",
                        boxShadow: t.shadow.neuRaisedColoredSolid(neuPickerColorMap[eje]),
                        textAlign: "left",
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                        width: "100%",
                        position: "relative",
                        zIndex: 11 + idx,
                        fontFamily: "inherit",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ fontSize: "1.375rem", fontWeight: 700, lineHeight: 1.2 }}>{config.name}</span>
                        {isPreferred && (
                          <span
                            style={{
                              fontSize: "0.8125rem",
                              fontWeight: 600,
                              background: "rgba(255,255,255,0.22)",
                              padding: "4px 10px",
                              borderRadius: 12,
                            }}
                          >
                            {mc.pickerContinueBadge}
                          </span>
                        )}
                      </span>
                      <span style={{ fontSize: "1.0625rem", fontWeight: 400, lineHeight: 1.45, color: "rgba(255,255,255,0.94)" }}>
                        {cardSubtitle}
                      </span>
                    </button>
                  );
                })}
              </div>
              {showPickOndaNotice && (
                <div className="bubble-in" style={S.row(false)}>
                  <div style={noticeStyle}>
                    <span>{mc.pickOndaFirst}</span>
                    <button
                      type="button"
                      data-onda-action="dismiss-notice"
                      onClick={() => {
                        setShowPickOndaNotice(false);
                        setHighlightOndaButtons(false);
                        setShowEnviarTooltip(false);
                      }}
                      style={noticeBtnStyle}
                    >
                      {mc.pickOndaDismiss}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
          {messages.map((msg, idx) => (
            <div
              key={msg.id}
              ref={idx === messages.length - 1 ? lastBubbleRef : undefined}
              className="bubble-in"
              style={S.row(msg.role === "user")}
            >
              <ChatBubble
                message={msg}
                color={ejeColor}
                compact={compact}
                uiLocale={CHAT_UI_LOCALE}
                onPlayTTS={msg.role === "model" && msg.content?.trim() ? playTTS : undefined}
                onStopTTS={stopTTS}
                isTTSPlaying={ttsPlaying}
                theme={t}
                onMenuIntroChipClick={handleMenuIntroChipClick}
                onFeedback={handleFeedback}
                hideActions={isWelcomeOrError(msg)}
                lowBandwidth={userPrefs.bandwidthMode === "low"}
              />
            </div>
          ))}

          {/* Loading: texto visible + estado para lectores de pantalla (un solo anuncio al inicio, no por chunk). */}
          {loading &&
            !(messages.length > 0 && messages[messages.length - 1].role === "model" && messages[messages.length - 1].content === "") && (
              <div ref={lastBubbleRef} className="bubble-in" style={S.row(false)}>
                <div
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                  style={{
                    ...S.bubble(false),
                    fontStyle: "italic",
                    color: t.c.ink,
                    opacity: 0.9,
                    animation: "pulse 1.4s ease-in-out infinite",
                  }}
                >
                  <span className="sr-only">{mc.typingSr}</span>
                  <span aria-hidden="true" style={{ animation: "inherit" }}>
                    {mc.typing}
                  </span>
                </div>
              </div>
            )}

          {streamDoneAnnouncement ? (
            <div role="status" aria-live="polite" className="sr-only">
              {streamDoneAnnouncement}
            </div>
          ) : null}

          {/* Preguntas de seguimiento: SOLO si el modelo devolvió [ONDA_SUGERENCIAS] (contextuales). No mostrar nunca píldoras genéricas (Congreso, diputados, Singapur, etc.) porque cambian de tema; regla: solo el usuario cambia de tema. */}
          {!loading && currentEje !== null && !isMenuIntroActive && (() => {
            const last = messages[messages.length - 1];
            const hasUserMessage = messages.some((m) => m.role === "user");
            if (!hasUserMessage || last?.role !== "model" || !last?.content?.trim()) return null;
            const toShow = (last?.role === "model" && last?.suggestions?.length) ? last.suggestions.slice(0, 4) : [];
            return toShow.length > 0 ? (
              <div className="bubble-in" style={{ ...S.row(false), flexWrap: "wrap", gap: 10, marginTop: 6 }}>
                {toShow.map((texto) => (
                  <button
                    key={texto}
                    type="button"
                    onClick={() => sendChipText(texto)}
                    style={S.pildoraIntuicion}
                    {...S.lift.pildora}
                  >
                    {texto}
                  </button>
                ))}
              </div>
            ) : null;
          })()}

            </>
          )}

          <div ref={bottomRef} />
          </div>
        </div>

        {/* Tabs, menu, chips, composer: capa con z-index alto para que todos los botones reciban clics */}
        <div className="onda-composer-layer" style={{ flexShrink: 0, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {/* Tabs + Volver al inicio siempre visible cuando hay Onda elegida */}
        {currentEje !== null && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <EjeSelector
                  currentEje={currentEje}
                  onSelect={confirmEjeSwitch}
                  compact={compact}
                  theme={t}
                  locale={CHAT_UI_LOCALE}
                />
                {justSwitchedEje !== null && (
                  <p style={{ margin: 0, fontSize: compact ? "0.8125rem" : "0.875rem", color: neuPickerColorDarkMap[justSwitchedEje], fontWeight: 600 }}>
                    {mc.switchEjePrefix} {EJE_CONFIGS[justSwitchedEje].name}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={goToInicio}
                title={mc.backHomeTitle}
                style={{
                  flexShrink: 0,
                  padding: "6px 12px",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: t.c.muted,
                  background: t.c.surface,
                  border: `1px solid ${t.c.border}`,
                  borderRadius: t.r.sm,
                  cursor: "pointer",
                  boxShadow: t.shadow?.neuRaised ?? "none",
                }}
              >
                {VOLVER_AL_INICIO}
              </button>
            </div>
          </>
        )}

        {/* Menu options */}
        {currentEje !== null && showMenu && !showIASubmenu && (
          <div className="onda-menu-list" style={{ ...menuList, position: "relative", zIndex: 2 }}>
            {EJE_MENU_OPTIONS[currentEje].map((opt) => {
              const optLabel = displayMenuOptionLabel(opt, CHAT_UI_LOCALE);
              return (
              <button
                key={opt.id}
                type="button"
                className="onda-menu-btn"
                data-onda-menu-id={opt.id}
                data-onda-menu-label={optLabel}
                data-onda-menu-intro={opt.intro}
                data-onda-menu-sub={opt.isSubmenu ? "1" : undefined}
                onClick={() => handleMenuOption(opt.id, optLabel, opt.intro, opt.isSubmenu)}
                disabled={loading}
                style={menuBtnStyle}
                {...S.lift.menu}
              >
                {optLabel}
              </button>
            );})}
            {currentEje === EjeOnda.A_MANO && (
              <button type="button" className="onda-menu-btn" data-onda-action="close-menu" onClick={() => setShowMenu(false)} style={menuSec} {...S.lift.menu}>
                {mc.menuWriteFreely}
              </button>
            )}
            <button type="button" className="onda-menu-btn" data-onda-action="go-inicio" onClick={goToInicio} disabled={false} style={menuSec} title={mc.menuMainGoInicioLongTitle} {...S.lift.menu}>
              {VOLVER_AL_INICIO}
            </button>
          </div>
        )}

        {/* IA submenu */}
        {currentEje !== null && showIASubmenu && (
          <div className="onda-menu-list" style={{ ...menuList, position: "relative", zIndex: 2 }}>
            {IA_SUBMENU_OPTIONS.map((opt) => {
              const optLabel = displayMenuOptionLabel(opt, CHAT_UI_LOCALE);
              return (
              <button
                key={opt.id}
                type="button"
                className="onda-menu-btn"
                data-onda-menu-id={opt.id}
                data-onda-menu-label={optLabel}
                data-onda-menu-intro={opt.intro}
                data-onda-menu-sub="0"
                onClick={() => handleMenuOption(opt.id, optLabel, opt.intro)}
                disabled={loading}
                style={menuBtnStyle}
                {...S.lift.menu}
              >
                {optLabel}
              </button>
            );})}
            <button type="button" className="onda-menu-btn" data-onda-action="show-menu" onClick={() => setShowIASubmenu(false)} style={menuSec} title={mc.menuShowSubmenuAgainTitle} {...S.lift.menu}>
              {mc.menuBackToMenu}
            </button>
            <button type="button" className="onda-menu-btn" data-onda-action="go-inicio" onClick={goToInicio} disabled={false} style={menuSec} title={mc.backHomeTitle} {...S.lift.menu}>
              {VOLVER_AL_INICIO}
            </button>
          </div>
        )}

        {/* Regla 3 Ondas: no mostrar preguntas de otros temas (Congreso, diputado, inflación, etc.) — provocan ruido informacional. Solo "Ver menú". */}
        {currentEje !== null && !showMenu && !showIASubmenu && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 6, padding: "0 4px", alignItems: "center" }}>
            <button
              type="button"
              data-onda-action="show-menu"
              onClick={() => { setShowMenu(true); setShowIASubmenu(false); }}
              style={chipMuted}
            >
              {mc.menuViewMenu}
            </button>
          </div>
        )}

        {/* Composer */}
        <div style={S.composer}>
          {/* Volver al menú / Volver al inicio (cuando no estás en el menú) */}
          {currentEje !== null && !showMenu && (
            <div style={{ marginBottom: 10, display: "flex", flexWrap: "wrap", gap: "12px 16px", alignItems: "center" }}>
              <button
                type="button"
                data-onda-action="show-menu"
                onClick={() => { setShowMenu(true); setShowIASubmenu(false); }}
                title={mc.composerShowMenuTitle}
                style={{
                  fontSize: "0.9375rem",
                  color: ejeColor,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 0",
                  fontWeight: 500,
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                }}
              >
                {mc.composerBackToMenuLink}
              </button>
              <button
                type="button"
                data-onda-action="go-inicio"
                onClick={goToInicio}
                title={mc.composerGoInicioTitle}
                style={{
                  fontSize: "0.9375rem",
                  color: ejeColor,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 0",
                  fontWeight: 500,
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                }}
              >
                {VOLVER_AL_INICIO}
              </button>
            </div>
          )}
          {audioTooShortHint && (
            <div style={{ marginBottom: 8, fontSize: "0.875rem", color: t.c.muted }}>
              {mc.audioTooShortHint}
            </div>
          )}
          {/* Attachment preview */}
          {(attachmentImage || attachmentAudio) && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              {attachmentImage && (
                <div style={{ position: "relative" }}>
                  <img
                    src={attachmentImage}
                    alt={mc.attachmentPreviewAlt}
                    style={{ height: 48, borderRadius: t.r.sm, border: `1px solid ${t.c.border}` }}
                  />
                  <button
                    type="button"
                    onClick={() => setAttachmentImage(null)}
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      border: "none",
                      background: t.c.muted,
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: 14,
                      lineHeight: 1,
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
              {attachmentAudio && (
                <span style={{ fontSize: "0.875rem", color: t.c.muted, display: "flex", alignItems: "center", gap: 6 }}>
                  🎤 Audio listo
                  <button
                    type="button"
                    onClick={() => setAttachmentAudio(null)}
                    style={{
                      padding: "2px 10px",
                      borderRadius: 6,
                      border: "none",
                      background: t.isDark ? "rgba(130,150,210,.12)" : "rgba(110,135,190,.10)",
                      color: t.c.muted,
                      cursor: "pointer",
                      fontSize: "0.8125rem",
                    }}
                  >
                    {mc.removeAttachment}
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Atajos de un clic cuando están las 3 preguntas: el usuario escribe lo mínimo */}
          {isMenuIntroActive && currentEje !== null && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10, alignItems: "center" }}>
              {mc.menuIntroAtajos.map((texto) => (
                <button
                  key={texto}
                  type="button"
                  data-onda-chip={texto}
                  onClick={() => sendChipText(texto)}
                  disabled={loading}
                  style={chipBase}
                >
                  {texto}
                </button>
              ))}
            </div>
          )}

          {/* Input row */}
          <form
            aria-label={mc.formComposerAria}
            onSubmit={(e) => { e.preventDefault(); handleSend(e); }}
            style={{ display: "flex", gap: 10, alignItems: "center" }}
          >
            <input type="file" accept="image/*" onChange={handleImageFile} style={{ display: "none" }} id="onda-image-upload" />
            <label htmlFor="onda-image-upload" style={iconStyle} title={mc.imageUploadTitle} aria-label={mc.imageUploadTitle}>
              <span aria-hidden="true">🖼️</span>
            </label>

            {recording ? (
              <button type="button" onClick={stopRecording} style={stopStyle}>
                ⏹ {mc.micStop}
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                disabled={loading}
                style={micBtnStyle}
                title={mc.micRecordTitle}
                aria-label={mc.micRecordAria}
              >
                🎤
              </button>
            )}

            <input
              id="onda-main-input"
              ref={inputRef}
              type="text"
              aria-label={getChatInputAriaLabel(CHAT_UI_LOCALE, currentEje ? EJE_CONFIGS[currentEje].name : null)}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e as unknown as React.FormEvent);
                }
              }}
              placeholder={isMenuIntroActive ? "" : CHAT_INPUT_PLACEHOLDER}
              disabled={loading}
              style={inpStyle}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onPaste={handlePaste}
            />

            <span style={{ position: "relative", display: "inline-flex" }}>
              {showEnviarTooltip && hasContent && currentEje === null && (
                <span
                  role="tooltip"
                  style={{
                    position: "absolute",
                    bottom: "100%",
                    left: "50%",
                    transform: "translateX(-50%) translateY(-8px)",
                    padding: "8px 12px",
                    borderRadius: 10,
                    background: "rgba(0,0,0,0.85)",
                    color: "#fff",
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    zIndex: 20,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                  }}
                >
                  {mc.chooseOndaTooltip}
                </span>
              )}
              <button
                type="button"
                data-onda-send
                disabled={!canClickEnviar}
                aria-label={hasContent && currentEje === null ? mc.chooseOndaSendTitle : mc.send}
                title={hasContent && currentEje === null ? mc.chooseOndaSendTitle : undefined}
                style={sendStyle}
                {...S.lift.send}
                onClick={(e) => {
                  e.preventDefault();
                  handleSend(e as unknown as React.FormEvent);
                }}
              >
                {linkHelp ? mc.linkHelpCta : mc.send}
              </button>
            </span>
          </form>
        </div>
        </div>
      </div>
    </div>
    <InclusionSettingsPanel
      open={inclusionPanelOpen}
      onClose={() => {
        setInclusionPanelOpen(false);
        queueMicrotask(() => inclusionOpenButtonRef.current?.focus());
      }}
      prefs={userPrefs}
      setPrefs={setInclusivePrefs}
      strings={inclusionStrings}
      theme={t}
    />
    </main>
  );

  if (isEmbed) {
    return (
      <div ref={embedWrapRef} className="onda-page-wrap" data-onda-embed="1" style={embedWrap}>
        <div className="onda-embed-frame" style={embedFrameStyle}>
          {content}
        </div>
      </div>
    );
  }
  return <div className="onda-page-wrap" style={pageStyle}>{content}</div>;
}
