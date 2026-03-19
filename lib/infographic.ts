/**
 * Adapter: payload de parseResponseFormat + eje → template Liquid Glass → PNG (sharp).
 * Web: dataUrl para NDJSON. WhatsApp: buffer para sendWhatsAppImage.
 */

import type { EjeOnda } from "../content/types";
import type { InfographicPayload } from "./responseFormat";
import { buildInfographicSvg, type InfographicTemplatePayload } from "./infographicTemplate";
import { svgToPngBuffer, svgToPngDataUrl } from "./infographicRender";

export type SvgToPngResult = { ok: true; buffer: Buffer; dataUrl: string } | { ok: false; error: string };

function toTemplateEje(eje: EjeOnda | null | undefined): InfographicTemplatePayload["eje"] {
  if (eje === "A_MANO" || eje === "CIVITA" || eje === "PROFES") return eje;
  return "GENERIC";
}

/**
 * Mapea el payload extraído por parseResponseFormat al formato del template (important 3–5, why 1–2, actions 2–3, sources 0–3).
 */
function toTemplatePayload(payload: InfographicPayload, eje: EjeOnda | null | undefined): InfographicTemplatePayload {
  return {
    eje: toTemplateEje(eje),
    title: payload.title,
    important: payload.summaryBullets.slice(0, 5),
    why: payload.whyMatters.slice(0, 2),
    actions: payload.nextSteps.slice(0, 3),
    sources: payload.sources?.slice(0, 3),
  };
}

/**
 * Genera infografía PNG 1080×1350 (Liquid Glass + aurora; sharp para SVG→PNG). Para web (dataUrl) y WhatsApp (buffer).
 */
export async function renderInfographicPng(
  payload: InfographicPayload,
  eje?: EjeOnda | null
): Promise<{ ok: true; buffer: Buffer; dataUrl: string } | { ok: false; error: string }> {
  try {
    const templatePayload = toTemplatePayload(payload, eje);
    const svg = buildInfographicSvg(templatePayload);
    const [buffer, dataUrl] = await Promise.all([svgToPngBuffer(svg), svgToPngDataUrl(svg)]);
    return { ok: true, buffer, dataUrl };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[infographic] render failed:", msg);
    return { ok: false, error: msg };
  }
}
