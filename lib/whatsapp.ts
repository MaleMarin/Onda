/**
 * Envío de mensajes por WhatsApp Cloud API
 * Requiere: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID
 */

const API_VERSION = "v21.0";
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

export async function sendWhatsAppText(
  to: string,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TOKEN_DE_ACCESO_A_WHATSAPP;
  const phoneNumberId = "61586767326040";

  if (!token || !phoneNumberId) {
    console.error(
      "❌ Falta WHATSAPP_ACCESS_TOKEN o WHATSAPP_PHONE_NUMBER_ID en el entorno"
    );
    return { ok: false, error: "Missing WhatsApp config" };
  }

  const url = `${BASE_URL}/${phoneNumberId}/messages`;
  const body = {
    messaging_product: "whatsapp",
    to: String(to).replace(/\D/g, ""),
    type: "text",
    text: { body: text },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,//EAASIuZAjP4eQBQhSzdRHoZCD0jMtqZC4WfYtLQFQ9bkfZCAHsPyTWkn0TZAoERwZBojKSr9ZCQtjl4KZCwdfFZAT9d1rHF93DKkhwqHLKu0kmHRLLC47mo0L83w7GjLZCHcBNUkY1So03LZBD9McYbE1eJ6GueeSrpXNdO4Qc3dchTo7ZAZBO6Dvye9ck7bWAThd3ccJLH9bi5M3K4MjeAfV20WsNnDRgLc83rUZAZC2x6R
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as {
      error?: { message: string; code: number };
      messages?: Array<{ id: string }>;
    };

    if (!res.ok) {
      console.error("❌ WhatsApp API error:", data?.error?.message ?? res.statusText);
      return { ok: false, error: data?.error?.message };
    }

    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("❌ Error enviando WhatsApp:", msg);
    return { ok: false, error: msg };
  }
}
