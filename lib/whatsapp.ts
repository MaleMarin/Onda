/**
 * Envío de mensajes por WhatsApp Cloud API
 * Requiere: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID
 */

function getEnv(...names: string[]): string {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.trim().length) return v.trim();
  }
  return "";
}

export async function sendWhatsAppText(
  to: string,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  const accessToken = getEnv(
    "WHATSAPP_ACCESS_TOKEN",
    "WHATSAPP_TOKEN",
    "TOKEN_DE_ACCESO_A_WHATSAPP"
  );
  const phoneNumberId = getEnv("WHATSAPP_PHONE_NUMBER_ID", "PHONE_NUMBER_ID");
  const graphVersion = getEnv("GRAPH_VERSION") || "v24.0";

  if (!accessToken || !phoneNumberId) {
    console.error("Missing envs", {
      hasAccessToken: Boolean(accessToken),
      hasPhoneNumberId: Boolean(phoneNumberId),
      hasVerifyToken: Boolean(getEnv("WHATSAPP_VERIFY_TOKEN", "VERIFY_TOKEN")),
      graphVersion,
    });
    return { ok: false, error: "Missing WhatsApp config" };
  }

  const baseUrl = `https://graph.facebook.com/${graphVersion}`;
  const url = `${baseUrl}/${phoneNumberId}/messages`;
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
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as {
      error?: { message: string; code: number };
      messages?: Array<{ id: string }>;
    };

    if (!res.ok) {
      console.error("WhatsApp API error", {
        status: res.status,
        code: data?.error?.code,
        message: data?.error?.message,
      });
      return { ok: false, error: data?.error?.message };
    }

    console.log("sendMessage status:", res.status);
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Error enviando WhatsApp:", msg);
    return { ok: false, error: msg };
  }
}
