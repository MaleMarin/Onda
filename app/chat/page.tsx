"use client";

import { useState, useRef, useEffect } from "react";
import {
  MAIN_WELCOME,
  WELCOME_A_MANO,
  WELCOME_CIVITA,
  WELCOME_PROFES,
  EJE_CONFIGS,
  EJE_SUGGESTIONS,
  ONDA_MICROCOPY,
  ORDERED_EJES,
} from "@/content/shared";
import { EjeOnda, type Message } from "@/content/types";
import { parseResponseFormat } from "@/lib/responseFormat";
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
    const welcome =
      eje === EjeOnda.A_MANO
        ? WELCOME_A_MANO
        : eje === EjeOnda.CIVITA
          ? WELCOME_CIVITA
          : WELCOME_PROFES;
    setMessages((m) => [...m, newMessage("model", welcome)]);
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
        stream.getTracks().forEach((t) => t.stop());
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

  const isEmbed = embed;

  // Tamaños compactos en embed
  const compact = isEmbed;
  const blue = "#2563eb";
  const glassWhite = "rgba(255, 255, 255, 0.82)";
  const glassBorder = "rgba(255, 255, 255, 0.95)";
  const glassShadow = "0 4px 24px rgba(0, 0, 0, 0.06)";

  const embedWrapperStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    minHeight: "320px",
    display: isEmbed ? "flex" : "block",
    flexDirection: "column",
    boxSizing: "border-box",
    padding: compact ? "0" : "12px",
    background: isEmbed ? "transparent" : "linear-gradient(165deg, #dbeafe 0%, #eff6ff 45%, #e0e7ff 100%)",
    overflow: "hidden",
  };

  const containerStyle: React.CSSProperties = isEmbed
    ? {
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        background: glassWhite,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderRadius: compact ? 14 : 20,
        boxShadow: glassShadow + ", 0 0 0 1px " + glassBorder,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.7)",
        boxSizing: "border-box",
      }
    : {
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        background: "linear-gradient(165deg, #dbeafe 0%, #eff6ff 50%, #e0e7ff 100%)",
      };

  const embedHeaderStyle: React.CSSProperties = {
    background: "rgba(255, 255, 255, 0.6)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    color: "#1e40af",
    padding: compact ? "8px 12px" : "14px 20px",
    fontSize: compact ? "0.8rem" : "0.95rem",
    fontWeight: 600,
    letterSpacing: "0.03em",
    borderBottom: "1px solid rgba(255,255,255,0.8)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  };

  const headerFullStyle: React.CSSProperties = {
    background: "rgba(255, 255, 255, 0.6)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    color: "#1e40af",
    padding: "0.75rem 1rem",
    textAlign: "center",
    borderBottom: "1px solid rgba(255,255,255,0.6)",
  };

  const bubbleBotStyle: React.CSSProperties = {
    background: "rgba(255, 255, 255, 0.85)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    color: "#334155",
    boxShadow: "0 1px 8px rgba(0,0,0,0.04), 0 0 0 1px rgba(255,255,255,0.9)",
    border: "1px solid rgba(255,255,255,0.95)",
  };

  const bubbleUserStyle: React.CSSProperties = {
    background: "rgba(37, 99, 235, 0.2)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    color: "#1e40af",
    boxShadow: "0 1px 8px rgba(37, 99, 235, 0.15), 0 0 0 1px rgba(255,255,255,0.6)",
    border: "1px solid rgba(255,255,255,0.7)",
  };

  const bubblePadding = compact ? "10px 14px" : "12px 16px";
  const bubbleRadius = compact ? 12 : 14;
  const bubbleFontSize = compact ? "0.8125rem" : "0.875rem";
  const bubbleMaxWidth = compact ? "min(88%, 300px)" : "min(88%, 340px)";
  const messagesGap = compact ? 8 : 10;
  const mainPadding = compact ? "12px" : "16px";
  const inputPadding = compact ? "10px 14px" : "12px 16px";
  const inputRadius = compact ? 14 : 18;
  const inputFontSize = compact ? "0.8125rem" : "0.875rem";
  const btnPadding = compact ? "10px 16px" : "12px 18px";
  const btnFontSize = compact ? "0.8125rem" : "0.875rem";

  const content = (
    <div style={containerStyle}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes bubbleIn {
              from { opacity: 0; transform: translateY(6px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .bubble-in {
              animation: bubbleIn 0.25s ease-out;
            }
          `,
        }}
      />
      {isEmbed ? (
        <div style={embedHeaderStyle}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: blue,
              boxShadow: "0 0 0 2px rgba(37, 99, 235, 0.3)",
            }}
          />
          Chatea con ONDA · Fundación Precisar
        </div>
      ) : (
        <header style={headerFullStyle}>
          <h1 style={{ margin: 0, fontSize: "1.1rem" }}>ONDA – Fundación Precisar</h1>
          <p style={{ margin: "0.2rem 0 0", fontSize: "0.8rem", opacity: 0.9 }}>
            Alfabetización Mediática e Informacional (AMI)
          </p>
        </header>
      )}

      <main
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          maxWidth: isEmbed ? "100%" : "28rem",
          margin: isEmbed ? 0 : "0 auto",
          width: "100%",
          padding: mainPadding,
          display: "flex",
          flexDirection: "column",
          background: "transparent",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: messagesGap,
            marginBottom: messagesGap,
          }}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="bubble-in"
              style={{
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                maxWidth: bubbleMaxWidth,
                width: "100%",
              }}
            >
              <ChatBubble
                message={msg}
                color={currentEje ? EJE_CONFIGS[currentEje].color : blue}
                compact={compact}
                onPlayTTS={msg.role === "model" && msg.content ? playTTS : undefined}
              />
            </div>
          ))}
          {loading &&
            !(
              messages.length > 0 &&
              messages[messages.length - 1].role === "model" &&
              messages[messages.length - 1].content === ""
            ) && (
              <div
                className="bubble-in"
                style={{
                  alignSelf: "flex-start",
                  maxWidth: bubbleMaxWidth,
                  padding: bubblePadding,
                  borderRadius: bubbleRadius,
                  color: "#64748b",
                  fontStyle: "italic",
                  fontSize: bubbleFontSize,
                  ...bubbleBotStyle,
                }}
              >
                {ONDA_MICROCOPY.typing}
              </div>
            )}
          {showPickOndaNotice && (
            <div
              className="bubble-in"
              style={{
                alignSelf: "flex-start",
                maxWidth: bubbleMaxWidth,
                padding: bubblePadding,
                borderRadius: bubbleRadius,
                background: "rgba(234, 179, 8, 0.15)",
                border: "1px solid rgba(234, 179, 8, 0.4)",
                color: "#854d0e",
                fontSize: bubbleFontSize,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span>{ONDA_MICROCOPY.pickOndaFirst}</span>
              <button
                type="button"
                onClick={() => setShowPickOndaNotice(false)}
                style={{
                  flexShrink: 0,
                  padding: "4px 10px",
                  borderRadius: 8,
                  border: "none",
                  background: "rgba(234, 179, 8, 0.3)",
                  color: "#854d0e",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "0.75rem",
                }}
              >
                Entendido
              </button>
            </div>
          )}
          {currentEje === null && (
            <div
              className="bubble-in"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginTop: 4,
                maxWidth: bubbleMaxWidth,
              }}
            >
              <div style={{ fontSize: bubbleFontSize, color: "#64748b", marginBottom: 4 }}>
                Elige una Onda:
              </div>
              {ORDERED_EJES.map((eje) => {
                const config = EJE_CONFIGS[eje];
                return (
                  <button
                    key={eje}
                    type="button"
                    onClick={() => pickEje(eje)}
                    style={{
                      padding: "12px 16px",
                      borderRadius: 12,
                      border: `2px solid ${config.color}`,
                      background: "rgba(255,255,255,0.9)",
                      color: config.color,
                      fontWeight: 600,
                      fontSize: bubbleFontSize,
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 4,
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span>{config.icon}</span>
                      <span>{config.name}</span>
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "#64748b",
                        fontWeight: 400,
                      }}
                    >
                      {config.description}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {currentEje !== null && (
          <>
            <EjeSelector
              currentEje={currentEje}
              onSelect={confirmEjeSwitch}
              compact={compact}
            />
            {justSwitchedEje !== null && (
              <p
                style={{
                  margin: "-6px 0 8px",
                  fontSize: compact ? "0.7rem" : "0.75rem",
                  color: EJE_CONFIGS[justSwitchedEje].color,
                  fontWeight: 500,
                }}
              >
                Ahora en {EJE_CONFIGS[justSwitchedEje].name}
              </p>
            )}
          </>
        )}

        {currentEje !== null && EJE_SUGGESTIONS[currentEje].length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: 8,
              minWidth: 0,
            }}
          >
            {EJE_SUGGESTIONS[currentEje].map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => useSuggestion(suggestion)}
                disabled={loading}
                style={{
                  padding: compact ? "6px 10px" : "8px 12px",
                  borderRadius: 9999,
                  border: `1px solid ${EJE_CONFIGS[currentEje].color}`,
                  background: "rgba(255,255,255,0.9)",
                  color: EJE_CONFIGS[currentEje].color,
                  fontSize: compact ? "0.7rem" : "0.75rem",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                  whiteSpace: "nowrap",
                  maxWidth: "100%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {(attachmentImage || attachmentAudio) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
              flexWrap: "wrap",
            }}
          >
            {attachmentImage && (
              <div style={{ position: "relative" }}>
                <img
                  src={attachmentImage}
                  alt="Adjunto"
                  style={{
                    height: 48,
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setAttachmentImage(null)}
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    border: "none",
                    background: "#64748b",
                    color: "white",
                    cursor: "pointer",
                    fontSize: 14,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            )}
            {attachmentAudio && (
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                🎤 Audio listo
                <button
                  type="button"
                  onClick={() => setAttachmentAudio(null)}
                  style={{
                    padding: "2px 8px",
                    borderRadius: 6,
                    border: "none",
                    background: "#e2e8f0",
                    cursor: "pointer",
                    fontSize: "0.7rem",
                  }}
                >
                  Quitar
                </button>
              </span>
            )}
          </div>
        )}
        <form
          onSubmit={handleSend}
          onPaste={handlePaste}
          style={{
            display: "flex",
            flexDirection: compact ? "column" : "row",
            flexWrap: compact ? "nowrap" : "wrap",
            gap: compact ? 6 : 8,
            minWidth: 0,
          }}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleImageFile}
            style={{ display: "none" }}
            id="onda-image-upload"
          />
          <label
            htmlFor="onda-image-upload"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              background: "rgba(255,255,255,0.9)",
              cursor: "pointer",
              flexShrink: 0,
            }}
            title="Subir imagen o pegar (Ctrl+V)"
          >
            🖼️
          </label>
          {recording ? (
            <button
              type="button"
              onClick={stopRecording}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: "none",
                background: "#dc2626",
                color: "white",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: "0.8rem",
              }}
            >
              ⏹ Detener
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              disabled={loading}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 40,
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                background: "rgba(255,255,255,0.9)",
                cursor: loading ? "not-allowed" : "pointer",
                flexShrink: 0,
              }}
              title="Grabar voz"
            >
              🎤
            </button>
          )}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={currentEje ? EJE_CONFIGS[currentEje].placeholder : "Escribe, imagen o voz..."}
            disabled={loading}
            style={{
              flex: compact ? "0 0 auto" : "1 1 100px",
              width: compact ? "100%" : undefined,
              minWidth: 0,
              padding: inputPadding,
              borderRadius: inputRadius,
              fontSize: inputFontSize,
              outline: "none",
              color: "#334155",
              background: "rgba(255, 255, 255, 0.8)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.95)",
              boxShadow: "0 1px 6px rgba(0,0,0,0.03)",
              boxSizing: "border-box",
            }}
          />
          <button
            type="submit"
            disabled={loading || (!input.trim() && !attachmentImage && !attachmentAudio)}
            style={{
              width: compact ? "100%" : undefined,
              padding: btnPadding,
              borderRadius: inputRadius,
              border: "none",
              background: blue,
              color: "white",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: btnFontSize,
              boxShadow: "0 2px 10px rgba(37, 99, 235, 0.35)",
              flexShrink: 0,
              boxSizing: "border-box",
            }}
          >
            {ONDA_MICROCOPY.send}
          </button>
        </form>
      </main>
    </div>
  );

  return isEmbed ? (
    <div style={embedWrapperStyle}>{content}</div>
  ) : (
    content
  );
}
