"use client";

import { useState, useEffect, useCallback } from "react";
import type { CSSProperties } from "react";
import type { Message } from "@/content/types";
import { ContributionPrompt } from "@/components/onda/contributions/ContributionPrompt";
import type { ContributionEjeSlug } from "@/lib/onda/contributions/types";
import { MENU_QUESTIONS } from "@/content/menuQuestions";
import type { OndaChatLocale } from "@/lib/userPreferences";
import { getChatMicrocopy } from "@/lib/chatI18n";
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
  /** Llamado para parar el audio (cuando isTTSPlaying es true). */
  onStopTTS?: () => void;
  /** true mientras se genera o reproduce el audio (evita doble clic y segunda voz). */
  isTTSPlaying?: boolean;
  theme: OndaTheme;
  /** Idioma de microcopy (compartir, menú intro, etc.). */
  uiLocale?: OndaChatLocale;
  /** En la primera vista, la burbuja de bienvenida crece para llenar el espacio (sin huecos). */
  fillHeight?: boolean;
  /** Cuando el mensaje es intro de menú (3 preguntas), clic en un botón: envía ese texto o abre el input (frase libre). */
  onMenuIntroChipClick?: (text: string) => void;
  /** Llamado al votar 👍/👎 en respuestas generadas (solo si está definido). */
  onFeedback?: (messageId: string, vote: "up" | "down") => void;
  /** true = saludo o error: oculta Escuchar, Compartir, Copiar/Descargar y Feedback. Elimina ruido visual de raíz. */
  hideActions?: boolean;
  /** No cargar PNG de guía; solo enlace liviano (modo bajo consumo). */
  lowBandwidth?: boolean;
  /** Sesión anónima para POST de contribución (burbuja de escucha). */
  contributionConversationId?: string;
  contributionEjeSlug?: ContributionEjeSlug;
  onRemoveContributionInviteBubble?: (id: string) => void;
}

const LINK_REGEX = /\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;

/** Indica si el texto tiene enlaces en formato markdown [texto](url). */
function hasMarkdownLinks(text: string): boolean {
  LINK_REGEX.lastIndex = 0;
  return LINK_REGEX.test(text);
}

/** Mensajes sin evidencias útiles: no mostrar botón Compartir (no aporta valor). */
function isNoUsefulEvidenceMessage(content: string): boolean {
  const t = (content || "").trim();
  if (!t) return true;
  return (
    /no tengo información en tiempo real/i.test(t) ||
    /no he hallado evidencias verificables en mis registros oficiales/i.test(t) ||
    /no tengo acceso (a|en) tiempo real/i.test(t)
  );
}

/** Parsea el contenido de intro de menú (formato "1. Pregunta\n\n2. Pregunta\n\n3. Pregunta") para extraer las 3 preguntas como botones. Acepta \n, \r\n y bloques por número. */
function parseMenuIntroQuestions(content: string): [string, string, string] | null {
  if (!content?.trim()) return null;
  const normalized = content.replace(/\r\n/g, "\n").trim();
  const stripNum = (s: string) => s.replace(/^\d+\.\s*/, "").trim();
  let blocks = normalized.split(/\n\s*\n+/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length < 3) {
    const byNumber = normalized.match(/\d+\.\s*[^\n]+(?=\n|$)/g);
    if (byNumber && byNumber.length >= 3) blocks = byNumber.slice(0, 3).map((b) => b.trim());
  }
  if (blocks.length < 3) return null;
  const q1 = stripNum(blocks[0]);
  const q2 = stripNum(blocks[1]);
  const q3 = stripNum(blocks[2]);
  if (!q1 || !q2 || !q3) return null;
  return [q1, q2, q3];
}

function formatBold(segment: string, keyBase: number): React.ReactNode[] {
  return segment.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`b-${keyBase}-${i}`}>{part.slice(2, -2)}</strong>;
    }
    return <span key={`b-${keyBase}-${i}`}>{part}</span>;
  });
}

function formatContent(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let lastEnd = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  LINK_REGEX.lastIndex = 0;
  while ((m = LINK_REGEX.exec(text)) !== null) {
    const before = text.slice(lastEnd, m.index);
    out.push(...formatBold(before, key));
    key += 1000;
    out.push(
      <a
        key={`link-${key}`}
        href={m[2]}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "inherit", textDecoration: "underline", fontWeight: 600 }}
      >
        {m[1] || m[2]}
      </a>
    );
    key += 1;
    lastEnd = m.index + m[0].length;
  }
  out.push(...formatBold(text.slice(lastEnd), key));
  return out;
}

export function ChatBubble({
  message,
  color,
  compact,
  onPlayTTS,
  onStopTTS,
  isTTSPlaying,
  theme: t,
  uiLocale = "es-LATAM",
  fillHeight,
  onMenuIntroChipClick,
  onFeedback,
  hideActions,
  lowBandwidth,
  contributionConversationId,
  contributionEjeSlug,
  onRemoveContributionInviteBubble,
}: ChatBubbleProps) {
  const S = ondaStyles(t);
  const mc = getChatMicrocopy(uiLocale);
  const [copied, setCopied] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState<"up" | "down" | null>(null);
  const isUser = message.role === "user";
  const isEmpty = message.role === "model" && message.content === "";
  const rawContent = message.content ?? "";
  const text = isEmpty
    ? mc.typing
    : hideActions && rawContent.includes(mc.menuIntroFreeText)
      ? rawContent.replace(mc.menuIntroFreeText, "").replace(/\n{3,}/g, "\n\n").trim()
      : rawContent;
  const showCopyDownload = message.role === "model" && message.content && hasTable(message.content);
  const showFuenteVerificada = message.role === "model" && message.content && hasMarkdownLinks(message.content);
  /** Escuchar, Compartir, Copiar/Descargar y Feedback: solo en respuestas generadas y cuando hideActions es false (saludo/error = sin acciones). */
  const showActionButtons = !hideActions && message.role === "model" && message.content && !isEmpty && message.isGenerated === true && !message.isMenuIntro;
  const showEscuchar = showActionButtons && !!onPlayTTS;
  const showCompartir = message.role === "model" && message.isGenerated === true && message.content !== "";

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
  const fontSize = compact ? "1rem" : "1.125rem";

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
    lineHeight: 1.6,
    fontSize,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  };

  const botBubbleStyle: CSSProperties = {
    ...bubbleBase,
    background: t.glass.bg,
    border: `2px solid ${t.glass.border}`,
    boxShadow: t.shadow.neuRaisedExtra,
    color: t.c.ink,
    borderRadius: t.isDark ? 6 : "0 22px 22px 22px",
    borderTopLeftRadius: t.isDark ? 6 : 0,
    borderLeft: color ? `4px solid ${color}` : undefined,
    ...(isEmpty ? { fontStyle: "italic", color: t.c.ink, opacity: 0.9, animation: "pulse 1.4s ease-in-out infinite" } : {}),
    ...(fillHeight ? { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "flex-start" } : {}),
    transition: "box-shadow 0.18s ease, background 0.18s ease",
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
    ...(isUser && message.interpretedAsCommunityContribution
      ? { borderLeft: "3px solid rgba(255,255,255,0.65)", paddingLeft: 13 }
      : {}),
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
    fontSize: "0.9375rem",
    color: t.c.muted,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
  };

  const metaStyle: CSSProperties = {
    fontSize: "0.875rem",
    color: t.c.darkGray,
    marginTop: 3,
    paddingLeft: 4,
    paddingRight: 4,
    fontWeight: 500,
  };

  // soft_nudge / puente "estamos escuchando" eliminado: no renderizar esa burbuja.
  if (
    message.isContributionInviteBubble &&
    message.listeningInvite?.show &&
    message.listeningInvite.inviteVariant !== "soft_nudge" &&
    onRemoveContributionInviteBubble &&
    contributionConversationId &&
    contributionEjeSlug
  ) {
    return (
      <div style={wrapStyle}>
        <ContributionPrompt
          invite={message.listeningInvite}
          theme={t}
          ejeSlug={contributionEjeSlug}
          conversationId={contributionConversationId}
          messageId={message.id}
          onRemove={onRemoveContributionInviteBubble}
        />
        {message.timestamp != null && message.timestamp > 0 && (
          <span style={metaStyle} suppressHydrationWarning>
            <MessageTime timestamp={message.timestamp} />
          </span>
        )}
      </div>
    );
  }
  if (message.isContributionInviteBubble) {
    return null;
  }

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
    fontSize: "0.9375rem",
    color: t.c.muted,
    marginRight: 4,
  };
  const copyDownloadBtn: CSSProperties = {
    padding: "6px 10px",
    borderRadius: t.r.sm,
    border: `1px solid ${t.c.border}`,
    background: t.isDark ? "rgba(255,255,255,.08)" : t.glass.bg,
    color: t.c.ink,
    fontSize: "0.9375rem",
    fontWeight: 600,
    cursor: "pointer",
  };

  const menuIntroQuestions =
    message.role === "model" && onMenuIntroChipClick && message.isMenuIntro
      ? (message.menuOptionId && MENU_QUESTIONS[message.menuOptionId]) ?? parseMenuIntroQuestions(message.content ?? "")
      : null;
  const showAsMenuIntroButtons = !!menuIntroQuestions;

  return (
    <div style={wrapStyle}>
      {message.image && (
        <div style={imgWrapStyle}>
          <img src={message.image} alt="Enviado por usuario" style={{ width: "100%", height: "auto", display: "block" }} />
        </div>
      )}
      {message.guideId && message.role === "model" && (
        lowBandwidth ? (
          <p style={{ margin: "0 0 8px", fontSize: "0.9375rem" }}>
            <a
              href={`/guides/${message.guideId}.png`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "inherit", fontWeight: 600, textDecoration: "underline" }}
            >
              Abrir guía ({message.guideId})
            </a>
          </p>
        ) : (
          <div style={imgWrapStyle}>
            <img src={`/guides/${message.guideId}.png`} alt={`Guía ilustrada: ${message.guideId}`} style={{ width: "100%", height: "auto", display: "block" }} loading="lazy" />
          </div>
        )
      )}
      <div
        style={isUser ? userBubbleStyle : botBubbleStyle}
        title={
          isUser && message.interpretedAsCommunityContribution
            ? "Tu mensaje se guardó como aporte opcional para revisión humana del equipo de Precisar."
            : undefined
        }
      >
        {showAsMenuIntroButtons && menuIntroQuestions ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 2 }}>
            {[...menuIntroQuestions, mc.menuIntroFreeText].map((label) => (
              <button
                key={label}
                type="button"
                role="button"
                aria-label={label}
                onClick={() => onMenuIntroChipClick!(label)}
                style={{
                  ...S.pildoraIntuicion,
                  width: "100%",
                  justifyContent: "flex-start",
                  textAlign: "left",
                  background: t.isDark ? "rgba(255,255,255,0.12)" : "#fff",
                  border: `2px solid ${t.glass.border}`,
                  boxShadow: t.shadow.neuRaised,
                }}
                {...S.lift.pildora}
              >
                {label}
              </button>
            ))}
          </div>
        ) : (
          <div className="prose-onda">{formatContent(text)}</div>
        )}
        {message.isGenerated && !message.isMenuIntro && !hideActions && (
          <>
            {onPlayTTS && message.content && (
              <button
                type="button"
                onClick={() => (isTTSPlaying && onStopTTS ? onStopTTS() : onPlayTTS!(message.content))}
                style={{ ...ttsStyle, opacity: isTTSPlaying ? 0.9 : 1, cursor: "pointer" }}
              >
                {isTTSPlaying ? mc.stopAudio : mc.listenAudio}
              </button>
            )}
            {showCompartir && (
              <button type="button" onClick={handleCopy} style={{ ...ttsStyle, marginTop: 6 }}>
                {copied ? mc.compartirCopiado : mc.compartir}
              </button>
            )}
          </>
        )}
        {showFuenteVerificada && !showAsMenuIntroButtons && (
          <span style={{ marginTop: 6, fontSize: "0.8125rem", color: t.c.muted, display: "inline-block" }}>
            ✓ {mc.fuenteVerificada}
          </span>
        )}
        {message.ragUsed === false &&
          (message.conversationIntent === "fact_check" ||
            message.conversationIntent === "disinformation") &&
          message.isGenerated &&
          !showAsMenuIntroButtons &&
          !hideActions && (
            <div
              role="note"
              aria-label="Aviso de fuentes"
              style={{
                fontSize: "0.75rem",
                color: t.c.muted,
                marginTop: 8,
                fontStyle: "italic",
                paddingTop: 8,
                borderTop: `1px solid ${t.c.border}`,
              }}
            >
              Esta respuesta se basa en conocimiento general. Para información verificada de Precisar,
              visita{" "}
              <a
                href="https://precisar.net"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "inherit", textDecoration: "underline" }}
              >
                precisar.net
              </a>
            </div>
          )}
        {showCopyDownload && showActionButtons && (
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
        {onFeedback && message.role === "model" && message.isGenerated && message.content?.trim() && !showAsMenuIntroButtons && !isEmpty && (
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${t.c.border}`, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "0.875rem", color: t.c.muted }}>¿Te sirvió?</span>
            <button
              type="button"
              aria-label="Sí, me sirvió"
              disabled={feedbackSent !== null}
              onClick={() => { setFeedbackSent("up"); onFeedback(message.id, "up"); }}
              style={{
                ...copyDownloadBtn,
                padding: "4px 10px",
                opacity: feedbackSent === "up" ? 1 : feedbackSent === "down" ? 0.5 : 1,
              }}
            >
              👍
            </button>
            <button
              type="button"
              aria-label="No me sirvió"
              disabled={feedbackSent !== null}
              onClick={() => { setFeedbackSent("down"); onFeedback(message.id, "down"); }}
              style={{
                ...copyDownloadBtn,
                padding: "4px 10px",
                opacity: feedbackSent === "down" ? 1 : feedbackSent === "up" ? 0.5 : 1,
              }}
            >
              👎
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
