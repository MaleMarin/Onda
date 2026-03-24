"use client";

import { useEffect, useRef, useState } from "react";

const BLUE = "#1428d4";
const MINT = "#00e5a0";
const DARK = "#0a0f8a";

type Totals = {
  conversations: number;
  uniqueUsers: number;
  byOnda: Record<string, number>;
  byCanal: Record<string, number>;
  byIntent: Record<string, number>;
  avgSatisfaction: number;
  totalCostUSD: number;
  cacheHitRate: number;
};

type DailyRow = {
  date: string;
  totalConversations: number;
  uniqueUsers: number;
  byOnda: Record<string, number>;
  byCanal: Record<string, number>;
  byIntent: Record<string, number>;
  cacheHitRate: number;
  avgResponseMs: number;
  satisfactionRate: number;
  topTopics: string[];
};

type MetricsPayload = {
  period: string;
  daily: DailyRow[];
  totals: Totals;
};

type ChartCtor = new (
  ctx: HTMLCanvasElement,
  config: Record<string, unknown>
) => { destroy: () => void };

export default function AdminDashboardPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [days, setDays] = useState(7);
  const [data, setData] = useState<MetricsPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const ondaRef = useRef<HTMLCanvasElement>(null);
  const intentRef = useRef<HTMLCanvasElement>(null);
  const canalRef = useRef<HTMLCanvasElement>(null);
  const chartInstances = useRef<Array<{ destroy: () => void }>>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoadError(null);
      const res = await fetch(`/api/admin/metrics?days=${days}`, { credentials: "include" });
      if (cancelled) return;
      if (res.status === 401) {
        setUnauthorized(true);
        setAuthChecked(true);
        return;
      }
      setAuthChecked(true);
      setUnauthorized(false);
      if (!res.ok) {
        setLoadError("No se pudieron cargar las métricas");
        return;
      }
      setData((await res.json()) as MetricsPayload);
    })();
    return () => {
      cancelled = true;
    };
  }, [days]);

  useEffect(() => {
    if (!data || unauthorized) return;

    const destroyCharts = () => {
      chartInstances.current.forEach((c) => {
        try {
          c.destroy();
        } catch {
          /* */
        }
      });
      chartInstances.current = [];
    };

    const loadScript = () =>
      new Promise<void>((resolve, reject) => {
        const w = window as unknown as { Chart?: ChartCtor };
        if (w.Chart) {
          resolve();
          return;
        }
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js";
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Chart.js"));
        document.body.appendChild(s);
      });

    void loadScript()
      .then(() => {
        destroyCharts();
        const w = window as unknown as { Chart?: ChartCtor };
        const Chart = w.Chart;
        if (!Chart) return;

        const { byOnda, byCanal, byIntent } = data.totals;
        const ondaLabels = Object.keys(byOnda);
        const ondaValues = ondaLabels.map((k) => byOnda[k] ?? 0);
        if (ondaRef.current && ondaLabels.length > 0) {
          chartInstances.current.push(
            new Chart(ondaRef.current, {
              type: "bar",
              data: {
                labels: ondaLabels,
                datasets: [
                  {
                    label: "Conversaciones",
                    data: ondaValues,
                    backgroundColor: [BLUE, MINT, DARK],
                  },
                ],
              },
              options: { responsive: true, plugins: { legend: { display: false } } },
            })
          );
        }

        const intentLabels = Object.keys(byIntent);
        const intentValues = intentLabels.map((k) => byIntent[k] ?? 0);
        if (intentRef.current && intentLabels.length > 0) {
          chartInstances.current.push(
            new Chart(intentRef.current, {
              type: "bar",
              data: {
                labels: intentLabels,
                datasets: [
                  {
                    label: "Por intent",
                    data: intentValues,
                    backgroundColor: BLUE,
                  },
                ],
              },
              options: { responsive: true, plugins: { legend: { display: false } } },
            })
          );
        }

        const canalLabels = Object.keys(byCanal);
        const canalValues = canalLabels.map((k) => byCanal[k] ?? 0);
        if (canalRef.current && canalLabels.length > 0) {
          chartInstances.current.push(
            new Chart(canalRef.current, {
              type: "doughnut",
              data: {
                labels: canalLabels,
                datasets: [
                  {
                    data: canalValues,
                    backgroundColor: [BLUE, MINT, DARK],
                  },
                ],
              },
              options: { responsive: true },
            })
          );
        }
      })
      .catch(() => setLoadError("No se pudo cargar Chart.js desde CDN"));

    return () => destroyCharts();
  }, [data, unauthorized]);

  if (!authChecked && !unauthorized) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui", color: DARK }}>
        Comprobando acceso…
      </div>
    );
  }

  if (unauthorized) {
    if (typeof window !== "undefined") window.location.replace("/admin/login");
    return (
      <div style={{ padding: 24, fontFamily: "system-ui", color: DARK }}>
        Redirigiendo al inicio de sesión…
      </div>
    );
  }

  const t = data?.totals;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f6fb",
        fontFamily: "system-ui, sans-serif",
        color: DARK,
        padding: 16,
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <h1 style={{ margin: 0, fontSize: "1.35rem", color: DARK }}>ONDA IMPACT DASHBOARD</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <label style={{ fontSize: "0.875rem" }}>
              Periodo{" "}
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${BLUE}` }}
              >
                {[7, 14, 30, 90].map((d) => (
                  <option key={d} value={d}>
                    últimos {d}d
                  </option>
                ))}
              </select>
            </label>
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

        {loadError ? (
          <p style={{ color: "#b00020" }} role="alert">
            {loadError}
          </p>
        ) : null}

        {t ? (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 12,
                marginBottom: 20,
              }}
            >
              {[
                { label: "Conversaciones", value: t.conversations.toLocaleString() },
                { label: "Usuarios (aprox.)", value: t.uniqueUsers.toLocaleString() },
                { label: "Satisfacción", value: `${Math.round(t.avgSatisfaction * 100)}%` },
                { label: "Costo USD", value: `$${t.totalCostUSD.toFixed(2)}` },
              ].map((x) => (
                <div
                  key={x.label}
                  style={{
                    background: "#fff",
                    borderRadius: 12,
                    padding: 16,
                    boxShadow: "0 2px 8px rgba(10,15,138,0.08)",
                    border: "1px solid rgba(20,40,212,0.12)",
                  }}
                >
                  <div style={{ fontSize: "0.75rem", color: "#555", marginBottom: 6 }}>{x.label}</div>
                  <div style={{ fontSize: "1.35rem", fontWeight: 700, color: BLUE }}>{x.value}</div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 16,
              }}
            >
              <div style={{ background: "#fff", borderRadius: 12, padding: 16 }}>
                <h2 style={{ margin: "0 0 12px", fontSize: "1rem", color: DARK }}>Por Onda</h2>
                <canvas ref={ondaRef} height={200} />
              </div>
              <div style={{ background: "#fff", borderRadius: 12, padding: 16 }}>
                <h2 style={{ margin: "0 0 12px", fontSize: "1rem", color: DARK }}>Por intent</h2>
                <canvas ref={intentRef} height={200} />
              </div>
              <div style={{ background: "#fff", borderRadius: 12, padding: 16 }}>
                <h2 style={{ margin: "0 0 12px", fontSize: "1rem", color: DARK }}>Por canal</h2>
                <canvas ref={canalRef} height={220} />
              </div>
            </div>

            <div
              style={{
                marginTop: 20,
                background: "#fff",
                borderRadius: 12,
                padding: 16,
                overflowX: "auto",
              }}
            >
              <h2 style={{ margin: "0 0 12px", fontSize: "1rem", color: DARK }}>Detalle día a día</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: `2px solid ${MINT}` }}>
                    <th style={{ padding: 8 }}>Fecha</th>
                    <th style={{ padding: 8 }}>Conv.</th>
                    <th style={{ padding: 8 }}>Usuarios</th>
                    <th style={{ padding: 8 }}>Latencia media (ms)</th>
                    <th style={{ padding: 8 }}>Cache hit</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.daily ?? []).map((row) => (
                    <tr key={row.date} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: 8 }}>{row.date}</td>
                      <td style={{ padding: 8 }}>{row.totalConversations}</td>
                      <td style={{ padding: 8 }}>{row.uniqueUsers}</td>
                      <td style={{ padding: 8 }}>{row.avgResponseMs}</td>
                      <td style={{ padding: 8 }}>{Math.round(row.cacheHitRate * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data?.daily?.length === 0 ? (
                <p style={{ color: "#666" }}>
                  Sin datos de impacto en este periodo (KV vacío o sin conversaciones registradas).
                </p>
              ) : null}
            </div>
          </>
        ) : !loadError ? (
          <p style={{ color: "#666" }}>Cargando…</p>
        ) : null}
      </div>
    </div>
  );
}
