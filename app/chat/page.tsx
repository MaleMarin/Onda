"use client";

/**
 * UI del chat Onda. Cambios estéticos: ver .cursor/rules/onda-ui-no-romper-interactividad.mdc
 * No tocar: onClick/onSubmit en botones y form; no añadir pointer-events:none ni overlays sobre .onda-shell.
 */

import { useState, useRef, useEffect, useMemo, type CSSProperties } from "react";
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

export default function ChatPage() {
  const t = useOndaTheme(true);
  const S = useMemo(() => ondaStyles(t), [t]);

  const [embed, setEmbed] = useState(false);
  useEffect(() => {
    setEmbed(new URLSearchParams(window.location.search).get("embed") === "1");
  }, []);

  const [messages, setMessages] = useState<Message[]>([
    newMessage("model", MAIN_WELCOME),
  ]);
  const [currentEje, setCurrentEje] = useState<EjeOnda | null>(null);
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
  const switchHintRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
  const compact = isEmbed;
  const neuPickerColorMap: Record<EjeOnda, string> = {
    [EjeOnda.A_MANO]: t.neuColors.red,
    [EjeOnda.CIVITA]: t.neuColors.teal,
    [EjeOnda.PROFES]: t.neuColors.purple,
  };
  const ejeColor = currentEje ? neuPickerColorMap[currentEje] : t.neuColors.red;

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  const linkHelp = Boolean(
    lastUserMessage &&
    (hasUrl(lastUserMessage.content) || lastUserMessage.content.includes("Entender una noticia"))
  );

  const shellStyle: CSSProperties = isEmbed
    ? { ...S.shell, maxWidth: "100%", flex: 1, minHeight: 0, borderRadius: t.r.lg }
    : currentEje === null
      ? { ...S.shell, flex: "0 0 auto", minHeight: 420 }
      : S.shell;

  const embedWrap: CSSProperties | undefined = isEmbed
    ? { width: "100%", height: "100%", minHeight: 320, display: "flex", flexDirection: "column", padding: 0, background: "transparent", overflow: "hidden" }
    : undefined;

  const pageStyle: CSSProperties = {
    ...S.page,
    ...(currentEje === null ? { justifyContent: "center", alignItems: "center" } : {}),
  };

  const headerStyle: CSSProperties = compact
    ? { ...S.header, padding: "10px 14px" }
    : S.header;

  const chatBody: CSSProperties = {
    ...S.chat,
    overflow: "hidden",
    ...(currentEje === null ? { flex: "0 0 auto" } : {}),
  };

  const msgsArea: CSSProperties = {
    ...S.messages,
    padding: 0,
    flex: currentEje === null ? "0 0 auto" : 1,
    minHeight: 0,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  };

  const msgsInner: CSSProperties = {
    flex: 1,
    minHeight: 0,
    overflowY: currentEje === null ? "hidden" : "auto",
    overflowX: "hidden",
    display: "flex",
    flexDirection: "column",
    justifyContent: currentEje === null ? "flex-start" : "flex-end",
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
    fontSize: "0.82rem",
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
    fontSize: "0.72rem",
  };

  /** Botones Onda: convexos con colores neumórficos (rojo, teal, púrpura). */
  const pickerBtn = (eje: EjeOnda): CSSProperties => ({
    ...S.glassCard,
    background: neuPickerColorMap[eje],
    border: "2px solid rgba(255,255,255,0.4)",
    padding: "18px 20px",
    borderRadius: 22,
    cursor: "pointer",
    textAlign: "left",
    display: "flex",
    flexDirection: "column",
    gap: 6,
    boxShadow: t.shadow.neuRaisedColored(neuPickerColorMap[eje]),
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  });

  const pickerHover = (eje: EjeOnda) => ({
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.transform = "translateY(-3px)";
      e.currentTarget.style.boxShadow = t.shadow.neuRaisedColoredHover(neuPickerColorMap[eje]);
    },
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.transform = "";
      e.currentTarget.style.boxShadow = t.shadow.neuRaisedColored(neuPickerColorMap[eje]);
    },
    onMouseDown: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.transform = "translateY(1px)";
      e.currentTarget.style.boxShadow = t.shadow.neuPressedColored(neuPickerColorMap[eje]);
    },
    onMouseUp: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.transform = "";
      e.currentTarget.style.boxShadow = t.shadow.neuRaisedColored(neuPickerColorMap[eje]);
    },
  });

  const menuList: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginBottom: 6,
    maxHeight: compact ? 180 : 240,
    overflowY: "auto",
    padding: "0 4px",
  };

  const menuBtnStyle: CSSProperties = {
    padding: compact ? "8px 12px" : "10px 14px",
    borderRadius: t.r.sm,
    color: t.c.ink,
    fontSize: compact ? "0.75rem" : "0.8rem",
    fontWeight: 500,
    cursor: disabledCursor,
    opacity: disabledOpacity,
    textAlign: "left",
    width: "100%",
    transition: "transform 180ms cubic-bezier(.2,.8,.2,1), box-shadow 180ms",
    ...t.fx.crystal,
  };

  const menuSec: CSSProperties = {
    padding: compact ? "6px 10px" : "8px 12px",
    borderRadius: t.r.sm,
    border: `1px solid ${t.glass.borderSoft}`,
    background: "rgba(255,255,255,0.06)",
    color: t.c.muted,
    fontSize: compact ? "0.7rem" : "0.75rem",
    cursor: "pointer",
    textAlign: "center",
    width: "100%",
  };

  const chipBase: CSSProperties = {
    ...S.chip,
    ...(compact ? { padding: "6px 10px", fontSize: "0.7rem" } : {}),
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
    ...(compact ? { padding: "6px 10px", fontSize: "0.7rem" } : {}),
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
    fontSize: "0.78rem",
  };

  const canSend = !loading && !!(input.trim() || attachmentImage || attachmentAudio);

  const inpStyle: CSSProperties = {
    ...S.input,
    border: `1px solid ${ejeColor}99`,
    ...(compact ? { height: 40, fontSize: "0.8rem" } : {}),
    flex: 1,
    minWidth: 0,
    ...(inputFocused ? { boxShadow: `0 0 0 5px ${ejeColor}40`, borderColor: ejeColor } : {}),
  };

  const sendStyle: CSSProperties = {
    ...S.send,
    ...(compact ? { height: 40, padding: "0 16px" } : {}),
    opacity: canSend ? 1 : 0.5,
    cursor: canSend ? "pointer" : "not-allowed",
    flexShrink: 0,
  };

  /* ── render ── */

  const content = (
    <div className="onda-shell" style={shellStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={S.titleWrap}>
          <img src="/logo-onda.png" alt="ONDA" width={28} height={28} style={{ display: "block", objectFit: "contain" }} />
          <div style={{ fontWeight: 700, fontSize: compact ? "0.85rem" : "1rem", letterSpacing: ".04em", color: t.c.ink }}>
            {isEmbed ? "Chatea con ONDA" : "ONDA"}
          </div>
        </div>
      </div>

      {/* Chat body */}
      <div style={chatBody}>
        {/* Messages */}
        <div className="onda-messages" style={msgsArea}>
          <div className="onda-messages-inner" style={msgsInner}>
          {currentEje === null ? (
            <>
              {messages.length > 0 && (
                <div
                  key={messages[0].id}
                  className="bubble-in"
                  style={{
                    ...S.row(false),
                  }}
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
              <div
                className="bubble-in"
                style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: -6, maxWidth: "min(88%, 420px)", flexShrink: 0 }}
              >
                {ORDERED_EJES.map((eje) => {
                  const config = EJE_CONFIGS[eje];
                  return (
                    <button
                      key={eje}
                      type="button"
                      style={pickerBtn(eje)}
                      onClick={() => pickEje(eje)}
                      {...pickerHover(eje)}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: "0.88rem", color: "#fff" }}>
                        <span>{config.name}</span>
                      </span>
                      <span style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.92)", fontWeight: 400 }}>
                        {config.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
          {messages.map((msg) => (
            <div key={msg.id} className="bubble-in" style={S.row(msg.role === "user")}>
              <ChatBubble
                message={msg}
                color={ejeColor}
                compact={compact}
                onPlayTTS={msg.role === "model" && msg.content && msg.isGenerated ? playTTS : undefined}
                theme={t}
              />
            </div>
          ))}

          {/* Loading */}
          {loading &&
            !(messages.length > 0 && messages[messages.length - 1].role === "model" && messages[messages.length - 1].content === "") && (
              <div className="bubble-in" style={S.row(false)}>
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

        {/* Tabs, menu, chips, composer: no shrink so only messages area scrolls */}
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column" }}>
        {/* Tabs */}
        {currentEje !== null && (
          <>
            <EjeSelector currentEje={currentEje} onSelect={confirmEjeSwitch} compact={compact} theme={t} />
            {justSwitchedEje !== null && (
              <p style={{ margin: "-2px 0 4px", fontSize: compact ? "0.7rem" : "0.74rem", color: neuPickerColorMap[justSwitchedEje], fontWeight: 500, padding: "0 4px" }}>
                Ahora en {EJE_CONFIGS[justSwitchedEje].name}
              </p>
            )}
          </>
        )}

        {/* Menu options */}
        {currentEje !== null && showMenu && !showIASubmenu && (
          <div style={menuList}>
            {EJE_MENU_OPTIONS[currentEje].map((opt) => (
              <button
                key={opt.id}
                type="button"
                data-onda-menu-id={opt.id}
                data-onda-menu-label={opt.label}
                data-onda-menu-intro={opt.intro}
                data-onda-menu-sub={opt.isSubmenu ? "1" : undefined}
                onClick={() => handleMenuOption(opt.id, opt.label, opt.intro, opt.isSubmenu)}
                disabled={loading}
                style={menuBtnStyle}
              >
                {opt.label}
              </button>
            ))}
            <button type="button" data-onda-action="close-menu" onClick={() => setShowMenu(false)} style={menuSec}>
              💬 Escribir libremente
            </button>
            <button type="button" data-onda-action="go-inicio" onClick={goToInicio} style={menuSec} title="Salir de esta Onda y elegir otra (A Mano, Civita, Profes)">
              🏠 Volver al inicio
            </button>
          </div>
        )}

        {/* IA submenu */}
        {currentEje !== null && showIASubmenu && (
          <div style={menuList}>
            {IA_SUBMENU_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                data-onda-menu-id={opt.id}
                data-onda-menu-label={opt.label}
                data-onda-menu-intro={opt.intro}
                data-onda-menu-sub="0"
                onClick={() => handleMenuOption(opt.id, opt.label, opt.intro)}
                disabled={loading}
                style={menuBtnStyle}
              >
                {opt.label}
              </button>
            ))}
            <button type="button" data-onda-action="show-menu" onClick={() => setShowIASubmenu(false)} style={menuSec} title="Ver de nuevo las opciones de esta Onda">
              ↩️ Volver al menú
            </button>
            <button type="button" data-onda-action="go-inicio" onClick={goToInicio} style={menuSec} title="Salir de esta Onda y elegir otra (A Mano, Civita, Profes)">
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
          {/* Modo link/noticia: mensaje del bot sin lenguaje de audio */}
          {linkHelp && currentEje !== null && (
            <div style={{ marginBottom: 10, fontSize: "0.85rem", color: t.c.ink, lineHeight: 1.4 }}>
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
                  fontSize: "0.8rem",
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
                  fontSize: "0.8rem",
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
                      fontSize: 13,
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
                <span style={{ fontSize: "0.74rem", color: t.c.muted, display: "flex", alignItems: "center", gap: 6 }}>
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
                      fontSize: "0.68rem",
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
                    ? EJE_CONFIGS[currentEje].placeholder
                    : "Escribe, imagen o voz..."
              }
              disabled={loading}
              style={inpStyle}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
            />

            <button
              type="button"
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
    return <div style={embedWrap}>{content}</div>;
  }
  return <div style={pageStyle}>{content}</div>;
}
