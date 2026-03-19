/**
 * SVG → PNG 1080×1350 con sharp (compatible con Next/Vercel).
 */

import sharp from "sharp";

export async function svgToPngBuffer(svg: string): Promise<Buffer> {
  return sharp(Buffer.from(svg, "utf-8"))
    .png({ compressionLevel: 6 })
    .toBuffer();
}

export async function svgToPngDataUrl(svg: string): Promise<string> {
  const buf = await svgToPngBuffer(svg);
  return `data:image/png;base64,${buf.toString("base64")}`;
}
