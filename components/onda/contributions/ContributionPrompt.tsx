"use client";

import { useCallback, useRef, useState, type CSSProperties, type TransitionEvent } from "react";
import type { ListeningInviteStreamPayload } from "@/lib/onda/contributions/types";
import type { ContributionEjeSlug } from "@/lib/onda/contributions/types";
import type { OndaTheme } from "@/lib/ondaTheme";

export type ContributionPromptProps = {
  invite: ListeningInviteStreamPayload;
  theme: OndaTheme;
  ejeSlug: ContributionEjeSlug;
  conversationId: string;
  messageId: string;
  onRemove: (id: string) => void;
};

const GREEN = "#22c55e";
const GREEN_BG = "rgba(34, 197, 94, 0.06)";

/**
 * Segundo momento conversacional: burbuja propia (no es continuación del markdown de la respuesta).
 * Variante `soft_nudge`: una línea si la persona no compartió experiencia; sin formulario.
 */
export function ContributionPrompt({
  invite,
  theme: t,
  ejeSlug,
  conversationId,
  messageId,
  onRemove,
}: ContributionPromptProps) {
  const isPt = String(invite.locale || "").toLowerCase().startsWith("pt");
  const isSoft = invite.inviteVariant === "soft_nudge";
  const [phase, setPhase] = useState<"idle" | "writing" | "sending" | "sent">("idle");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [opacity, setOpacity] = useState(1);
  const dismissingRef = useRef(false);

  const btnPrimary: CSSProperties = {
    padding: "10px 16px",
    borderRadius: 12,
    border: "none",
    fontWeight: 600,
    fontSize: "0.9375rem",
    cursor: "pointer",
    background: GREEN,
    color: "#fff",
    fontFamily: "inherit",
  };
  const btnGhost: CSSProperties = {
    ...btnPrimary,
    background: t.isDark ? "rgba(255,255,255,0.12)" : "#fff",
    color: t.c.ink,
    border: `2px solid ${t.c.border}`,
  };

  const startDismiss = useCallback(() => {
    dismissingRef.current = true;
    setOpacity(0);
  }, []);

  const handleTransitionEnd = useCallback(
    (e: TransitionEvent<HTMLDivElement>) => {
      if (e.propertyName !== "opacity" || !dismissingRef.current) return;
      dismissingRef.current = false;
      onRemove(messageId);
    },
    [messageId, onRemove]
  );

  const submit = useCallback(async () => {
    const text = draft.trim();
    if (text.length < 3) {
      setError(isPt ? "Escreve pelo menos algumas palavras." : "Escribe al menos unas palabras.");
      return;
    }
    setError(null);
    setPhase("sending");
    try {
      const res = await fetch("/api/onda-contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "web",
          eje: ejeSlug,
          conversationId: conversationId || undefined,
          messageId,
          turnToken: invite.turnToken,
          userQuestion: invite.userEcho,
          assistantResponseSummary: invite.assistantSummary,
          contributionText: text.slice(0, 500),
          contributionType: invite.suggestedContributionType ?? "experiencia",
          topic: invite.topicHint,
          tags: invite.topicHint ? [invite.topicHint] : undefined,
          locale: invite.locale,
        }),
      });
      if (res.status === 201) {
        setPhase("sent");
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data?.error || (isPt ? "Não foi possível enviar." : "No se pudo enviar."));
      setPhase("writing");
    } catch {
      setError(isPt ? "Erro de rede." : "Error de red.");
      setPhase("writing");
    }
  }, [draft, conversationId, ejeSlug, invite, isPt, messageId]);

  if (isSoft) {
    return (
      <div
        role="note"
        aria-label={isPt ? "Lembrete de escuta comunitária" : "Recordatorio de escucha comunitaria"}
        onTransitionEnd={handleTransitionEnd}
        style={{
          width: "100%",
          maxWidth: "92%",
          opacity,
          transition: "opacity 0.45s ease",
          borderRadius: t.isDark ? 8 : "0 22px 22px 22px",
          border: `1px solid ${t.glass.border}`,
          borderLeft: `4px solid ${GREEN}`,
          background: t.isDark ? "rgba(34,197,94,0.08)" : GREEN_BG,
          boxShadow: t.shadow.neuRaised,
          padding: "12px 14px",
          color: t.c.ink,
        }}
      >
        <p style={{ margin: 0, fontSize: "0.9375rem", lineHeight: 1.45, fontWeight: 500 }}>{invite.prompt}</p>
        <button
          type="button"
          onClick={startDismiss}
          style={{
            marginTop: 10,
            padding: 0,
            border: "none",
            background: "none",
            color: t.c.muted,
            fontSize: "0.8125rem",
            fontWeight: 600,
            cursor: "pointer",
            textDecoration: "underline",
            fontFamily: "inherit",
          }}
        >
          {isPt ? "Fechar" : "Cerrar"}
        </button>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label={isPt ? "Convite para contribuição comunitária" : "Invitación a escucha comunitaria"}
      onTransitionEnd={handleTransitionEnd}
      style={{
        width: "100%",
        maxWidth: "92%",
        opacity,
        transition: "opacity 0.45s ease",
        borderRadius: t.isDark ? 8 : "0 22px 22px 22px",
        border: `2px solid ${t.glass.border}`,
        borderLeft: `5px solid ${GREEN}`,
        background: t.isDark ? "rgba(34,197,94,0.08)" : GREEN_BG,
        boxShadow: t.shadow.neuRaised,
        padding: "14px 16px",
        color: t.c.ink,
      }}
    >
      <p style={{ margin: "0 0 12px", fontSize: "1rem", lineHeight: 1.5, fontWeight: 600 }}>{invite.prompt}</p>

      {phase === "idle" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <button type="button" style={btnPrimary} onClick={() => setPhase("writing")}>
            {isPt ? "Escrever algo" : "Escribir algo"}
          </button>
          <button type="button" style={btnGhost} onClick={startDismiss}>
            {isPt ? "Agora não" : "Ahora no"}
          </button>
        </div>
      )}

      {(phase === "writing" || phase === "sending") && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 500))}
            disabled={phase === "sending"}
            rows={4}
            placeholder={
              isPt
                ? "Escreve o que sabes ou o que vives de onde estás..."
                : "Escribe lo que sabes o lo que vives desde donde estás..."
            }
            style={{
              width: "100%",
              boxSizing: "border-box",
              borderRadius: 12,
              border: `1px solid ${t.c.border}`,
              padding: "10px 12px",
              fontSize: "0.9375rem",
              fontFamily: "inherit",
              resize: "vertical",
              minHeight: 96,
              background: t.isDark ? "rgba(255,255,255,0.06)" : "#fff",
              color: t.c.ink,
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: "0.8125rem", color: t.c.muted }}>
              {draft.length}/500
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" style={btnGhost} disabled={phase === "sending"} onClick={() => { setDraft(""); setPhase("idle"); }}>
                {isPt ? "Voltar" : "Volver"}
              </button>
              <button type="button" style={btnPrimary} disabled={phase === "sending"} onClick={() => void submit()}>
                {phase === "sending" ? (isPt ? "Enviando…" : "Enviando…") : isPt ? "Enviar" : "Enviar"}
              </button>
            </div>
          </div>
          {error ? <p style={{ margin: 0, fontSize: "0.875rem", color: t.c.danger }}>{error}</p> : null}
        </div>
      )}

      {phase === "sent" && (
        <p style={{ margin: 0, fontSize: "0.9375rem", lineHeight: 1.45, color: t.c.ink }}>
          {isPt
            ? "Obrigado. Uma pessoa da equipe da Precisar vai ler."
            : "Gracias. Lo va a leer una persona del equipo de Precisar."}
        </p>
      )}
    </div>
  );
}
