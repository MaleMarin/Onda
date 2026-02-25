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

const GLOBAL_CSS = `
html,body{height:100%;margin:0}
body{-webkit-font-smoothing:antialiased}
*,*::before,*::after{box-sizing:border-box}
.prose-onda b,.prose-onda strong{color:inherit;font-weight:700}
@keyframes bubbleIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
.bubble-in{animation:bubbleIn .28s cubic-bezier(.2,.8,.2,1) both}
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" style={{ height: "100%", overflow: "hidden" }}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      </head>
      <body
        className={plusJakarta.className}
        style={{ height: "100%", overflow: "hidden" }}
      >
        {children}
      </body>
    </html>
  );
}
