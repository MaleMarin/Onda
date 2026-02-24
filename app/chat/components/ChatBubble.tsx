"use client";

import type { Message } from "@/content/types";
import { ONDA_MICROCOPY } from "@/content/shared";

interface ChatBubbleProps {
  message: Message;
  color: string;
  compact?: boolean;
  onPlayTTS?: (text: string) => void;
}

function formatContent(text: string): React.ReactNode[] {
  return text.split(/(\*\*.*?\*\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

export function ChatBubble({ message, color, compact, onPlayTTS }: ChatBubbleProps) {
  const isUser = message.role === "user";
  const text =
    message.role === "model" && message.content === ""
      ? ONDA_MICROCOPY.typing
      : message.content;
  const padding = compact ? "10px 14px" : "12px 16px";
  const borderRadius = compact ? 12 : 14;
  const fontSize = compact ? "0.8125rem" : "0.875rem";

  const bubbleStyle: React.CSSProperties = isUser
    ? {
        background: "rgba(37, 99, 235, 0.2)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        color: "#1e40af",
        boxShadow: "0 1px 8px rgba(37, 99, 235, 0.15), 0 0 0 1px rgba(255,255,255,0.6)",
        border: "1px solid rgba(255,255,255,0.7)",
      }
    : {
        background: "rgba(255, 255, 255, 0.85)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        color: "#334155",
        boxShadow: "0 1px 8px rgba(0,0,0,0.04), 0 0 0 1px rgba(255,255,255,0.9)",
        border: "1px solid rgba(255,255,255,0.95)",
        borderLeftWidth: 4,
        borderLeftColor: color,
      };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
        marginBottom: 4,
      }}
    >
      {message.image && (
        <div
          style={{
            maxWidth: "80%",
            marginBottom: 4,
            borderRadius: 16,
            overflow: "hidden",
            border: "2px solid #eee",
          }}
        >
          <img
            src={message.image}
            alt="Enviado por usuario"
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        </div>
      )}
      {message.guideId && message.role === "model" && (
        <div
          style={{
            maxWidth: "85%",
            marginBottom: 6,
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid #e2e8f0",
          }}
        >
          <img
            src={`/guides/${message.guideId}.png`}
            alt={`Guía ${message.guideId}`}
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        </div>
      )}
      <div
        style={{
          maxWidth: "85%",
          padding,
          borderRadius,
          fontSize,
          lineHeight: 1.5,
          whiteSpace: "pre-wrap" as const,
          ...bubbleStyle,
        }}
      >
        <div className="prose-onda">{formatContent(text)}</div>
        {onPlayTTS && message.content && (
          <button
            type="button"
            onClick={() => onPlayTTS(message.content)}
            style={{
              marginTop: 8,
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid rgba(0,0,0,0.1)",
              background: "rgba(255,255,255,0.6)",
              fontSize: "0.75rem",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            🔊 Escuchar
          </button>
        )}
      </div>
      {message.timestamp != null && message.timestamp > 0 && (
        <span
          style={{
            fontSize: "10px",
            color: "#94a3b8",
            marginTop: 2,
            paddingLeft: 4,
          }}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      )}
    </div>
  );
}
