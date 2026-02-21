import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ONDA - Precisar",
  description: "Webhook WhatsApp para ONDA",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" style={{ height: "100%", overflow: "hidden" }}>
      <body style={{ margin: 0, height: "100%", overflow: "hidden", boxSizing: "border-box" }}>{children}</body>
    </html>
  );
}
