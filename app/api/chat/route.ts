import { getOndaReply } from "../../../lib/ondaReply";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * API para el chat web de ONDA (misma lógica que WhatsApp).
 * Sirve para demostrar el bot en la web y grabar el video para Meta.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = typeof body?.message === "string" ? body.message.trim() : "";

    if (!message) {
      return Response.json(
        { error: "Falta el mensaje" },
        { status: 400 }
      );
    }

    const reply = await getOndaReply(message);
    return Response.json({ reply });
  } catch (e) {
    console.error("[chat]", e);
    return Response.json(
      { error: "No pude generar una respuesta. Revisa OPENAI_API_KEY." },
      { status: 500 }
    );
  }
}
