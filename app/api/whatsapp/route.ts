import { NextRequest, NextResponse } from "next/server";
import { getOndaReply } from "../../../lib/ondaReply";
import { sendWhatsAppText } from "../../../lib/whatsapp";

function asString(q: string | string[] | null | undefined): string {
  if (q == null) return "";
  return Array.isArray(q) ? q[0] ?? "" : q;
}

/**
 * Verificación del webhook (WhatsApp Cloud API).
 * GET con hub.mode=subscribe, hub.verify_token, hub.challenge.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = asString(searchParams.get("hub.mode"));
  const token = asString(searchParams.get("hub.verify_token"));
  const challenge = asString(searchParams.get("hub.challenge"));

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (mode === "subscribe" && token && verifyToken && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * Recepción de mensajes: POST con el payload de WhatsApp.
 * Extrae mensajes de texto y los pasa a la lógica ONDA (OpenAI + envío de respuesta).
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const entries = payload?.entry ?? [];

    for (const entry of entries) {
      for (const change of entry?.changes ?? []) {
        const messages = change?.value?.messages ?? [];
        for (const msg of messages) {
          const from = msg?.from;
          const text = msg?.text?.body;

          if (from && text) {
            const response = await getOndaReply(text);
            await sendWhatsAppText(from, response);
          }
        }
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[ONDA] Error en webhook WhatsApp:", message);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
