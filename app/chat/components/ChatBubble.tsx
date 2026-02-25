"use client";

import type { CSSProperties } from "react";
import type { Message } from "@/content/types";
import { ONDA_MICROCOPY } from "@/content/shared";
import type { OndaTheme } from "@/lib/ondaTheme";
import { ondaStyles } from "@/lib/ondaStyles";

interface ChatBubbleProps {
  message: Message;
  color: string;
  compact?: boolean;
  onPlayTTS?: (text: string) => void;
  theme: OndaTheme;
}

function formatContent(text: string): React.ReactNode[] {
  return text.split(/(\*\*.*?\*\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

export function ChatBubble({ message, color, compact, onPlayTTS, theme: t }: ChatBubbleProps) {
  const S = ondaStyles(t);
  const isUser = message.role === "user";
  const isEmpty = message.role === "model" && message.content === "";
  const text = isEmpty ? ONDA_MICROCOPY.typing : message.content;

  const padding = compact ? "10px 14px" : "12px 16px";
  const fontSize = compact ? "0.8125rem" : "0.875rem";

  const wrapStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: isUser ? "flex-end" : "flex-start",
    marginBottom: 2,
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
    background: t.c.surface2,
    color: t.c.ink,
    border: `1px solid ${t.c.border}`,
    boxShadow: t.shadow.s3,
    borderTopLeftRadius: 6,
    borderLeft: color ? `3px solid ${color}` : undefined,
    ...(isEmpty ? { fontStyle: "italic", color: t.c.muted, animation: "pulse 1.4s ease-in-out infinite" } : {}),
  };

  const userBubbleStyle: CSSProperties = {
    ...bubbleBase,
    color: "#fff",
    border: "none",
    background: t.grad.userBubble,
    boxShadow: `0 8px 22px rgba(43,99,255,.20)`,
    borderTopRightRadius: 6,
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
    background: t.isDark ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.50)",
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
          <button type="button" onClick={() => onPlayTTS(message.content)} style={ttsStyle} {...S.lift.tts}>
            🔊 Escuchar
          </button>
        )}
      </div>
      {message.timestamp != null && message.timestamp > 0 && (
        <span style={metaStyle}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      )}
    </div>
  );
}
