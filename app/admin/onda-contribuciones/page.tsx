"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CommunityContributionRecord } from "@/lib/communityContributionsFirestore";
import {
  CONTRIBUTION_TYPES,
  REVIEW_STATUSES,
  type ContributionEjeSlug,
  type ReviewStatus,
} from "@/lib/communityContributionTypes";

const BLUE = "#1428d4";
const DARK = "#0a0f8a";

const EJES: { id: ContributionEjeSlug | ""; label: string }[] = [
  { id: "", label: "Todos los ejes" },
  { id: "onda_a_mano", label: "A mano" },
  { id: "onda_civita", label: "Civita" },
  { id: "onda_profes", label: "Profes" },
];

export default function OndaContribucionesAdminPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [items, setItems] = useState<CommunityContributionRecord[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [eje, setEje] = useState<ContributionEjeSlug | "">("");
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus | "">("");
  const [contributionType, setContributionType] = useState<string>("");
  const [topic, setTopic] = useState("");
  const [urgency, setUrgency] = useState<"" | "low" | "medium" | "high">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (eje) p.set("eje", eje);
    if (reviewStatus) p.set("reviewStatus", reviewStatus);
    if (contributionType) p.set("contributionType", contributionType);
    if (topic.trim()) p.set("topic", topic.trim());
    if (urgency) p.set("urgency", urgency);
    if (from.trim()) p.set("from", from.trim());
    if (to.trim()) p.set("to", to.trim());
    p.set("limit", "200");
    return p.toString();
  }, [eje, reviewStatus, contributionType, topic, urgency, from, to]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setErr(null);
      const res = await fetch(`/api/admin/contribuciones?${qs}`, { credentials: "include" });
      if (cancelled) return;
      if (res.status === 401) {
        setUnauthorized(true);
        setAuthChecked(true);
        return;
      }
      setAuthChecked(true);
      setUnauthorized(false);
      if (!res.ok) {
        setErr("No se pudo cargar el listado.");
        return;
      }
      const data = (await res.json()) as { items: CommunityContributionRecord[] };
      setItems(data.items ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [qs]);

  if (!authChecked && !unauthorized) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui", color: DARK }}>
        <p>Cargando…</p>
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui" }}>
        <p>No autorizado.</p>
        <Link href="/admin/login" style={{ color: BLUE }}>
          Ir al login interno
        </Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6fb", fontFamily: "system-ui, sans-serif", padding: 16 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <header style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
          <h1 style={{ margin: 0, fontSize: "1.25rem", color: DARK }}>Contribuciones de comunidad</h1>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/admin/dashboard" style={{ color: BLUE, fontWeight: 600 }}>
              Dashboard
            </Link>
            <button
              type="button"
              onClick={() => {
                void fetch("/api/admin/login", { method: "DELETE", credentials: "include" }).then(() => {
                  window.location.href = "/admin/login";
                });
              }}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "none",
                background: DARK,
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Salir
            </button>
          </div>
        </header>

        <p style={{ fontSize: "0.875rem", color: "#444", maxWidth: 800, lineHeight: 1.5 }}>
          Aportes voluntarios para revisión humana. No se usan como verdad automática en producción. Estados{" "}
          <strong>verified</strong> e <strong>incorporated</strong> solo tras curaduría del equipo.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 10,
            marginTop: 16,
            marginBottom: 16,
            background: "#fff",
            padding: 14,
            borderRadius: 12,
            boxShadow: "0 2px 8px rgba(10,15,138,0.08)",
          }}
        >
          <label style={{ fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: 4 }}>
            Eje
            <select value={eje} onChange={(e) => setEje(e.target.value as ContributionEjeSlug | "")} style={{ padding: 8, borderRadius: 8, border: `1px solid ${BLUE}` }}>
              {EJES.map((o) => (
                <option key={o.id || "all"} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: 4 }}>
            Estado revisión
            <select
              value={reviewStatus}
              onChange={(e) => setReviewStatus(e.target.value as ReviewStatus | "")}
              style={{ padding: 8, borderRadius: 8, border: `1px solid ${BLUE}` }}
            >
              <option value="">Todos</option>
              {REVIEW_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: 4 }}>
            Tipo
            <select value={contributionType} onChange={(e) => setContributionType(e.target.value)} style={{ padding: 8, borderRadius: 8, border: `1px solid ${BLUE}` }}>
              <option value="">Todos</option>
              {CONTRIBUTION_TYPES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: 4 }}>
            Urgencia
            <select value={urgency} onChange={(e) => setUrgency(e.target.value as typeof urgency)} style={{ padding: 8, borderRadius: 8, border: `1px solid ${BLUE}` }}>
              <option value="">Todas</option>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </label>
          <label style={{ fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: 4 }}>
            Topic (contiene)
            <input value={topic} onChange={(e) => setTopic(e.target.value)} style={{ padding: 8, borderRadius: 8, border: `1px solid ${BLUE}` }} />
          </label>
          <label style={{ fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: 4 }}>
            Desde (ISO)
            <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="2026-01-01" style={{ padding: 8, borderRadius: 8, border: `1px solid ${BLUE}` }} />
          </label>
          <label style={{ fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: 4 }}>
            Hasta (ISO)
            <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="2026-12-31" style={{ padding: 8, borderRadius: 8, border: `1px solid ${BLUE}` }} />
          </label>
        </div>

        {err ? <p style={{ color: "#b00020" }}>{err}</p> : null}

        <div style={{ overflowX: "auto", background: "#fff", borderRadius: 12, padding: 12, boxShadow: "0 2px 8px rgba(10,15,138,0.08)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: `2px solid ${BLUE}` }}>
                <th style={{ padding: 8 }}>Fecha</th>
                <th style={{ padding: 8 }}>Canal</th>
                <th style={{ padding: 8 }}>Eje</th>
                <th style={{ padding: 8 }}>Tipo</th>
                <th style={{ padding: 8 }}>Estado</th>
                <th style={{ padding: 8 }}>Urg.</th>
                <th style={{ padding: 8 }}>Topic</th>
                <th style={{ padding: 8 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} style={{ borderBottom: "1px solid #eee", verticalAlign: "top" }}>
                  <td style={{ padding: 8, whiteSpace: "nowrap" }}>{row.createdAt ? row.createdAt.slice(0, 19).replace("T", " ") : "—"}</td>
                  <td style={{ padding: 8 }}>{row.channel}</td>
                  <td style={{ padding: 8 }}>{row.eje}</td>
                  <td style={{ padding: 8 }}>{row.contributionType}</td>
                  <td style={{ padding: 8 }}>{row.reviewStatus}</td>
                  <td style={{ padding: 8 }}>{row.urgency}</td>
                  <td style={{ padding: 8 }}>{row.topic ?? "—"}</td>
                  <td style={{ padding: 8 }}>
                    <Link href={`/admin/onda-contribuciones/${row.id}`} style={{ color: BLUE, fontWeight: 600 }}>
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 ? <p style={{ color: "#666", padding: 8 }}>Sin resultados o Firestore sin datos.</p> : null}
        </div>
      </div>
    </div>
  );
}
