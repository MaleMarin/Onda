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

  // Glassmorphism: azul suave como acento, fondos translúcidos
  const blue = "#3b82f6";
  const glassWhite = "rgba(255, 255, 255, 0.75)";
  const glassBorder = "rgba(255, 255, 255, 0.9)";
  const glassShadow = "0 8px 32px rgba(0, 0, 0, 0.06)";

  const embedWrapperStyle: React.CSSProperties = {
    padding: "12px",
    height: "100%",
    minHeight: 400,
    boxSizing: "border-box",
    background: "linear-gradient(160deg, #e0e7ff 0%, #f0f4ff 50%, #e8f0fe 100%)",
  };

  const containerStyle: React.CSSProperties = isEmbed
    ? {
        height: "100%",
        minHeight: 380,
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        background: glassWhite,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: 20,
        boxShadow: glassShadow + ", 0 0 0 1px " + glassBorder,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.6)",
      }
    : {
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        background: "linear-gradient(160deg, #e0e7ff 0%, #f0f4ff 50%, #e8f0fe 100%)",
      };

  const embedHeaderStyle: React.CSSProperties = {
    background: "rgba(255, 255, 255, 0.5)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    color: "#1e3a5f",
    padding: "14px 20px",
    fontSize: "0.95rem",
    fontWeight: 600,
    letterSpacing: "0.02em",
    borderBottom: "1px solid rgba(255,255,255,0.7)",
    boxShadow: "0 1px 0 rgba(255,255,255,0.8)",
  };

  const headerFullStyle: React.CSSProperties = {
    background: "rgba(255, 255, 255, 0.6)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    color: "#1e3a5f",
    padding: "1rem 1.5rem",
    textAlign: "center",
    borderBottom: "1px solid rgba(255,255,255,0.6)",
  };

  const bubbleBotStyle: React.CSSProperties = {
    background: "rgba(255, 255, 255, 0.7)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    color: "#334155",
    boxShadow: "0 2px 12px rgba(0,0,0,0.04), 0 0 0 1px rgba(255,255,255,0.8)",
    border: "1px solid rgba(255,255,255,0.9)",
  };

  const bubbleUserStyle: React.CSSProperties = {
    background: "rgba(59, 130, 246, 0.35)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    color: "#1e3a5f",
    boxShadow: "0 2px 12px rgba(59, 130, 246, 0.2), 0 0 0 1px rgba(255,255,255,0.5)",
    border: "1px solid rgba(255,255,255,0.6)",
  };

  const inputGlassStyle: React.CSSProperties = {
    background: "rgba(255, 255, 255, 0.7)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.9)",
    boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
  };

  const content = (
    <div style={containerStyle}>
      {isEmbed ? (
        <div style={embedHeaderStyle}>Chatea con ONDA · Fundación Precisar</div>
      ) : (
        <header style={headerFullStyle}>
          <h1 style={{ margin: 0, fontSize: "1.25rem" }}>ONDA – Fundación Precisar</h1>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem", opacity: 0.9 }}>
            Alfabetización Mediática e Informacional (AMI)
          </p>
        </header>
      )}

      <main
        style={{
          flex: 1,
          maxWidth: isEmbed ? "100%" : "42rem",
          margin: isEmbed ? 0 : "0 auto",
          width: "100%",
          padding: isEmbed ? "18px" : "1rem",
          display: "flex",
          flexDirection: "column",
          minHeight: isEmbed ? 280 : undefined,
          background: isEmbed ? "transparent" : "transparent",
        }}
      >
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            marginBottom: "14px",
          }}
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
                padding: "14px 18px",
                borderRadius: 16,
                fontSize: "0.9375rem",
                lineHeight: 1.55,
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
                padding: "14px 18px",
                borderRadius: 16,
                color: "#64748b",
                fontStyle: "italic",
                fontSize: "0.9rem",
                ...bubbleBotStyle,
              }}
            >
              ONDA está escribiendo...
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} style={{ display: "flex", gap: "10px" }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu pregunta..."
            disabled={loading}
            style={{
              flex: 1,
              padding: "14px 18px",
              borderRadius: 20,
              fontSize: "0.9375rem",
              outline: "none",
              color: "#334155",
              ...inputGlassStyle,
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{
              padding: "14px 22px",
              borderRadius: 20,
              border: "none",
              background: blue,
              color: "white",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "0.9375rem",
              boxShadow: "0 4px 14px rgba(59, 130, 246, 0.4)",
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
