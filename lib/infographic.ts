/**
 * Adapter: payload + eje → template Liquid Glass → PNG (Resvg).
 * Web: dataUrl para NDJSON. WhatsApp: buffer para sendWhatsAppImage.
 */

import type { EjeOnda } from "../content/types";
import type { InfographicPayload } from "./infographicPayload";
import { buildInfographicSvg, type InfographicTemplatePayload } from "./infographicTemplate";
import { svgToPngBuffer, svgToPngDataUrl } from "./infographicRender";

export type SvgToPngResult = { ok: true; buffer: Buffer; dataUrl: string } | { ok: false; error: string };

/** Tamaño máximo del PNG generado (bytes). */
export const INFOGRAPHIC_MAX_PNG_BYTES = 3_500_000;

function toTemplateEje(eje: EjeOnda | null | undefined): InfographicTemplatePayload["eje"] {
  if (eje === "A_MANO" || eje === "CIVITA" || eje === "PROFES") return eje;
  return "GENERIC";
}

function payloadCharBudget(p: InfographicPayload): number {
  return (
    p.title.length +
    p.summaryBullets.join("").length +
    p.whyMatters.join("").length +
    p.nextSteps.join("").length +
    (p.sources?.join("")?.length ?? 0)
  );
}

/**
 * Mapea el payload al formato del template (límites según elder en payload).
 */
function toTemplatePayload(payload: InfographicPayload, eje: EjeOnda | null | undefined): InfographicTemplatePayload {
  const elder = payload.elderFriendly === true;
  return {
    eje: toTemplateEje(eje),
    title: payload.title,
    important: payload.summaryBullets.slice(0, elder ? 3 : 5),
    why: payload.whyMatters.slice(0, elder ? 1 : 2),
    actions: payload.nextSteps.slice(0, 3),
    sources: payload.sources?.slice(0, 3),
    locale: payload.locale,
    elderFriendly: payload.elderFriendly,
  };
}

/**
 * Genera infografía PNG 1080×1350 (Liquid Glass; SVG→PNG con Resvg).
 */
export async function renderInfographicPng(
  payload: InfographicPayload,
  eje?: EjeOnda | null
): Promise<{ ok: true; buffer: Buffer; dataUrl: string } | { ok: false; error: string }> {
  try {
    if (payloadCharBudget(payload) > 14_000) {
      return {
        ok: false,
        error: "Infográfico muito grande; peça uma versão mais curta.",
      };
    }
    const templatePayload = toTemplatePayload(payload, eje);
    const svg = buildInfographicSvg(templatePayload);
    const [buffer, dataUrl] = await Promise.all([svgToPngBuffer(svg), svgToPngDataUrl(svg)]);
    if (buffer.length > INFOGRAPHIC_MAX_PNG_BYTES) {
      return {
        ok: false,
        error: "Infográfico muito grande após render; vou resumir se você pedir de novo.",
      };
    }
    return { ok: true, buffer, dataUrl };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[infographic] render failed:", msg);
    return { ok: false, error: msg };
  }
}
