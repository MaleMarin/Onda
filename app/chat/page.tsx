"use client";

/**
 * UI del chat Onda. Cambios estéticos: ver .cursor/rules/onda-ui-no-romper-interactividad.mdc
 * No tocar: onClick/onSubmit en botones y form; no añadir pointer-events:none ni overlays sobre .onda-shell.
 */

import { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback, type CSSProperties } from "react";
import {
  MAIN_WELCOME,
  EJE_CONFIGS,
  EJE_SUGGESTIONS,
  EJE_MENU_OPTIONS,
  IA_SUBMENU_OPTIONS,
  ONDA_MICROCOPY,
  ORDERED_EJES,
} from "@/content/shared";
import { EjeOnda, type Message } from "@/content/types";
import { parseResponseFormat } from "@/lib/responseFormat";
import { useOndaTheme } from "@/lib/useOndaTheme";
import { ondaStyles } from "@/lib/ondaStyles";
import { ChatBubble } from "./components/ChatBubble";
import { EjeSelector } from "./components/EjeSelector";

function newMessage(role: "user" | "model", content: string, extra?: Partial<Message>): Message {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    timestamp: Date.now(),
    ...extra,
  };
}

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

type ChatPageProps = { initialEje?: EjeOnda | null };

export default function ChatPage({ initialEje = null }: ChatPageProps) {
  const t = useOndaTheme(true);
  const S = useMemo(() => ondaStyles(t), [t]);

  const [messages, setMessages] = useState<Message[]>([
    newMessage("model", MAIN_WELCOME),
  ]);
  const [currentEje, setCurrentEje] = useState<EjeOnda | null>(initialEje);

  const [embed, setEmbed] = useState(false);
  useEffect(() => {
    setEmbed(new URLSearchParams(window.location.search).get("embed") === "1");
  }, []);

  /** Al cargar: si la URL tiene ?eje=, usar esa Onda (por enlace o recarga). Luego limpiar la URL. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ejeParam = params.get("eje");
    if (ejeParam === EjeOnda.A_MANO || ejeParam === EjeOnda.CIVITA || ejeParam === EjeOnda.PROFES) {
      setCurrentEje(ejeParam as EjeOnda);
      params.delete("eje");
      const newSearch = params.toString();
      const path = window.location.pathname;
      window.history.replaceState({}, "", path + (newSearch ? "?" + newSearch : ""));
    }
  }, []);
  const [input, setInput] = useState("");
  const [attachmentImage, setAttachmentImage] = useState<string | null>(null);
  const [attachmentAudio, setAttachmentAudio] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPickOndaNotice, setShowPickOndaNotice] = useState(false);
  const [justSwitchedEje, setJustSwitchedEje] = useState<EjeOnda | null>(null);
  const [showMenu, setShowMenu] = useState(true);
  const [showIASubmenu, setShowIASubmenu] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastBubbleRef = useRef<HTMLDivElement>(null);
  const messagesInnerRef = useRef<HTMLDivElement>(null);
  const switchHintRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const embedWrapRef = useRef<HTMLDivElement>(null);

  /** Bajar al final: respuestas siempre ABAJO (orden cronológico: usuario → bot), como WhatsApp. */
  const scrollToBottom = useCallback(() => {
    const scrollEl = messagesInnerRef.current;
    if (scrollEl) {
      const max = scrollEl.scrollHeight - scrollEl.clientHeight;
      scrollEl.scrollTop = max > 0 ? max : scrollEl.scrollHeight;
    }
    lastBubbleRef.current?.scrollIntoView({ block: "end", behavior: "auto", inline: "nearest" });
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
    const ro = new ResizeObserver(scrollToBottom);
    ro.observe(scrollEl);
    return () => ro.disconnect();
  }, [scrollToBottom]);

  /** En embed: notificar al padre (Wix) la altura real para que el iframe se redimensione sin espacio vacío. */
  useEffect(() => {
    if (!embed) return;
    const el = embedWrapRef.current;
    if (!el || typeof window === "undefined") return;
    const sendHeight = () => {
      const h = el.scrollHeight;
      if (h > 0) window.parent.postMessage({ height: h }, "*");
    };
    sendHeight();
    const ro = new ResizeObserver(sendHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, [embed, messages.length, currentEje, showMenu, showIASubmenu, input, attachmentImage, attachmentAudio]);

  function confirmEjeSwitch(eje: EjeOnda): void {
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
    confirmEjeSwitch(eje);
    setShowMenu(true);
    setShowIASubmenu(false);
  }

  function goToInicio(): void {
    setCurrentEje(null);
    setShowMenu(true);
    setShowIASubmenu(false);
    setShowPickOndaNotice(false);
  }

  function handleMenuOption(optionId: string, label: string, intro: string, isSubmenu?: boolean): void {
    if (isSubmenu) {
      setShowIASubmenu(true);
      setMessages((m) => [...m, newMessage("model", intro)]);
      return;
    }
    setShowMenu(false);
    setShowIASubmenu(false);
    const botMessage =
      optionId === "A_M1" ? ONDA_MICROCOPY.linkHelpBotMessage : intro;
    setMessages((m) => [
      ...m,
      newMessage("user", label),
      newMessage("model", botMessage),
    ]);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    const hasContent = text || attachmentImage || attachmentAudio;
    if (!hasContent || loading) return;
    if (currentEje === null) {
      setShowPickOndaNotice(true);
      return;
    }

    setInput("");
    const imageToSend = attachmentImage;
    const audioToSend = attachmentAudio;
    setAttachmentImage(null);
    setAttachmentAudio(null);

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const userMsg = newMessage("user", text || (audioToSend ? "🎤 Mensaje de voz" : "🖼️ Imagen"), {
      image: imageToSend ?? undefined,
      audio: !!audioToSend,
    });
    const placeholderMsg = newMessage("model", "", { isGenerated: true });
    setMessages((m) => [...m, userMsg, placeholderMsg]);
    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60_000);

    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          image: imageToSend ?? undefined,
          audio: audioToSend ?? undefined,
          eje: currentEje,
          history,
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
          (res.status === 413 && isImage ? ONDA_MICROCOPY.errorImage : ONDA_MICROCOPY.errorGeneric);
        setMessages((m) =>
          m.map((msg) =>
            msg.id === placeholderMsg.id ? { ...msg, content: errMsg } : msg
          )
        );
        setLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      let fullContent = "";
      let receivedAnyText = false;
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const lines = (acc + decoder.decode(value, { stream: true })).split("\n");
          acc = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const obj = JSON.parse(line);
              if (obj.done) break;
              if (typeof obj.text === "string") {
                receivedAnyText = true;
                fullContent += obj.text;
                setMessages((m) =>
                  m.map((msg) =>
                    msg.id === placeholderMsg.id ? { ...msg, content: msg.content + obj.text } : msg
                  )
                );
              }
              if (obj.error) {
                receivedAnyText = true;
                fullContent = obj.error;
                setMessages((m) =>
                  m.map((msg) =>
                    msg.id === placeholderMsg.id ? { ...msg, content: obj.error } : msg
                  )
                );
                break;
              }
            } catch {
              // ignore malformed line
            }
          }
        }
      }
      if (receivedAnyText && fullContent) {
        const parsed = parseResponseFormat(fullContent);
        setMessages((m) =>
          m.map((msg) =>
            msg.id === placeholderMsg.id
              ? { ...msg, content: parsed.text, guideId: parsed.guideId ?? undefined }
              : msg
          )
        );
      } else if (!receivedAnyText) {
        setMessages((m) =>
          m.map((msg) =>
            msg.id === placeholderMsg.id ? { ...msg, content: ONDA_MICROCOPY.errorGeneric } : msg
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
                  ? ONDA_MICROCOPY.errorTimeout
                  : ONDA_MICROCOPY.errorConnection,
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

  function handlePaste(e: React.ClipboardEvent) {
    const item = e.clipboardData?.items?.[0];
    if (item?.type.startsWith("image/")) {
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
        const reader = new FileReader();
        reader.onload = () => setAttachmentAudio(reader.result as string);
        reader.readAsDataURL(blob);
      };
      recorder.start();
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
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, 4096) }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      audio.play();
    } catch (err) {
      console.error("TTS failed", err);
    }
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
  const linkHelp = Boolean(
    lastUserMessage &&
    (hasUrl(lastUserMessage.content) || lastUserMessage.content.includes("Entender una noticia"))
  );
  /** Regla: no repetir frases. No mostrar el bloque "Pega el texto..." si el bot ya lo dijo en cualquier mensaje del chat. */
  const botAlreadySaidLinkHelp = messages.some(
    (m) =>
      m.role === "model" &&
      m.content &&
      (m.content.trim() === ONDA_MICROCOPY.linkHelpBotMessage.trim() ||
        m.content.trim().startsWith("Pega el texto, el pantallazo"))
  );
  const showLinkHelpBlock = linkHelp && currentEje !== null && !botAlreadySaidLinkHelp;

  /** Mismo shell en local y en embed (Wix): mismo ancho máx, mismo comportamiento. */
  const shellStyle: CSSProperties =
    currentEje === null
      ? { ...S.shell, flex: "0 0 auto", minHeight: 420, maxHeight: "calc(100dvh - 48px)", display: "flex", flexDirection: "column", overflow: "hidden" }
      : S.shell;

  const pageStyle: CSSProperties = {
    ...S.page,
    /* Con onda sin elegir: shell arriba (flex-start) para que el header se vea siempre, no centrado. */
    ...(currentEje === null ? { justifyContent: "flex-start", alignItems: "center" } : {}),
  };

  /** En embed (Wix): mismo wrapper que la página normal para que se vea idéntico a local. */
  const embedWrap: CSSProperties | undefined = isEmbed ? pageStyle : undefined;

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

  /** Contenedor de mensajes: flujo estricto hacia abajo (arriba = viejo, abajo = nuevo), como WhatsApp. */
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
    padding: currentEje === null ? "8px 14px 0 14px" : "8px 14px 0 14px",
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

  const hasContent = !!(input.trim() || attachmentImage || attachmentAudio);
  const canSend = !loading && currentEje !== null && hasContent;

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
    <div className="onda-shell" style={shellStyle}>
      {/* Header: logo, nombre y badge (parte de arriba del bot). */}
      <div style={{ ...headerStyle, flexShrink: 0 }}>
        <div style={S.titleWrap}>
          <img src="/logo-onda.png" alt="ONDA" width={28} height={28} style={{ display: "block", objectFit: "contain" }} />
          <div style={{ fontWeight: 700, fontSize: compact ? "1.0625rem" : "1.25rem", letterSpacing: ".04em", color: t.c.ink }}>
            ONDA
          </div>
          <div style={S.titleBadge} title="Onda activa" aria-hidden />
        </div>
      </div>

      {/* Chat body */}
      <div style={chatBody}>
        {/* Messages */}
        <div className="onda-messages" style={msgsArea}>
          <div ref={messagesInnerRef} className="onda-messages-inner" style={msgsInner}>
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
                    onPlayTTS={undefined}
                    theme={t}
                  />
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
                onPlayTTS={msg.role === "model" && msg.content && msg.isGenerated ? playTTS : undefined}
                theme={t}
              />
            </div>
          ))}

          {/* Loading: "Escribiendo..." siempre abajo para que se vea debajo del mensaje de bienvenida */}
          {loading &&
            !(messages.length > 0 && messages[messages.length - 1].role === "model" && messages[messages.length - 1].content === "") && (
              <div ref={lastBubbleRef} className="bubble-in" style={S.row(false)}>
                <div style={{ ...S.bubble(false), fontStyle: "italic", color: t.c.muted, animation: "pulse 1.4s ease-in-out infinite" }}>
                  {ONDA_MICROCOPY.typing}
                </div>
              </div>
            )}

          {/* Pick onda notice */}
          {showPickOndaNotice && (
            <div className="bubble-in" style={S.row(false)}>
              <div style={noticeStyle}>
                <span>{ONDA_MICROCOPY.pickOndaFirst}</span>
                <button type="button" data-onda-action="dismiss-notice" onClick={() => setShowPickOndaNotice(false)} style={noticeBtnStyle}>
                  Entendido
                </button>
              </div>
            </div>
          )}

          {/* Onda picker: no se muestra cuando ya hay onda elegida */}
            </>
          )}

          <div ref={bottomRef} />
          </div>
        </div>

        {/* Tabs, menu, chips, composer: capa con z-index alto para que todos los botones reciban clics */}
        <div className="onda-composer-layer" style={{ flexShrink: 0, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {/* Tabs */}
        {currentEje !== null && (
          <>
            <EjeSelector currentEje={currentEje} onSelect={confirmEjeSwitch} compact={compact} theme={t} />
            {justSwitchedEje !== null && (
              <p style={{ margin: "-2px 0 4px", fontSize: compact ? "0.8125rem" : "0.875rem", color: neuPickerColorDarkMap[justSwitchedEje], fontWeight: 600, padding: "0 4px" }}>
                Ahora en {EJE_CONFIGS[justSwitchedEje].name}
              </p>
            )}
          </>
        )}

        {/* Menu options */}
        {currentEje !== null && showMenu && !showIASubmenu && (
          <div className="onda-menu-list" style={{ ...menuList, position: "relative", zIndex: 2 }}>
            {EJE_MENU_OPTIONS[currentEje].map((opt) => (
              <button
                key={opt.id}
                type="button"
                className="onda-menu-btn"
                data-onda-menu-id={opt.id}
                data-onda-menu-label={opt.label}
                data-onda-menu-intro={opt.intro}
                data-onda-menu-sub={opt.isSubmenu ? "1" : undefined}
                onClick={() => handleMenuOption(opt.id, opt.label, opt.intro, opt.isSubmenu)}
                disabled={loading}
                style={menuBtnStyle}
                {...S.lift.menu}
              >
                {opt.label}
              </button>
            ))}
            <button type="button" className="onda-menu-btn" data-onda-action="close-menu" onClick={() => setShowMenu(false)} style={menuSec} {...S.lift.menu}>
              💬 Escribir libremente
            </button>
            <button type="button" className="onda-menu-btn" data-onda-action="go-inicio" onClick={goToInicio} style={menuSec} title="Salir de esta Onda y elegir otra (A Mano, Civita, Profes)" {...S.lift.menu}>
              🏠 Volver al inicio
            </button>
          </div>
        )}

        {/* IA submenu */}
        {currentEje !== null && showIASubmenu && (
          <div className="onda-menu-list" style={{ ...menuList, position: "relative", zIndex: 2 }}>
            {IA_SUBMENU_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className="onda-menu-btn"
                data-onda-menu-id={opt.id}
                data-onda-menu-label={opt.label}
                data-onda-menu-intro={opt.intro}
                data-onda-menu-sub="0"
                onClick={() => handleMenuOption(opt.id, opt.label, opt.intro)}
                disabled={loading}
                style={menuBtnStyle}
                {...S.lift.menu}
              >
                {opt.label}
              </button>
            ))}
            <button type="button" className="onda-menu-btn" data-onda-action="show-menu" onClick={() => setShowIASubmenu(false)} style={menuSec} title="Ver de nuevo las opciones de esta Onda" {...S.lift.menu}>
              ↩️ Volver al menú
            </button>
            <button type="button" className="onda-menu-btn" data-onda-action="go-inicio" onClick={goToInicio} style={menuSec} title="Salir de esta Onda y elegir otra (A Mano, Civita, Profes)" {...S.lift.menu}>
              🏠 Volver al inicio
            </button>
          </div>
        )}

        {/* Suggestion chips */}
        {currentEje !== null && !showMenu && !showIASubmenu && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 6, padding: "0 4px", alignItems: "center" }}>
            {EJE_SUGGESTIONS[currentEje].map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                data-onda-chip={suggestion}
                onClick={() => useSuggestion(suggestion)}
                disabled={loading}
                style={chipBase}
              >
                {suggestion}
              </button>
            ))}
            <button
              type="button"
              data-onda-action="show-menu"
              onClick={() => { setShowMenu(true); setShowIASubmenu(false); }}
              style={chipMuted}
            >
              📋 Ver menú
            </button>
          </div>
        )}

        {/* Composer */}
        <div style={S.composer}>
          {/* Sin Onda elegida: indicar que debe elegir para enviar + botones aquí por si los de arriba no responden (embed/iframe) */}
          {currentEje === null && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: "min(88%, 320px)", position: "relative", zIndex: 11 }}>
                {ORDERED_EJES.map((eje, idx) => {
                  const config = EJE_CONFIGS[eje];
                  const href = `?eje=${eje}`;
                  return (
                    <a
                      key={eje}
                      href={href}
                      data-onda-picker-composer
                      data-onda-eje={eje}
                      aria-label={`Elegir ${config.name}`}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.preventDefault();
                        pickEje(eje);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          pickEje(eje);
                        }
                      }}
                      style={{
                        padding: "12px 16px",
                        borderRadius: 22,
                        border: "none",
                        background: neuPickerColorMap[eje],
                        color: "#fff",
                        fontSize: "1.0625rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        touchAction: "manipulation",
                        boxShadow: t.shadow.neuRaisedColoredSolid(neuPickerColorMap[eje]),
                        textAlign: "left",
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        width: "100%",
                        position: "relative",
                        zIndex: 11 + idx,
                        textDecoration: "none",
                      }}
                    >
                      <span className="onda-picker-btn-inner">{config.name}</span>
                      <span className="onda-picker-btn-inner" style={{ fontSize: "0.875rem", fontWeight: 400, color: "rgba(255,255,255,0.92)" }}>
                        {config.description}
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
          {/* Recordatorio solo si el bot aún no ha dicho "Pega el texto..." en el chat (evita duplicado) */}
          {showLinkHelpBlock && (
            <div style={{ marginBottom: 10, fontSize: "1.0625rem", color: t.c.ink, lineHeight: 1.4 }}>
              {ONDA_MICROCOPY.linkHelpBotMessage}
            </div>
          )}
          {/* Volver al menú / Volver al inicio (cuando no estás en el menú) */}
          {currentEje !== null && !showMenu && (
            <div style={{ marginBottom: 10, display: "flex", flexWrap: "wrap", gap: "12px 16px", alignItems: "center" }}>
              <button
                type="button"
                data-onda-action="show-menu"
                onClick={() => { setShowMenu(true); setShowIASubmenu(false); }}
                title="Ver de nuevo las opciones de esta Onda"
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
                📋 Volver al menú
              </button>
              <button
                type="button"
                data-onda-action="go-inicio"
                onClick={goToInicio}
                title="Salir de esta Onda y elegir otra (A Mano, Civita, Profes)"
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
                🏠 Volver al inicio
              </button>
            </div>
          )}
          {/* Attachment preview */}
          {(attachmentImage || attachmentAudio) && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              {attachmentImage && (
                <div style={{ position: "relative" }}>
                  <img
                    src={attachmentImage}
                    alt="Adjunto"
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
                    Quitar
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Input row */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(e); }}
            onPaste={handlePaste}
            style={{ display: "flex", gap: 10, alignItems: "center" }}
          >
            <input type="file" accept="image/*" onChange={handleImageFile} style={{ display: "none" }} id="onda-image-upload" />
            <label htmlFor="onda-image-upload" style={iconStyle} title="Subir imagen o pegar (Ctrl+V)">
              🖼️
            </label>

            {recording ? (
              <button type="button" onClick={stopRecording} style={stopStyle}>
                ⏹ Detener
              </button>
            ) : (
              <button type="button" onClick={startRecording} disabled={loading} style={iconStyle} title="Grabar voz">
                🎤
              </button>
            )}

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e as unknown as React.FormEvent);
                }
              }}
              placeholder={
                linkHelp
                  ? ONDA_MICROCOPY.linkHelpPlaceholder
                  : currentEje
                    ? showMenu
                      ? ONDA_MICROCOPY.placeholderGeneric
                      : ""
                    : ONDA_MICROCOPY.placeholderGeneric
              }
              disabled={loading}
              style={inpStyle}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
            />

            <button
              type="button"
              data-onda-send
              disabled={!canSend}
              style={sendStyle}
              {...S.lift.send}
              onClick={(e) => {
                e.preventDefault();
                handleSend(e as unknown as React.FormEvent);
              }}
            >
              {linkHelp ? ONDA_MICROCOPY.linkHelpCta : ONDA_MICROCOPY.send}
            </button>
          </form>
        </div>
        </div>
      </div>
    </div>
  );

  if (isEmbed) {
    return (
      <div ref={embedWrapRef} className="onda-page-wrap" style={embedWrap}>
        {content}
      </div>
    );
  }
  return <div className="onda-page-wrap" style={pageStyle}>{content}</div>;
}
