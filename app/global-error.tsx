"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", padding: "2rem", background: "#f5f5f5" }}>
        <h2 style={{ marginTop: 0 }}>Algo salió mal</h2>
        <p style={{ color: "#666" }}>{error.message}</p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: "10px 20px",
            borderRadius: 8,
            border: "none",
            background: "#333",
            color: "#fff",
            cursor: "pointer",
            fontSize: "0.9rem",
          }}
        >
          Intentar de nuevo
        </button>
      </body>
    </html>
  );
}
