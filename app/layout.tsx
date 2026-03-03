import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Onda - Asistente Digital Precisar",
  description:
    "Webhook WhatsApp para ONDA. Asistente de Alfabetización Mediática e Informacional (AMI).",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

/** Naranja del botón Enviar (neumórfico). Env NEXT_PUBLIC_ONDA_ORANGE o naranja oscuro #C43E00 por defecto. */
const SEND_ORANGE = (typeof process !== "undefined" && process.env.NEXT_PUBLIC_ONDA_ORANGE) || "#C43E00";

const GLOBAL_CSS = `
html,body{height:100%;margin:0;pointer-events:auto;touch-action:manipulation}
body{-webkit-font-smoothing:antialiased;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;outline:none}
/* Shell aislado: clics siempre llegan a botones/inputs. No añadir overlays ni ::before/::after que tapen. */
.onda-shell{position:relative;z-index:1;isolation:isolate;pointer-events:auto}
.onda-shell *{pointer-events:auto}
.onda-page-wrap,.onda-page-wrap *{pointer-events:auto !important}
button,label,input,a,[role="button"]{cursor:pointer;touch-action:manipulation}
/* Botón Enviar: naranja oscuro sólido (NEXT_PUBLIC_ONDA_ORANGE o #C43E00), neumorphism, siempre */
button[data-onda-send],
button[data-onda-send]:hover,
button[data-onda-send]:focus{background:${SEND_ORANGE} !important;color:#fff !important}
/* El contenido interno del botón picker no captura el clic; el botón sí */
.onda-picker-btn-inner{pointer-events:none !important}
/* Capa del composer y menú: encima del área de mensajes para que los clics lleguen */
.onda-composer-layer{position:relative;z-index:10;background:inherit}
/* Enlaces elegir Onda: siempre clicables */
[data-onda-picker-composer]{position:relative;z-index:2;pointer-events:auto !important}
/* Botones del menú y acciones: siempre clicables */
.onda-menu-btn,button[data-onda-action],button[data-onda-menu-id]{position:relative;z-index:2;pointer-events:auto !important;cursor:pointer}
*,*::before,*::after{box-sizing:border-box}
.prose-onda b,.prose-onda strong{color:inherit;font-weight:700}
@keyframes bubbleIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
.bubble-in{animation:bubbleIn .28s cubic-bezier(.25,.75,.2,1) both}
.onda-shell input::placeholder{color:#5a5d62;opacity:0.9;font-weight:500;letter-spacing:0.02em}
.onda-shell *,.onda-shell *:focus,.onda-shell *:focus-visible{outline:none !important}
.onda-page-wrap{outline:none;position:relative;z-index:0;font-size:1.125rem}
/* Área de mensajes: flujo hacia abajo (arriba = viejo, abajo = nuevo), como WhatsApp */
.onda-messages{min-height:0;display:flex;flex-direction:column;overflow:hidden;position:relative;z-index:1}
.onda-messages-inner{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;overflow-anchor:auto;-webkit-overflow-scrolling:touch;position:relative;z-index:1;display:flex;flex-direction:column;justify-content:flex-start;align-items:stretch}
.onda-messages-inner::-webkit-scrollbar{width:6px}
.onda-messages-inner::-webkit-scrollbar-track{background:transparent}
.onda-messages-inner::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.2);border-radius:3px}
/* Móvil: tipografía legible y zonas táctiles ≥44px */
@media (max-width:480px){
  html{font-size:18px}
  .onda-shell button,.onda-shell [role="button"],.onda-shell label[for]{min-height:44px;min-width:44px}
  .onda-shell input{min-height:48px;font-size:1rem}
}
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
