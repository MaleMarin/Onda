/**
 * SVG → PNG 1080×1350 con @resvg/resvg-js (render predecible, sin ejecutar HTML externo).
 */

import { Resvg } from "@resvg/resvg-js";

const MAX_SVG_BYTES = 500_000;

export async function svgToPngBuffer(svg: string): Promise<Buffer> {
  const bytes = Buffer.byteLength(svg, "utf8");
  if (bytes > MAX_SVG_BYTES) {
    throw new Error(`SVG excede límite (${MAX_SVG_BYTES} bytes)`);
  }
  const resvg = new Resvg(svg, {
    fitTo: { mode: "original" },
    font: { loadSystemFonts: true },
  });
  const rendered = resvg.render();
  const png = rendered.asPng();
  return Buffer.from(png);
}

export async function svgToPngDataUrl(svg: string): Promise<string> {
  const buf = await svgToPngBuffer(svg);
  return `data:image/png;base64,${buf.toString("base64")}`;
}
