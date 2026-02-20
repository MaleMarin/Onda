import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui", maxWidth: "40rem", margin: "0 auto" }}>
      <h1>ONDA – Precisar</h1>
      <p>Bot de Alfabetización Mediática e Informacional (AMI).</p>
      <p>
        <Link
          href="/chat"
          style={{
            display: "inline-block",
            padding: "0.75rem 1.25rem",
            background: "#1a1a2e",
            color: "white",
            borderRadius: "0.5rem",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Abrir chat ONDA (demo web)
        </Link>
      </p>
      <p style={{ marginTop: "2rem", fontSize: "0.875rem", color: "#666" }}>
        Webhook WhatsApp: <code>/api/webhook</code>
      </p>
    </main>
  );
}
