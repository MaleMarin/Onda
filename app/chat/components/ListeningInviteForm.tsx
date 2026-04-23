"use client";

import { useState } from "react";
import {
  CONTRIBUTION_TYPES,
  type ContributionEjeSlug,
  type ContributionType,
  type ListeningInviteStreamPayload,
} from "@/lib/communityContributionTypes";
import type { OndaTheme } from "@/lib/ondaTheme";

type Props = {
  invite: ListeningInviteStreamPayload;
  sessionId: string;
  ejeSlug: ContributionEjeSlug;
  theme: OndaTheme;
};

export function ListeningInviteForm({ invite, sessionId, ejeSlug, theme }: Props) {
  const t = theme;
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [type, setType] = useState<ContributionType>("experiencia");
  const [contactOk, setContactOk] = useState(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const trimmed = text.trim();
    if (trimmed.length < 3) {
      setMsg("Escribe al menos una línea.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/community-contribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "web",
          eje: ejeSlug,
          conversationId: sessionId,
          turnToken: invite.turnToken,
          userMessage: invite.userEcho,
          assistantResponseSummary: invite.assistantSummary,
          contributionText: trimmed,
          contributionType: type,
          topic: invite.topicHint,
          tags: [invite.topicHint],
          optionalContactAllowed: contactOk,
          locale: invite.locale,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(typeof data?.error === "string" ? data.error : "No se pudo enviar. Intenta más tarde.");
        setSending(false);
        return;
      }
      setMsg("Gracias. Tu aporte quedó registrado para revisión del equipo (no se publica automáticamente).");
      setText("");
      setOpen(false);
    } catch {
      setMsg("Error de red. Intenta de nuevo.");
    }
    setSending(false);
  }

  const wrap: React.CSSProperties = {
    marginTop: 12,
    paddingTop: 10,
    borderTop: `1px solid ${t.c.border}`,
  };
  const hint: React.CSSProperties = {
    fontSize: "0.875rem",
    color: t.c.muted,
    lineHeight: 1.45,
    marginBottom: 8,
  };
  const btn: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: t.r.sm,
    border: `1px solid ${t.c.border}`,
    background: t.isDark ? "rgba(255,255,255,0.08)" : t.glass.bg,
    color: t.c.ink,
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: "pointer",
  };

  return (
    <div style={wrap}>
      <p style={hint}>{invite.prompt}</p>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} style={btn}>
          Compartir un aporte (opcional)
        </button>
      ) : (
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ fontSize: "0.8125rem", color: t.c.muted }}>
            Tipo de aporte
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ContributionType)}
              style={{
                display: "block",
                width: "100%",
                marginTop: 4,
                padding: 8,
                borderRadius: t.r.sm,
                border: `1px solid ${t.c.border}`,
                background: t.isDark ? "rgba(0,0,0,0.2)" : "#fff",
                color: t.c.ink,
              }}
            >
              {CONTRIBUTION_TYPES.map((opt) => (
                <option key={opt} value={opt}>
                  {opt.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={4000}
            placeholder="Una o varias líneas…"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: 10,
              borderRadius: t.r.sm,
              border: `1px solid ${t.c.border}`,
              fontFamily: "inherit",
              fontSize: "0.9375rem",
              background: t.isDark ? "rgba(0,0,0,0.2)" : "#fff",
              color: t.c.ink,
              resize: "vertical",
            }}
          />
          <label style={{ fontSize: "0.8125rem", color: t.c.muted, display: "flex", gap: 8, alignItems: "flex-start" }}>
            <input
              type="checkbox"
              checked={contactOk}
              onChange={(e) => setContactOk(e.target.checked)}
              style={{ marginTop: 3 }}
            />
            <span>Si en el futuro Precisar habilita contacto para aclarar este caso, puede escribirme (opcional).</span>
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button type="submit" disabled={sending} style={{ ...btn, background: t.c.brand, color: "#fff", border: "none" }}>
              {sending ? "Enviando…" : "Enviar aporte"}
            </button>
            <button type="button" disabled={sending} onClick={() => setOpen(false)} style={btn}>
              Cerrar
            </button>
          </div>
        </form>
      )}
      {msg ? (
        <p style={{ ...hint, marginTop: 8, color: msg.startsWith("Gracias") ? t.c.ink : "#b00020" }}>{msg}</p>
      ) : null}
    </div>
  );
}
