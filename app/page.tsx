"use client";

import Link from "next/link";
import { useOndaTheme } from "@/lib/useOndaTheme";

export default function Home() {
  const t = useOndaTheme();

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
        background: t.grad.pageBg,
        color: t.c.ink,
      }}
    >
      <div
        style={{
          maxWidth: "28rem",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: 99,
            background: t.grad.badge,
            boxShadow: `0 0 0 6px ${t.c.ring}`,
          }}
        />
        <h1 style={{ margin: 0, fontSize: "1.5rem", color: t.c.ink, letterSpacing: ".02em" }}>
          ONDA – Precisar
        </h1>
        <p style={{ margin: 0, color: t.c.muted, fontSize: ".9rem", lineHeight: 1.6 }}>
          Bot de Alfabetización Mediática e Informacional (AMI).
        </p>
        <Link
          href="/chat"
          style={{
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginTop: 8,
            height: 44,
            padding: "0 20px",
            borderRadius: t.r.md,
            border: "none",
            color: "#fff",
            fontWeight: 700,
            fontSize: ".85rem",
            background: `linear-gradient(135deg, ${t.c.brand}, ${t.c.brand2})`,
            boxShadow: "0 8px 22px rgba(43,99,255,.20)",
          }}
        >
          Abrir chat ONDA
        </Link>
        <p style={{ marginTop: "1rem", fontSize: ".78rem", color: t.c.muted2 }}>
          Webhook WhatsApp:{" "}
          <code
            style={{
              fontFamily: t.font.mono,
              background: t.isDark ? "rgba(130,150,210,.12)" : "rgba(110,135,190,.08)",
              padding: "2px 6px",
              borderRadius: 6,
            }}
          >
            /api/webhook
          </code>
        </p>
      </div>
    </main>
  );
}
