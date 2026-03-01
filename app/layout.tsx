import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Onda - Asistente Digital Precisar",
  description:
    "Webhook WhatsApp para ONDA. Asistente de Alfabetización Mediática e Informacional (AMI).",
};

const GLOBAL_CSS = `
html,body{height:100%;margin:0;pointer-events:auto;touch-action:manipulation}
body{-webkit-font-smoothing:antialiased;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;outline:none}
.onda-shell,.onda-shell *{pointer-events:auto}
button,label,input,a,[role="button"]{cursor:pointer;touch-action:manipulation}
*,*::before,*::after{box-sizing:border-box}
.prose-onda b,.prose-onda strong{color:inherit;font-weight:700}
@keyframes bubbleIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
.bubble-in{animation:bubbleIn .28s cubic-bezier(.25,.75,.2,1) both}
.onda-shell input::placeholder{color:#6e6864;opacity:0.88;font-weight:400}
.onda-shell *,.onda-shell *:focus,.onda-shell *:focus-visible{outline:none !important}
.onda-page-wrap{outline:none}
/* Ocultar scrollbar y cualquier grip/puntos en el área de mensajes */
.onda-messages{scrollbar-width:none;-ms-overflow-style:none}
.onda-messages::-webkit-scrollbar{display:none;width:0;height:0}
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
      <body style={{ height: "100%", overflow: "hidden" }}>
        {children}
      </body>
    </html>
  );
}
