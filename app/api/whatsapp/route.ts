import { getOndaReply } from "../../../lib/ondaReply";
import { sendWhatsAppText } from "../../../lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Verificación del webhook (WhatsApp Cloud API).
 * Meta exige: 200 + cuerpo = hub.challenge en texto plano (sin JSON, sin HTML).
 * Si llamas GET sin params (o desde el navegador) devuelve diagnóstico de env.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
  if (mode === "subscribe" && token && challenge) {
    if (VERIFY_TOKEN && token === VERIFY_TOKEN) {
      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }
    return new Response("Forbidden", { status: 403 });
  }

  // Diagnóstico: abrir esta URL en el navegador para ver si la ruta y las env están bien
  const diagnostic = {
    status: "ONDA webhook",
    url_para_meta: "Usa esta misma URL en Meta como Callback URL (GET = verificación, POST = mensajes)",
    env: {
      WHATSAPP_VERIFY_TOKEN: !!process.env.WHATSAPP_VERIFY_TOKEN,
      WHATSAPP_ACCESS_TOKEN: !!process.env.WHATSAPP_ACCESS_TOKEN,
      WHATSAPP_PHONE_NUMBER_ID: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    },
    todo_ok:
      !!process.env.WHATSAPP_VERIFY_TOKEN &&
      !!process.env.WHATSAPP_ACCESS_TOKEN &&
      !!process.env.WHATSAPP_PHONE_NUMBER_ID &&
      !!process.env.OPENAI_API_KEY,
  };
  return new Response(JSON.stringify(diagnostic, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Recepción de mensajes: POST con el payload de WhatsApp.
 * Extrae mensajes de texto y los pasa a la lógica ONDA (OpenAI + envío de respuesta).
 */
export async function POST(req: Request) {
  try {
    let payload: { entry?: unknown[] } = {};
    try {
      payload = await req.json();
    } catch {
      // Meta a veces envía body vacío o no-JSON (ej. confirmaciones)
      return new Response("OK", { status: 200 });
    }
    const entries = payload?.entry ?? [];

    for (const entry of entries) {
      for (const change of (entry as { changes?: unknown[] })?.changes ?? []) {
        const value = (change as { value?: { messages?: unknown[] } })?.value;
        const messages = value?.messages ?? [];
        for (const msg of messages) {
          const from = (msg as { from?: string })?.from;
          const text = (msg as { text?: { body?: string } })?.text?.body;

          if (from && text) {
            try {
              const response = await getOndaReply(text);
              const result = await sendWhatsAppText(from, response);
              if (!result.ok) {
                console.error("[ONDA] sendWhatsAppText failed:", result.error);
              }
            } catch (e) {
              console.error("[ONDA] Error getOndaReply/send:", e);
            }
          }
        }
      }
    }

    return new Response("OK", { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[ONDA] Error en webhook WhatsApp:", message);
    return new Response("OK", { status: 200 });
  }
}
