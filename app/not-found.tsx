import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
        background: "linear-gradient(180deg, #f4f4ff 0%, #ececf8 100%)",
        color: "#1e1e2e",
      }}
    >
      <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.75rem", fontWeight: 700 }}>
        404 – Página no encontrada
      </h1>
      <p style={{ margin: 0, color: "#5c5c7a", fontSize: "0.95rem" }}>
        La ruta que buscás no existe en esta app.
      </p>
      <Link
        href="/"
        style={{
          display: "inline-block",
          marginTop: "1.5rem",
          padding: "12px 24px",
          borderRadius: 12,
          background: "linear-gradient(135deg, #43BCCD, #662E9B)",
          color: "#fff",
          fontWeight: 700,
          textDecoration: "none",
          fontSize: "0.9rem",
        }}
      >
        Ir al chat ONDA
      </Link>
      <p style={{ marginTop: "1.5rem", fontSize: "0.8rem", color: "#6e6e8a", textAlign: "center", maxWidth: 320 }}>
        Ejecutá <strong>npm run dev</strong> y entrá a <strong>http://localhost:3020</strong>
      </p>
    </div>
  );
}
