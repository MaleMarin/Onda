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

  return (
    <div
      style={{
        minHeight: embed ? "100%" : "100vh",
        height: embed ? "100%" : undefined,
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, sans-serif",
        background: "#f5f5f5",
      }}
    >
      {!embed && (
        <header
          style={{
            background: "#1a1a2e",
            color: "white",
            padding: "1rem 1.5rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "1.25rem" }}>ONDA – Fundación Precisar</h1>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem", opacity: 0.9 }}>
            Alfabetización Mediática e Informacional (AMI)
          </p>
        </header>
      )}

      <main
        style={{
          flex: 1,
          maxWidth: embed ? "100%" : "42rem",
          margin: embed ? 0 : "0 auto",
          width: "100%",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          minHeight: embed ? 320 : undefined,
        }}
      >
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            marginBottom: "1rem",
          }}
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
                padding: "0.75rem 1rem",
                borderRadius: "1rem",
                background: msg.role === "user" ? "#1a1a2e" : "white",
                color: msg.role === "user" ? "white" : "#1a1a2e",
                boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
              }}
            >
              <div style={{ whiteSpace: "pre-wrap" }}>{msg.text}</div>
            </div>
          ))}
          {loading && (
            <div
              style={{
                alignSelf: "flex-start",
                padding: "0.75rem 1rem",
                borderRadius: "1rem",
                background: "white",
                color: "#666",
                fontStyle: "italic",
              }}
            >
              ONDA está escribiendo...
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu pregunta..."
            disabled={loading}
            style={{
              flex: 1,
              padding: "0.75rem 1rem",
              borderRadius: "1.5rem",
              border: "1px solid #ddd",
              fontSize: "1rem",
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{
              padding: "0.75rem 1.25rem",
              borderRadius: "1.5rem",
              border: "none",
              background: "#1a1a2e",
              color: "white",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            Enviar
          </button>
        </form>
      </main>
    </div>
  );
}
