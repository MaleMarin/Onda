"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { OndaContributionRecord } from "@/lib/onda/contributions/types";
import { ContributionDetail } from "@/components/admin/onda-contributions/ContributionDetail";
import { ReviewActions } from "@/components/admin/onda-contributions/ReviewActions";

const BLUE = "#1428d4";
const DARK = "#0a0f8a";

export default function OndaContributionDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const [row, setRow] = useState<OndaContributionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [topic, setTopic] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErr(null);
    setNotFound(false);
    const res = await fetch(`/api/admin/onda-contributions/${encodeURIComponent(id)}`, { credentials: "include" });
    if (res.status === 401) {
      setUnauthorized(true);
      setLoading(false);
      return;
    }
    if (res.status === 404) {
      setNotFound(true);
      setRow(null);
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setErr("No se pudo cargar.");
      setRow(null);
      setLoading(false);
      return;
    }
    const data = (await res.json()) as OndaContributionRecord;
    setRow(data);
    setNotes(data.internalNotes ?? "");
    setTagsStr((data.tags ?? []).join(", "));
    setTopic(data.topic ?? "");
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(partial: Record<string, unknown>) {
    if (!id) return;
    setSaving(true);
    setErr(null);
    const res = await fetch(`/api/admin/onda-contributions/${encodeURIComponent(id)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partial),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(typeof data?.error === "string" ? data.error : "Error al guardar.");
      setSaving(false);
      return;
    }
    setRow(data as OndaContributionRecord);
    setSaving(false);
  }

  if (unauthorized) {
    return (
      <div style={{ padding: 24 }}>
        <Link href="/admin/login">Login</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <p>Cargando…</p>
      </div>
    );
  }

  if (notFound || !row) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui" }}>
        <p>{err || "No encontrado."}</p>
        <Link href="/admin/onda-contributions" style={{ color: BLUE }}>
          Volver al listado
        </Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6fb", fontFamily: "system-ui, sans-serif", padding: 16 }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <p>
          <Link href="/admin/onda-contributions" style={{ color: BLUE, fontWeight: 600 }}>
            ← Listado
          </Link>
        </p>
        <h1 style={{ color: DARK, fontSize: "1.25rem" }}>Contribución {row.id}</h1>
        {err ? <p style={{ color: "#b00020" }}>{err}</p> : null}

        <ContributionDetail row={row} />
        <ReviewActions row={row} saving={saving} onPatch={patch} />

        <section style={{ background: "#fff", borderRadius: 12, padding: 16, marginTop: 12 }}>
          <h2 style={{ fontSize: "1rem", marginTop: 0, color: DARK }}>Notas internas y metadatos</h2>
          <label style={{ display: "block", fontSize: "0.8125rem", marginBottom: 8 }}>
            Notas
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} style={{ width: "100%", marginTop: 4, padding: 8, borderRadius: 8, border: `1px solid ${BLUE}` }} />
          </label>
          <label style={{ display: "block", fontSize: "0.8125rem", marginBottom: 8 }}>
            Tags (coma)
            <input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} style={{ width: "100%", marginTop: 4, padding: 8, borderRadius: 8, border: `1px solid ${BLUE}` }} />
          </label>
          <label style={{ display: "block", fontSize: "0.8125rem", marginBottom: 8 }}>
            Topic
            <input value={topic} onChange={(e) => setTopic(e.target.value)} style={{ width: "100%", marginTop: 4, padding: 8, borderRadius: 8, border: `1px solid ${BLUE}` }} />
          </label>
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              void patch({
                internalNotes: notes,
                tags: tagsStr
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
                topic,
              })
            }
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              background: DARK,
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Guardar notas / tags / topic
          </button>
        </section>
      </div>
    </div>
  );
}
