import { getOndaReply, getOndaReplyWithImage } from "../../../lib/ondaReply";
import { wantsSources } from "../../../lib/responseFormat";
import { transcribeAudio } from "../../../lib/transcribe";
import { EjeOnda } from "../../../content/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_EJES = new Set<string>([EjeOnda.A_MANO, EjeOnda.CIVITA, EjeOnda.PROFES]);

/**
 * API para el chat web de ONDA. Acepta:
 * - message (texto)
 * - image (data URL base64, opcional)
 * - audio (data URL base64, opcional; se transcribe con Whisper)
 * - eje, history
 * Con imagen se usa Gemini; solo texto usa OpenAI.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    let message = typeof body?.message === "string" ? body.message.trim() : "";
    const image =
      typeof body?.image === "string" && body.image.startsWith("data:")
        ? (body.image as string)
        : null;
    const audio =
      typeof body?.audio === "string" && (body.audio.startsWith("data:") || body.audio.length > 100)
        ? (body.audio as string)
        : null;

    const ejeRaw = body?.eje;
    const eje =
      typeof ejeRaw === "string" && VALID_EJES.has(ejeRaw) ? (ejeRaw as EjeOnda) : null;

    const rawHistory = Array.isArray(body?.history) ? body.history : [];
    const history = rawHistory
      .filter((m: unknown) => {
        if (typeof m !== "object" || m === null || !("role" in m) || !("content" in m)) return false;
        const r = (m as { role: string }).role;
        const c = (m as { content: unknown }).content;
        return (r === "user" || r === "model") && typeof c === "string";
      })
      .map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "model",
        content: String(m.content).trim(),
      }));

    if (!message && !image && !audio) {
      return Response.json(
        { error: "Enviá un mensaje de texto, una imagen o un audio." },
        { status: 400 }
      );
    }

    if (audio) {
      try {
        const transcribed = await transcribeAudio(audio);
        message = message ? `${message}\n\n[Voz transcrita]: ${transcribed}` : transcribed;
      } catch (err) {
        console.error("[chat] transcribe", err);
        return Response.json(
          { error: "No pude transcribir el audio. Probá con otro formato o envíalo por texto." },
          { status: 400 }
        );
      }
    }

    const includeSources = wantsSources(message);
    const reply = image
      ? await getOndaReplyWithImage(message || "¿Qué ves en esta imagen?", image, eje, history.length > 0 ? history : null, includeSources)
      : await getOndaReply(message, eje, history.length > 0 ? history : null, includeSources);
    return Response.json({ reply });
  } catch (e) {
    console.error("[chat]", e);
    return Response.json(
      { error: "Del lado mío hubo un problemita. Intentá en un ratito." },
      { status: 500 }
    );
  }
}
