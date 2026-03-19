import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";

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

/** Cuerpo de mensajes: Inter, legible y neutro. */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-onda-body",
  display: "swap",
});

/** Títulos y botones: Montserrat, precisión tecnológica. */
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-onda-heading",
  display: "swap",
});

/** Naranja del botón Enviar (neumórfico). Env NEXT_PUBLIC_ONDA_ORANGE o naranja oscuro #C43E00 por defecto. */
const SEND_ORANGE = (typeof process !== "undefined" && process.env.NEXT_PUBLIC_ONDA_ORANGE) || "#C43E00";

const GLOBAL_CSS = `
html,body{height:100%;margin:0;pointer-events:auto;touch-action:manipulation}
body{-webkit-font-smoothing:antialiased;font-family:var(--font-onda-body),Inter,sans-serif;line-height:1.6;outline:none}
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
/* Tipografía: Inter 16px (text-base), line-height 1.6, espacio real entre párrafos */
.onda-page-wrap,.onda-messages,.onda-messages-inner,.onda-shell{font-family:var(--font-onda-body),Inter,sans-serif;font-size:1rem;line-height:1.6}
.prose-onda{font-family:var(--font-onda-body),Inter,sans-serif;font-size:1rem;line-height:1.6}
.prose-onda p + p{margin-top:1em}
/* Negritas: peso 600 (semibold), nunca 700 o superior */
.prose-onda b,.prose-onda strong,b,strong{color:inherit;font-weight:600 !important}
/* Títulos y botones: Montserrat, precisión tecnológica */
.onda-shell header,.onda-shell button,.onda-shell [role="button"],.onda-shell label,.onda-shell .onda-menu-btn,.onda-shell [data-onda-send],.onda-shell [data-onda-action],.onda-shell [data-onda-picker-composer]{font-family:var(--font-onda-heading),Montserrat,sans-serif}
@keyframes bubbleIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
.bubble-in{animation:bubbleIn .28s cubic-bezier(.25,.75,.2,1) both}
.onda-shell input::placeholder{color:#5a5d62;opacity:0.9;font-weight:500;letter-spacing:0.02em}
.onda-shell *,.onda-shell *:focus,.onda-shell *:focus-visible{outline:none !important}
.onda-page-wrap{outline:none;position:relative;z-index:0}
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
    <html lang="es" className={`${inter.variable} ${montserrat.variable}`} style={{ height: "100%", overflow: "hidden" }}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      </head>
      <body style={{ height: "100%", overflow: "hidden" }}>
        {children}
      </body>
    </html>
  );
}
