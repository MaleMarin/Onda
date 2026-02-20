"use client";

import { useState, useRef, useEffect } from "react";

type Message = { role: "user" | "bot"; text: string };

export default function ChatPage() {
  const [embed, setEmbed] = useState(false);
  useEffect(() => {
    setEmbed(new URLSearchParams(window.location.search).get("embed") === "1");
  }, []);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      text: "Hola, soy ONDA, asistente de la Fundación Precisar. Puedo ayudarte con Alfabetización Mediática e Informacional (AMI). ¿Qué te gustaría saber? Puedes preguntar sobre A Mano, Civita o Profes.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessages((m) => [
          ...m,
          { role: "bot", text: data?.error || "Error al obtener respuesta." },
        ]);
        return;
      }

      setMessages((m) => [...m, { role: "bot", text: data.reply || "" }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "bot", text: "No pude conectar. Revisa tu conexión." },
      ]);
    } finally {
      setLoading(false);
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
    padding: compact ? "6px" : "12px",
    boxSizing: "border-box",
    background: "linear-gradient(165deg, #dbeafe 0%, #eff6ff 45%, #e0e7ff 100%)",
  };

  const containerStyle: React.CSSProperties = isEmbed
    ? {
        flex: 1,
        minHeight: 0,
        height: "100%",
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
          minHeight: isEmbed ? 260 : 0,
          maxWidth: isEmbed ? "100%" : "28rem",
          margin: isEmbed ? 0 : "0 auto",
          width: "100%",
          padding: mainPadding,
          display: "flex",
          flexDirection: "column",
          background: "transparent",
          overflow: "hidden",
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
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                maxWidth: bubbleMaxWidth,
                padding: bubblePadding,
                borderRadius: bubbleRadius,
                fontSize: bubbleFontSize,
                lineHeight: 1.5,
                ...(msg.role === "user" ? bubbleUserStyle : bubbleBotStyle),
              }}
            >
              <div style={{ whiteSpace: "pre-wrap" }}>{msg.text}</div>
            </div>
          ))}
          {loading && (
            <div
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
              ONDA está escribiendo...
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={handleSend}
          style={{
            display: "flex",
            flexDirection: compact ? "column" : "row",
            flexWrap: compact ? "nowrap" : "wrap",
            gap: compact ? 6 : 8,
            minWidth: 0,
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu pregunta..."
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
            disabled={loading || !input.trim()}
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
            Enviar
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
