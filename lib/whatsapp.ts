/**
 * Envío de mensajes y descarga de medios por WhatsApp Cloud API
 * Requiere: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID
 */

function getEnv(...names: string[]): string {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.trim().length) return v.trim();
  }
  return "";
}

function getConfig(): { accessToken: string; phoneNumberId: string; graphVersion: string } | null {
  const accessToken = getEnv(
    "WHATSAPP_ACCESS_TOKEN",
    "WHATSAPP_TOKEN",
    "TOKEN_DE_ACCESO_A_WHATSAPP"
  );
  const phoneNumberId = getEnv("WHATSAPP_PHONE_NUMBER_ID", "PHONE_NUMBER_ID");
  const graphVersion = getEnv("GRAPH_VERSION") || "v24.0";
  if (!accessToken || !phoneNumberId) return null;
  return { accessToken, phoneNumberId, graphVersion };
}

/**
 * Descarga un medio de WhatsApp por su ID y lo devuelve como data URL (base64).
 * Sirve para imagen (GPT-4o-mini visión) y audio (Whisper).
 */
export async function getWhatsAppMediaAsBase64(
  mediaId: string,
  defaultMime: "image/jpeg" | "audio/ogg" = "image/jpeg"
): Promise<{ dataUrl: string; mimeType: string } | null> {
  const config = getConfig();
  if (!config) {
    console.error("Missing WhatsApp config for media download");
    return null;
  }
  const { accessToken, phoneNumberId, graphVersion } = config;
  const headers = { Authorization: `Bearer ${accessToken}` };
  try {
    const metaRes = await fetch(
      `https://graph.facebook.com/${graphVersion}/${mediaId}`,
      { headers }
    );
    if (!metaRes.ok) {
      console.error("WhatsApp media meta failed", metaRes.status);
      return null;
    }
    const meta = (await metaRes.json()) as { url?: string; mime_type?: string };
    const mediaUrl = meta?.url;
    if (!mediaUrl) {
      console.error("No url in media response");
      return null;
    }
    const fileRes = await fetch(mediaUrl, { headers });
    if (!fileRes.ok) {
      console.error("WhatsApp media download failed", fileRes.status);
      return null;
    }
    const buffer = Buffer.from(await fileRes.arrayBuffer());
    const mimeType =
      meta.mime_type ||
      fileRes.headers.get("content-type")?.split(";")[0]?.trim() ||
      defaultMime;
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;
    return { dataUrl, mimeType };
  } catch (e) {
    console.error("Error downloading WhatsApp media:", e);
    return null;
  }
}

const MAX_WA_TEXT_LENGTH = 4096;

export async function sendWhatsAppText(
  to: string,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  const config = getConfig();
  if (!config) {
    console.error("Missing envs", {
      hasAccessToken: Boolean(getEnv("WHATSAPP_ACCESS_TOKEN")),
      hasPhoneNumberId: Boolean(getEnv("WHATSAPP_PHONE_NUMBER_ID")),
      hasVerifyToken: Boolean(getEnv("WHATSAPP_VERIFY_TOKEN", "VERIFY_TOKEN")),
    });
    return { ok: false, error: "Missing WhatsApp config" };
  }
  const { accessToken, phoneNumberId, graphVersion } = config;
  const baseUrl = `https://graph.facebook.com/${graphVersion}`;
  const url = `${baseUrl}/${phoneNumberId}/messages`;
  const truncated = text.length > MAX_WA_TEXT_LENGTH
    ? text.slice(0, MAX_WA_TEXT_LENGTH - 3) + "..."
    : text;
  const body = {
    messaging_product: "whatsapp",
    to: String(to).replace(/\D/g, ""),
    type: "text",
    text: { body: truncated },
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

/**
 * Sube un archivo a WhatsApp y devuelve el media ID.
 * Requiere: buffer, mimeType (ej. audio/mpeg, image/jpeg), filename opcional.
 */
export async function uploadWhatsAppMedia(
  buffer: Buffer,
  mimeType: string,
  filename?: string
): Promise<{ id: string } | null> {
  const config = getConfig();
  if (!config) return null;
  const { accessToken, phoneNumberId, graphVersion } = config;
  const url = `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/media`;
  const name = filename ?? (mimeType.startsWith("audio") ? "audio.mp3" : "image.jpg");
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buffer)], { type: mimeType }), name);
  form.append("messaging_product", "whatsapp");
  form.append("type", mimeType);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    });
    const data = (await res.json()) as { id?: string; error?: { message: string } };
    if (!res.ok) {
      console.error("WhatsApp upload error", res.status, data?.error?.message);
      return null;
    }
    return data?.id ? { id: data.id } : null;
  } catch (e) {
    console.error("Error uploading WhatsApp media:", e);
    return null;
  }
}

/**
 * Envía un mensaje de audio (nota de voz). Sube el buffer y envía el mensaje.
 */
export async function sendWhatsAppAudio(
  to: string,
  audioBuffer: Buffer
): Promise<{ ok: boolean; error?: string }> {
  const config = getConfig();
  if (!config) {
    return { ok: false, error: "Missing WhatsApp config" };
  }
  const media = await uploadWhatsAppMedia(audioBuffer, "audio/mpeg", "audio.mp3");
  if (!media?.id) {
    return { ok: false, error: "Failed to upload audio" };
  }
  const { accessToken, phoneNumberId, graphVersion } = config;
  const baseUrl = `https://graph.facebook.com/${graphVersion}`;
  const url = `${baseUrl}/${phoneNumberId}/messages`;
  const body = {
    messaging_product: "whatsapp",
    to: String(to).replace(/\D/g, ""),
    type: "audio",
    audio: { id: media.id },
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
    const data = (await res.json()) as { error?: { message: string } };
    if (!res.ok) {
      console.error("WhatsApp audio send error", res.status, data?.error?.message);
      return { ok: false, error: data?.error?.message };
    }
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Error enviando audio WhatsApp:", msg);
    return { ok: false, error: msg };
  }
}

/**
 * Envía una imagen por WhatsApp. Sube el buffer y envía el mensaje.
 * Opcional: caption para texto debajo de la imagen.
 */
export async function sendWhatsAppImage(
  to: string,
  imageBuffer: Buffer,
  mimeType: "image/jpeg" | "image/png" = "image/jpeg",
  caption?: string
): Promise<{ ok: boolean; error?: string }> {
  const config = getConfig();
  if (!config) {
    return { ok: false, error: "Missing WhatsApp config" };
  }
  const ext = mimeType === "image/png" ? "png" : "jpg";
  const media = await uploadWhatsAppMedia(imageBuffer, mimeType, `image.${ext}`);
  if (!media?.id) {
    return { ok: false, error: "Failed to upload image" };
  }
  const { accessToken, phoneNumberId, graphVersion } = config;
  const baseUrl = `https://graph.facebook.com/${graphVersion}`;
  const url = `${baseUrl}/${phoneNumberId}/messages`;
  const body: { messaging_product: string; to: string; type: string; image: { id: string; caption?: string } } = {
    messaging_product: "whatsapp",
    to: String(to).replace(/\D/g, ""),
    type: "image",
    image: { id: media.id },
  };
  if (caption && caption.trim()) {
    body.image.caption = caption.trim().slice(0, 1024);
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { error?: { message: string } };
    if (!res.ok) {
      console.error("WhatsApp image send error", res.status, data?.error?.message);
      return { ok: false, error: data?.error?.message };
    }
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Error enviando imagen WhatsApp:", msg);
    return { ok: false, error: msg };
  }
}
