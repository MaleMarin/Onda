"use client";

import type { OndaContributionRecord } from "@/lib/onda/contributions/types";

const DARK = "#0a0f8a";

type Props = { row: OndaContributionRecord };

export function ContributionDetail({ row }: Props) {
  return (
    <>
      <section style={{ background: "#fff", borderRadius: 12, padding: 16, marginTop: 12, boxShadow: "0 2px 8px rgba(10,15,138,0.08)" }}>
        <h2 style={{ fontSize: "1rem", marginTop: 0, color: DARK }}>Contexto</h2>
        <dl style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 8, fontSize: "0.875rem" }}>
          <dt style={{ color: "#555" }}>Creado</dt>
          <dd style={{ margin: 0 }}>{row.createdAt}</dd>
          <dt style={{ color: "#555" }}>Canal</dt>
          <dd style={{ margin: 0 }}>{row.channel}</dd>
          <dt style={{ color: "#555" }}>Eje</dt>
          <dd style={{ margin: 0 }}>{row.eje}</dd>
          <dt style={{ color: "#555" }}>Locale</dt>
          <dd style={{ margin: 0 }}>{row.locale ?? "—"}</dd>
          <dt style={{ color: "#555" }}>Conversación</dt>
          <dd style={{ margin: 0, wordBreak: "break-all" }}>{row.conversationId ?? "—"}</dd>
          <dt style={{ color: "#555" }}>Message id</dt>
          <dd style={{ margin: 0, wordBreak: "break-all" }}>{row.messageId ?? "—"}</dd>
          <dt style={{ color: "#555" }}>Turn token</dt>
          <dd style={{ margin: 0, wordBreak: "break-all" }}>{row.turnToken ?? "—"}</dd>
          <dt style={{ color: "#555" }}>Contacto OK</dt>
          <dd style={{ margin: 0 }}>{row.optionalContactAllowed ? "sí" : "no"}</dd>
          <dt style={{ color: "#555" }}>Revisado por</dt>
          <dd style={{ margin: 0 }}>{row.reviewedBy ?? "—"}</dd>
          <dt style={{ color: "#555" }}>Revisado en</dt>
          <dd style={{ margin: 0 }}>{row.reviewedAt ?? "—"}</dd>
        </dl>
      </section>

      <section style={{ background: "#fff", borderRadius: 12, padding: 16, marginTop: 12 }}>
        <h2 style={{ fontSize: "1rem", marginTop: 0, color: DARK }}>Pregunta original (eco del turno)</h2>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.875rem", background: "#f8f9fc", padding: 12, borderRadius: 8 }}>{row.userQuestion}</pre>
        {row.assistantResponseSummary ? (
          <>
            <h2 style={{ fontSize: "1rem", color: DARK }}>Resumen respuesta Onda</h2>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.875rem", background: "#f8f9fc", padding: 12, borderRadius: 8 }}>{row.assistantResponseSummary}</pre>
          </>
        ) : null}
        <h2 style={{ fontSize: "1rem", color: DARK }}>Aporte</h2>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.875rem", background: "#f8f9fc", padding: 12, borderRadius: 8 }}>{row.contributionText}</pre>
      </section>
    </>
  );
}
