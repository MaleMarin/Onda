/**
 * Generación de imagen (PNG) a partir de texto para formato infografía/imagen.
 * Usa OpenAI Images API (DALL-E 3). Solo orquestación; sin tocar personalidad.
 */

import OpenAI from "openai";

const MODEL = "dall-e-3";
const SIZE = "1024x1024";

function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is required for image generation.");
  return new OpenAI({ apiKey: key });
}

export type GenerateImageResult =
  | { ok: true; buffer: Buffer; mimeType: "image/png"; url?: string }
  | { ok: false; error: string };

/**
 * Genera una imagen a partir del texto (guion/descripción de la respuesta).
 * El texto debe ser breve y descriptivo; se usa como prompt para DALL-E 3.
 * Devuelve buffer PNG para envío (WhatsApp) y opcionalmente URL para web.
 */
export async function generateImageFromText(description: string): Promise<GenerateImageResult> {
  const trimmed = (description || "").trim().slice(0, 4000);
  if (!trimmed) {
    return { ok: false, error: "empty_description" };
  }

  try {
    const openai = getOpenAI();
    const res = await openai.images.generate({
      model: MODEL,
      prompt: trimmed,
      n: 1,
      size: SIZE as "1024x1024",
      response_format: "b64_json",
      style: "natural",
    });

    const b64 = (res.data?.[0] as { b64_json?: string } | undefined)?.b64_json;
    if (!b64) {
      return { ok: false, error: "no_image_data" };
    }

    const buffer = Buffer.from(b64, "base64");
    return { ok: true, buffer, mimeType: "image/png" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[generateImage]", msg);
    return { ok: false, error: msg };
  }
}
