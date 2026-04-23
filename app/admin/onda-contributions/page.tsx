"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { OndaContributionRecord } from "@/lib/onda/contributions/types";
import type {
  ContributionEjeSlug,
  ReviewStatus,
  ContributionUrgency,
  ContributionChannel,
} from "@/lib/onda/contributions/types";
import { ContributionFilters } from "@/components/admin/onda-contributions/ContributionFilters";
import { ContributionsTable } from "@/components/admin/onda-contributions/ContributionsTable";

const BLUE = "#1428d4";
const DARK = "#0a0f8a";

export default function OndaContributionsAdminPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [items, setItems] = useState<OndaContributionRecord[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [eje, setEje] = useState<ContributionEjeSlug | "">("");
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus | "">("");
  const [contributionType, setContributionType] = useState<string>("");
  const [topic, setTopic] = useState("");
  const [urgency, setUrgency] = useState<"" | ContributionUrgency>("");
  const [channel, setChannel] = useState<"" | ContributionChannel>("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (eje) p.set("eje", eje);
    if (reviewStatus) p.set("reviewStatus", reviewStatus);
    if (contributionType) p.set("contributionType", contributionType);
    if (topic.trim()) p.set("topic", topic.trim());
    if (urgency) p.set("urgency", urgency);
    if (channel) p.set("channel", channel);
    if (from.trim()) p.set("from", from.trim());
    if (to.trim()) p.set("to", to.trim());
    p.set("limit", "200");
    return p.toString();
  }, [eje, reviewStatus, contributionType, topic, urgency, channel, from, to]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setErr(null);
      const res = await fetch(`/api/admin/onda-contributions?${qs}`, { credentials: "include" });
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
      const data = (await res.json()) as { items: OndaContributionRecord[] };
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
          <h1 style={{ margin: 0, fontSize: "1.25rem", color: DARK }}>Contribuciones Onda</h1>
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
          Aportes voluntarios para revisión humana. Colección Firestore <code>onda_contributions</code>. No se usan como verdad automática en producción. Estados{" "}
          <strong>verified</strong> e <strong>incorporated</strong> solo tras curaduría del equipo.
        </p>

        <ContributionFilters
          eje={eje}
          setEje={setEje}
          reviewStatus={reviewStatus}
          setReviewStatus={setReviewStatus}
          contributionType={contributionType}
          setContributionType={setContributionType}
          topic={topic}
          setTopic={setTopic}
          urgency={urgency}
          setUrgency={setUrgency}
          channel={channel}
          setChannel={setChannel}
          from={from}
          setFrom={setFrom}
          to={to}
          setTo={setTo}
        />

        {err ? <p style={{ color: "#b00020" }}>{err}</p> : null}

        <ContributionsTable items={items} />
      </div>
    </div>
  );
}
