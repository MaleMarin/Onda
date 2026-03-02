import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Onda - Asistente Digital Precisar",
  description:
    "Webhook WhatsApp para ONDA. Asistente de Alfabetización Mediática e Informacional (AMI).",
};

const GLOBAL_CSS = `
html,body{height:100%;margin:0;pointer-events:auto;touch-action:manipulation}
body{-webkit-font-smoothing:antialiased;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;outline:none}
/* Shell aislado: clics siempre llegan a botones/inputs. No añadir overlays ni ::before/::after que tapen. */
.onda-shell{position:relative;z-index:1;isolation:isolate;pointer-events:auto}
.onda-shell *{pointer-events:auto}
button,label,input,a,[role="button"]{cursor:pointer;touch-action:manipulation}
*,*::before,*::after{box-sizing:border-box}
.prose-onda b,.prose-onda strong{color:inherit;font-weight:700}
@keyframes bubbleIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
.bubble-in{animation:bubbleIn .28s cubic-bezier(.25,.75,.2,1) both}
.onda-shell input::placeholder{color:#5a5d62;opacity:0.9;font-weight:500;letter-spacing:0.02em}
.onda-shell *,.onda-shell *:focus,.onda-shell *:focus-visible{outline:none !important}
.onda-page-wrap{outline:none}
/* Área de mensajes: permitir scroll (contenido largo); scrollbar opcional oculta */
.onda-messages{min-height:0;display:flex;flex-direction:column;overflow:hidden}
.onda-messages-inner{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch}
.onda-messages-inner::-webkit-scrollbar{width:6px}
.onda-messages-inner::-webkit-scrollbar-track{background:transparent}
.onda-messages-inner::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.2);border-radius:3px}
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
