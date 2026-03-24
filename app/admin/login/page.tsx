"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setErr("Contraseña incorrecta o servidor no configurado.");
        setLoading(false);
        return;
      }
      router.replace("/admin/dashboard");
    } catch {
      setErr("Error de red");
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f4f6fb" }}>
      <form
        onSubmit={onSubmit}
        style={{
          background: "#fff",
          padding: 32,
          borderRadius: 16,
          boxShadow: "0 4px 24px rgba(10,15,138,0.12)",
          width: "min(360px, 92vw)",
        }}
      >
        <h1 style={{ margin: "0 0 8px", color: "#0a0f8a", fontSize: "1.25rem" }}>Onda — Acceso interno</h1>
        <p style={{ margin: "0 0 20px", fontSize: "0.875rem", color: "#555" }}>
          Clave igual a <code style={{ fontSize: "0.8rem" }}>ADMIN_SECRET</code> en el servidor. La sesión usa cookie
          HttpOnly.
        </p>
        <label style={{ display: "block", marginBottom: 8, fontSize: "0.875rem" }} htmlFor="admin-pw">
          Contraseña
        </label>
        <input
          id="admin-pw"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #1428d4",
            marginBottom: 16,
            boxSizing: "border-box",
          }}
        />
        {err ? <p style={{ color: "#b00020", fontSize: "0.875rem" }}>{err}</p> : null}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: 8,
            border: "none",
            background: "#1428d4",
            color: "#fff",
            fontWeight: 600,
            cursor: loading ? "wait" : "pointer",
            marginTop: 8,
          }}
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
