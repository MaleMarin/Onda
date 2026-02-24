import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Onda - Asistente Digital Precisar",
  description:
    "Webhook WhatsApp para ONDA. Asistente de Alfabetización Mediática e Informacional (AMI).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" style={{ height: "100%", overflow: "hidden" }}>
      <body
        className={plusJakarta.className}
        style={{
          margin: 0,
          height: "100%",
          overflow: "hidden",
          boxSizing: "border-box",
          background: "#f8fafc",
        }}
      >
        {children}
        <style
          dangerouslySetInnerHTML={{
            __html: ".prose-onda b,.prose-onda strong{color:inherit;font-weight:700}",
          }}
        />
      </body>
    </html>
  );
}
