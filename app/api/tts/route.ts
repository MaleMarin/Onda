import { generateSpeech } from "../../../lib/tts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST { "text": "..." } → stream de audio (audio/mpeg).
 * Convierte la respuesta de ONDA a voz (OpenAI TTS).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text) {
      return new Response(JSON.stringify({ error: "Falta el texto." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const buffer = await generateSpeech(text);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[tts]", e);
    return Response.json(
      { error: "No pude generar el audio. Probá en un ratito." },
      { status: 500 }
    );
  }
}
