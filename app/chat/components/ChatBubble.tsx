"use client";

import { useState, useEffect, useCallback } from "react";
import type { CSSProperties } from "react";
import type { Message } from "@/content/types";
import { ONDA_MICROCOPY } from "@/content/shared";
import type { OndaTheme } from "@/lib/ondaTheme";
import { ondaStyles } from "@/lib/ondaStyles";

/** Detecta si el texto contiene una tabla (markdown con | o líneas de celdas). */
function hasTable(text: string): boolean {
  if (!text || text.length < 10) return false;
  const lines = text.split(/\r?\n/);
  const tableLike = lines.filter((line) => /\|.+\|/.test(line.trim()));
  return tableLike.length >= 2;
}

/** Hora solo después de montar para evitar hydration mismatch (mismo placeholder en server y cliente). */
function MessageTime({ timestamp }: { timestamp: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  let text = "--:--";
  if (mounted && Number.isFinite(timestamp)) {
    try {
      const d = new Date(timestamp);
      const h = d.getHours().toString().padStart(2, "0");
      const m = d.getMinutes().toString().padStart(2, "0");
      text = `${h}:${m}`;
    } catch {
      // keep --:--
    }
  }
  return <span suppressHydrationWarning>{text}</span>;
}

interface ChatBubbleProps {
  message: Message;
  color: string;
  compact?: boolean;
  onPlayTTS?: (text: string) => void;
  theme: OndaTheme;
  /** En la primera vista, la burbuja de bienvenida crece para llenar el espacio (sin huecos). */
  fillHeight?: boolean;
}

function formatContent(text: string): React.ReactNode[] {
  return text.split(/(\*\*.*?\*\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

export function ChatBubble({ message, color, compact, onPlayTTS, theme: t, fillHeight }: ChatBubbleProps) {
  const S = ondaStyles(t);
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const isEmpty = message.role === "model" && message.content === "";
  const text = isEmpty ? ONDA_MICROCOPY.typing : message.content;
  const showCopyDownload = message.role === "model" && message.content && hasTable(message.content);

  const handleCopy = useCallback(async () => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }, [message.content]);

  const handleDownload = useCallback(() => {
    if (!message.content) return;
    const blob = new Blob([message.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tabla-onda.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [message.content]);

  const padding = compact ? "10px 14px" : "12px 16px";
  const fontSize = compact ? "0.8125rem" : "0.875rem";

  const wrapStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: isUser ? "flex-end" : "flex-start",
    marginBottom: 2,
    ...(fillHeight ? { flex: 1, minHeight: 0, width: "100%", maxWidth: "92%" } : {}),
  };

  const bubbleBase: CSSProperties = {
    maxWidth: "92%",
    padding,
    borderRadius: t.r.lg,
    lineHeight: 1.55,
    fontSize,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  };

  const botBubbleStyle: CSSProperties = {
    ...bubbleBase,
    ...(t.isDark ? t.fx.glassSoft : {
      ...t.fx.plate,
      boxShadow: `${t.shadow.glassInset}, 0 2px 4px rgba(0,0,0,0.04), 0 12px 28px rgba(0,0,0,0.06)`,
    }),
    color: t.c.ink,
    borderRadius: t.isDark ? undefined : "0 22px 22px 22px",
    borderTopLeftRadius: t.isDark ? 6 : 0,
    borderLeft: t.isDark ? (color ? `3px solid ${color}` : undefined) : (color ? `3px solid ${color}` : undefined),
    ...(isEmpty ? { fontStyle: "italic", color: t.c.muted, animation: "pulse 1.4s ease-in-out infinite" } : {}),
    ...(fillHeight ? { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "flex-start" } : {}),
  };

  const userBubbleStyle: CSSProperties = {
    ...bubbleBase,
    color: "#fff",
    border: "none",
    background: color
      ? `linear-gradient(135deg, ${color}, ${color}dd)`
      : t.grad.userBubble,
    boxShadow: color
      ? `0 8px 24px ${color}55, inset 0 1px 0 rgba(255,255,255,0.25)`
      : "0 8px 24px rgba(255,109,77,0.2), inset 0 1px 0 rgba(255,255,255,0.25)",
    borderTopRightRadius: 22,
  };

  const imgWrapStyle: CSSProperties = {
    maxWidth: "85%",
    marginBottom: 6,
    borderRadius: t.r.md,
    overflow: "hidden",
    border: `1px solid ${t.c.border}`,
    boxShadow: t.shadow.s3,
  };

  const ttsStyle: CSSProperties = {
    marginTop: 8,
    padding: "5px 12px",
    borderRadius: t.r.sm,
    border: `1px solid ${t.c.border}`,
    background: t.isDark ? "rgba(255,255,255,.08)" : t.glass.bg,
    fontSize: "0.72rem",
    color: t.c.muted,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
  };

  const metaStyle: CSSProperties = {
    fontSize: 10,
    color: t.c.muted2,
    marginTop: 3,
    paddingLeft: 4,
    paddingRight: 4,
  };

  const copyDownloadWrap: CSSProperties = {
    marginTop: 10,
    paddingTop: 10,
    borderTop: `1px solid ${t.c.border}`,
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  };
  const copyDownloadHint: CSSProperties = {
    fontSize: "0.75rem",
    color: t.c.muted,
    marginRight: 4,
  };
  const copyDownloadBtn: CSSProperties = {
    padding: "6px 10px",
    borderRadius: t.r.sm,
    border: `1px solid ${t.c.border}`,
    background: t.isDark ? "rgba(255,255,255,.08)" : t.glass.bg,
    color: t.c.ink,
    fontSize: "0.75rem",
    fontWeight: 600,
    cursor: "pointer",
  };

  return (
    <div style={wrapStyle}>
      {message.image && (
        <div style={imgWrapStyle}>
          <img src={message.image} alt="Enviado por usuario" style={{ width: "100%", height: "auto", display: "block" }} />
        </div>
      )}
      {message.guideId && message.role === "model" && (
        <div style={imgWrapStyle}>
          <img src={`/guides/${message.guideId}.png`} alt={`Guía ${message.guideId}`} style={{ width: "100%", height: "auto", display: "block" }} />
        </div>
      )}
      <div style={isUser ? userBubbleStyle : botBubbleStyle}>
        <div className="prose-onda">{formatContent(text)}</div>
        {onPlayTTS && message.content && (
          <button type="button" onClick={() => onPlayTTS(message.content)} style={ttsStyle}>
            🔊 Escuchar
          </button>
        )}
        {showCopyDownload && (
          <div style={copyDownloadWrap}>
            <span style={copyDownloadHint}>Puedes copiar o descargar la tabla:</span>
            <button type="button" onClick={handleCopy} style={copyDownloadBtn}>
              {copied ? "✓ Copiado" : "Copiar"}
            </button>
            <button type="button" onClick={handleDownload} style={copyDownloadBtn}>
              Descargar
            </button>
          </div>
        )}
      </div>
      {message.timestamp != null && message.timestamp > 0 && (
        <span style={metaStyle} suppressHydrationWarning>
          <MessageTime timestamp={message.timestamp} />
        </span>
      )}
    </div>
  );
}
