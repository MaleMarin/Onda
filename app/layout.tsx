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
    <html lang="es">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
