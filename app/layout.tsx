import type { Metadata, Viewport } from "next";
import { resolveOndaMetadataBaseUrl } from "@/lib/ondaPublicBaseUrl";

/** Favicon / Apple: copia de `public/favicon-onda.png` en `app/icon.png` y `app/apple-icon.png`. */
export const metadata: Metadata = {
  metadataBase: new URL(resolveOndaMetadataBaseUrl()),
  title: "Onda - Asistente Digital Precisar",
  description:
    "Webhook WhatsApp para ONDA. Asistente de Alfabetización Mediática e Informacional (AMI).",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

/**
 * Tipografía de marca: Avenir (sistema cuando está instalado; pila sans explícita para que nunca caiga en serif).
 * Antes: Inter + Montserrat (Google), lo que podía verse distinto entre local y producción según carga de fuentes.
 */
const FONT_ONDA_STACK = String.raw`"Avenir Next", Avenir, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif`;

/** Naranja del botón Enviar (neumórfico). Env NEXT_PUBLIC_ONDA_ORANGE o naranja oscuro #C43E00 por defecto. */
const SEND_ORANGE = (typeof process !== "undefined" && process.env.NEXT_PUBLIC_ONDA_ORANGE) || "#C43E00";

const GLOBAL_CSS = `
:root{--font-onda:${FONT_ONDA_STACK}}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border-width:0}
html,body{height:100%;margin:0;pointer-events:auto;touch-action:manipulation;max-width:100%;overflow-x:hidden}
body{-webkit-font-smoothing:antialiased;font-family:var(--font-onda);line-height:1.6;outline:none}
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
/* Tipografía: Avenir / pila sans (16px base), line-height 1.6 */
.onda-page-wrap,.onda-messages,.onda-messages-inner,.onda-shell{font-family:var(--font-onda);font-size:1rem;line-height:1.6}
.prose-onda{font-family:var(--font-onda);font-size:1rem;line-height:1.6}
.prose-onda p + p{margin-top:1em}
/* Negritas: peso 600 (semibold), nunca 700 o superior */
.prose-onda b,.prose-onda strong,b,strong{color:inherit;font-weight:600 !important}
/* Cabecera, botones y picker: misma familia Avenir (identidad unificada) */
.onda-shell header,.onda-shell button,.onda-shell [role="button"],.onda-shell label,.onda-shell .onda-menu-btn,.onda-shell [data-onda-send],.onda-shell [data-onda-action],.onda-shell [data-onda-picker-composer]{font-family:var(--font-onda)}
@keyframes bubbleIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes ondaOfflineBannerIn{from{opacity:0}to{opacity:1}}
@keyframes ondaPickerPulse{0%,100%{box-shadow:0 4px 14px rgba(0,0,0,0.15)}50%{box-shadow:0 0 0 4px rgba(255,180,0,0.75)}}
.onda-picker-highlight [data-onda-picker-composer]{animation:ondaPickerPulse .85s ease-in-out 3}
.bubble-in{animation:bubbleIn .28s cubic-bezier(.25,.75,.2,1) both}
@media (prefers-reduced-motion: reduce){
.bubble-in,.onda-picker-highlight [data-onda-picker-composer]{animation:none !important}
.onda-messages-inner{scroll-behavior:auto}
}
.onda-shell input::placeholder{color:#5a5d62;opacity:0.9;font-weight:500;letter-spacing:0.02em}
/* Foco visible en controles (accesibilidad); el outline global se anula solo sin :focus-visible */
.onda-shell *:focus:not(:focus-visible){outline:none !important}
.onda-shell button:focus-visible,
.onda-shell [role="button"]:focus-visible,
.onda-shell a:focus-visible,
.onda-shell input:focus-visible,
.onda-shell select:focus-visible,
.onda-shell textarea:focus-visible,
.onda-shell [tabindex]:not([tabindex="-1"]):focus-visible{
  outline:3px solid #2563eb !important;
  outline-offset:2px !important;
}
.onda-skip-link{
  position:absolute;
  left:-9999px;
  top:0;
  z-index:10000;
  padding:12px 16px;
  background:#111;
  color:#fff;
  font-weight:600;
  text-decoration:none;
  border-radius:8px;
  font-family:var(--font-onda);
}
.onda-skip-link:focus,
.onda-skip-link:focus-visible{
  left:12px;
  top:12px;
  outline:3px solid #f59e0b !important;
  outline-offset:2px !important;
}
.onda-page-wrap{outline:none;position:relative;z-index:0}
/* Área de mensajes: flujo hacia abajo (arriba = viejo, abajo = nuevo), como WhatsApp */
.onda-messages{min-height:0;display:flex;flex-direction:column;overflow:hidden;position:relative;z-index:1}
.onda-messages-inner{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;overflow-anchor:auto;-webkit-overflow-scrolling:touch;position:relative;z-index:1;display:flex;flex-direction:column;justify-content:flex-start;align-items:stretch}
.onda-messages-inner::-webkit-scrollbar{width:6px}
.onda-messages-inner::-webkit-scrollbar-track{background:transparent}
.onda-messages-inner::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.2);border-radius:3px}
/* Embed (Wix / Precisar): sin padding inline grande; bordes y safe-area en móvil */
[data-onda-embed="1"]{
  width:100%!important;
  max-width:100%!important;
  overflow-x:hidden!important;
  box-sizing:border-box!important;
  padding:max(8px, env(safe-area-inset-top)) max(10px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(10px, env(safe-area-inset-left))!important;
}
[data-onda-embed="1"] .onda-embed-frame{
  width:100%!important;
  max-width:100%!important;
  box-sizing:border-box!important;
  border-radius:min(24px, 5vw)!important;
}
/* Móvil: tipografía legible y zonas táctiles ≥44px */
@media (max-width:480px){
  html{font-size:18px}
  .onda-shell button,.onda-shell [role="button"],.onda-shell label[for]{min-height:44px;min-width:44px}
  .onda-shell input{min-height:48px;font-size:1rem}
  .onda-shell{border-radius:min(22px, 4vw)!important}
  .onda-messages{margin:8px!important;border-radius:16px!important}
  .onda-shell header{padding-left:14px!important;padding-right:14px!important}
  .onda-page-wrap:not([data-onda-embed="1"]){padding:max(10px, env(safe-area-inset-top)) 12px max(14px, env(safe-area-inset-bottom)) 12px!important}
}
/* Bajo consumo: menos sombras y animaciones en la carcasa del chat */
.onda-shell[data-onda-low-bandwidth="1"] .bubble-in{animation:none!important}
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
