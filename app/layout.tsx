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
    <html lang="es" style={{ height: "100%" }}>
      <body style={{ margin: 0, minHeight: "100%", height: "100%" }}>{children}</body>
    </html>
  );
}
