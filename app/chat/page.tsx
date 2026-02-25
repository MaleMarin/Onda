"use client";

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

export default function ChatPage() {
  const t = useOndaTheme();
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

  function handleMenuOption(optionId: string, label: string, intro: string, isSubmenu?: boolean): void {
    if (isSubmenu) {
      setShowIASubmenu(true);
      setMessages((m) => [...m, newMessage("model", intro)]);
      return;
    }
    setShowMenu(false);
    setShowIASubmenu(false);
    setMessages((m) => [
      ...m,
      newMessage("user", label),
      newMessage("model", intro),
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
    const placeholderMsg = newMessage("model", "");
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
        setMessages((m) =>
          m.map((msg) =>
            msg.id === placeholderMsg.id
              ? { ...msg, content: data?.error || ONDA_MICROCOPY.errorGeneric }
              : msg
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
    reader.onload = () => setAttachmentImage(reader.result as string);
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
        reader.onload = () => setAttachmentImage(reader.result as string);
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
  const ejeColor = currentEje ? EJE_CONFIGS[currentEje].color : t.c.brand;

  const shellStyle: CSSProperties = isEmbed
    ? { ...S.shell, maxWidth: "100%", flex: 1, minHeight: 0, borderRadius: t.r.lg }
    : S.shell;

  const embedWrap: CSSProperties | undefined = isEmbed
    ? { width: "100%", height: "100%", minHeight: 320, display: "flex", flexDirection: "column", padding: 0, background: "transparent", overflow: "hidden" }
    : undefined;

  const headerStyle: CSSProperties = compact
    ? { ...S.header, padding: "10px 14px" }
    : S.header;

  const chatBody: CSSProperties = {
    ...(isEmbed ? { flex: 1, minHeight: 0 } : { height: S.chat.height as string }),
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  };

  const msgsArea: CSSProperties = {
    ...S.messages,
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: compact ? 8 : 10,
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

  const pickerBtn: CSSProperties = {
    padding: "14px 16px",
    borderRadius: t.r.md,
    border: `1px solid ${t.c.border}`,
    background: t.c.surface2,
    cursor: "pointer",
    textAlign: "left",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    transition: "transform 180ms cubic-bezier(.2,.8,.2,1), box-shadow 180ms",
  };

  const menuList: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginBottom: 10,
    maxHeight: compact ? 180 : 240,
    overflowY: "auto",
    padding: "0 4px",
  };

  const menuBtnStyle: CSSProperties = {
    padding: compact ? "8px 12px" : "10px 14px",
    borderRadius: t.r.sm,
    border: `1px solid ${t.c.border}`,
    background: t.c.surface2,
    color: t.c.ink,
    fontSize: compact ? "0.75rem" : "0.8rem",
    fontWeight: 500,
    cursor: disabledCursor,
    opacity: disabledOpacity,
    textAlign: "left",
    width: "100%",
    transition: "transform 180ms cubic-bezier(.2,.8,.2,1), box-shadow 180ms",
  };

  const menuSec: CSSProperties = {
    padding: compact ? "6px 10px" : "8px 12px",
    borderRadius: t.r.sm,
    border: `1px solid ${t.c.border}`,
    background: t.isDark ? "rgba(130,150,210,.06)" : "rgba(110,135,190,.06)",
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
    borderColor: t.isDark ? "rgba(130,150,210,.15)" : "rgba(110,135,190,.15)",
    background: t.isDark ? "rgba(130,150,210,.06)" : "rgba(110,135,190,.06)",
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

  const inpStyle: CSSProperties = {
    ...S.input,
    ...(compact ? { height: 40, fontSize: "0.8rem" } : {}),
    flex: 1,
    minWidth: 0,
    ...(inputFocused ? S.inputFocusRing : {}),
  };

  const canSend = !loading && !!(input.trim() || attachmentImage || attachmentAudio);
  const sendStyle: CSSProperties = {
    ...S.send,
    ...(compact ? { height: 40, padding: "0 16px" } : {}),
    opacity: canSend ? 1 : 0.5,
    cursor: canSend ? "pointer" : "not-allowed",
    flexShrink: 0,
  };

  /* ── render ── */

  const content = (
    <div style={shellStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={S.titleWrap}>
          <span style={S.titleBadge} />
          <div>
            <div style={{ fontWeight: 700, fontSize: compact ? "0.85rem" : "1rem", letterSpacing: ".02em", color: t.c.ink }}>
              {isEmbed ? "Chatea con ONDA · Fundación Precisar" : "ONDA – Fundación Precisar"}
            </div>
            {!isEmbed && (
              <div style={{ ...S.subtitle, marginTop: 2 }}>
                Alfabetización Mediática e Informacional (AMI)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat body */}
      <div style={chatBody}>
        {/* Messages */}
        <div style={msgsArea}>
          {messages.map((msg) => (
            <div key={msg.id} className="bubble-in" style={S.row(msg.role === "user")}>
              <ChatBubble
                message={msg}
                color={ejeColor}
                compact={compact}
                onPlayTTS={msg.role === "model" && msg.content ? playTTS : undefined}
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
                <button type="button" onClick={() => setShowPickOndaNotice(false)} style={noticeBtnStyle}>
                  Entendido
                </button>
              </div>
            </div>
          )}

          {/* Onda picker */}
          {currentEje === null && (
            <div className="bubble-in" style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6, maxWidth: "min(88%, 420px)" }}>
              <div style={{ fontSize: "0.82rem", color: t.c.muted, marginBottom: 2 }}>
                Elige una Onda:
              </div>
              {ORDERED_EJES.map((eje) => {
                const config = EJE_CONFIGS[eje];
                return (
                  <button key={eje} type="button" onClick={() => pickEje(eje)} style={pickerBtn} {...S.lift.picker}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: "0.88rem", color: config.color }}>
                      <span>{config.icon}</span>
                      <span>{config.name}</span>
                    </span>
                    <span style={{ fontSize: "0.74rem", color: t.c.muted, fontWeight: 400 }}>
                      {config.description}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Tabs */}
        {currentEje !== null && (
          <>
            <EjeSelector currentEje={currentEje} onSelect={confirmEjeSwitch} compact={compact} theme={t} />
            {justSwitchedEje !== null && (
              <p style={{ margin: "-4px 0 8px", fontSize: compact ? "0.7rem" : "0.74rem", color: EJE_CONFIGS[justSwitchedEje].color, fontWeight: 500, padding: "0 4px" }}>
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
                onClick={() => handleMenuOption(opt.id, opt.label, opt.intro, opt.isSubmenu)}
                disabled={loading}
                style={menuBtnStyle}
                {...S.lift.menu}
              >
                {opt.label}
              </button>
            ))}
            <button type="button" onClick={() => setShowMenu(false)} style={menuSec}>
              💬 Escribir libremente
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
                onClick={() => handleMenuOption(opt.id, opt.label, opt.intro)}
                disabled={loading}
                style={menuBtnStyle}
                {...S.lift.menu}
              >
                {opt.label}
              </button>
            ))}
            <button type="button" onClick={() => setShowIASubmenu(false)} style={menuSec}>
              ↩️ Volver al menú
            </button>
          </div>
        )}

        {/* Suggestion chips */}
        {currentEje !== null && !showMenu && !showIASubmenu && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10, padding: "0 4px", alignItems: "center" }}>
            {EJE_SUGGESTIONS[currentEje].map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => useSuggestion(suggestion)}
                disabled={loading}
                style={chipBase}
                {...S.lift.chip}
              >
                {suggestion}
              </button>
            ))}
            <button
              type="button"
              onClick={() => { setShowMenu(true); setShowIASubmenu(false); }}
              style={chipMuted}
              {...S.lift.chip}
            >
              📋 Ver menú
            </button>
          </div>
        )}

        {/* Composer */}
        <div style={S.composer}>
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
            onSubmit={handleSend}
            onPaste={handlePaste}
            style={{ display: "flex", gap: 10, alignItems: "center" }}
          >
            <input type="file" accept="image/*" onChange={handleImageFile} style={{ display: "none" }} id="onda-image-upload" />
            <label htmlFor="onda-image-upload" style={iconStyle} title="Subir imagen o pegar (Ctrl+V)" {...S.lift.icon}>
              🖼️
            </label>

            {recording ? (
              <button type="button" onClick={stopRecording} style={stopStyle}>
                ⏹ Detener
              </button>
            ) : (
              <button type="button" onClick={startRecording} disabled={loading} style={iconStyle} title="Grabar voz" {...S.lift.icon}>
                🎤
              </button>
            )}

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={currentEje ? EJE_CONFIGS[currentEje].placeholder : "Escribe, imagen o voz..."}
              disabled={loading}
              style={inpStyle}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
            />

            <button
              type="submit"
              disabled={!canSend}
              style={sendStyle}
              {...S.lift.send}
            >
              {ONDA_MICROCOPY.send}
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return isEmbed
    ? <div style={embedWrap}>{content}</div>
    : <div style={S.page}>{content}</div>;
}
