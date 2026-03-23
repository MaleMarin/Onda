import crypto from "crypto";
import { recordError } from "../../../lib/auditStore";
import { generateImageFromText } from "../../../lib/generateImage";
import { renderInfographicPng } from "../../../lib/infographic";
import { getGuideImageBuffer } from "../../../lib/guides";
import { getOndaReply, getOndaReplyWithImage } from "../../../lib/ondaReply";
import { parseResponseFormat, wantsSources } from "../../../lib/responseFormat";
import { transcribeAudio } from "../../../lib/transcribe";
import { generateSpeech } from "../../../lib/tts";
import {
  getWhatsAppMediaAsBase64,
  sendWhatsAppAudio,
  sendWhatsAppImage,
  sendWhatsAppText,
} from "../../../lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isDev = process.env.NODE_ENV === "development";

function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET;
  if (!appSecret) {
    if (process.env.VERCEL_ENV === "production") {
      console.warn("⚠️ WHATSAPP_APP_SECRET (o META_APP_SECRET) no configurado en producción. Configúralo para verificar la firma del webhook.");
    }
    return true; // skip verification when secret not set (evitar romper entornos sin configurar)
  }
  if (!signatureHeader) return false;
  const [algo, sig] = signatureHeader.split("=");
  if (algo !== "sha256" || !sig) return false;
  const expected = crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  return crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
}

/**
 * Webhook de WhatsApp - Versión limpia y simple
 * 
 * GET: Verificación del webhook (Meta requiere esto para suscribirse)
 * POST: Recibe mensajes de WhatsApp y responde usando ONDA
 */

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  // Meta envía estos parámetros para verificar el webhook
  if (mode === "subscribe" && token && challenge && verifyToken && token === verifyToken) {
    if (isDev) console.log("✅ Webhook verificado correctamente");
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // Si no es una verificación, mostrar diagnóstico
  if (!mode && !token) {
    return new Response(
      JSON.stringify(
        {
          status: "ONDA WhatsApp Bot",
          message: "Webhook funcionando correctamente",
          url: "Usa esta URL en Meta: " + new URL(req.url).origin + "/api/webhook",
          env_check: {
            WHATSAPP_VERIFY_TOKEN: !!process.env.WHATSAPP_VERIFY_TOKEN,
            WHATSAPP_ACCESS_TOKEN: !!process.env.WHATSAPP_ACCESS_TOKEN,
            WHATSAPP_PHONE_NUMBER_ID: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
            WHATSAPP_APP_SECRET_OR_META_APP_SECRET: !!(process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET),
            OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
          },
          security_note: "En producción configura WHATSAPP_APP_SECRET (o META_APP_SECRET) para verificar la firma del webhook.",
        },
        null,
        2
      ),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  console.error("❌ Verificación fallida");
  return new Response("Forbidden", { status: 403 });
}

export async function POST(req: Request) {
  // Log siempre (para ver en Vercel si Meta está llamando)
  console.log("[webhook] POST recibido");
  try {
    let payload: any;
    let rawBody: string;
    try {
      const contentType = req.headers.get("content-type") || "";
      rawBody = await req.text();
      if (!verifyWebhookSignature(rawBody, req.headers.get("x-hub-signature-256"))) {
        console.error("❌ Firma de webhook inválida");
        return new Response("Forbidden", { status: 403 });
      }
      if (rawBody && (contentType.includes("application/json") || rawBody.trim().startsWith("{"))) {
        payload = JSON.parse(rawBody);
      } else {
        payload = {};
      }
    } catch {
      if (isDev) console.log("📩 Webhook: body vacío o no JSON");
      return new Response("OK", { status: 200 });
    }

    if (isDev) console.log("📩 Webhook recibido:", JSON.stringify(payload, null, 2));

    // Extraer mensajes del payload de WhatsApp
    const entries = payload?.entry || [];
    if (!entries.length) {
      console.log("[webhook] Sin entries (status u otro evento)");
      return new Response("OK", { status: 200 });
    }

    for (const entry of entries) {
      const changes = entry?.changes || [];
      for (const change of changes) {
        const value = change?.value;
        if (!value) continue;

        // Ignorar solo status updates
        if (value.statuses && Array.isArray(value.statuses) && value.statuses.length > 0) {
          if (isDev) console.log("ℹ️ Status update ignorado");
          continue;
        }

        const messages = value?.messages || [];
        if (messages.length) console.log("[webhook] Mensaje(s) a procesar:", messages.length);
        for (const msg of messages) {
          const from = msg?.from;
          const text = msg?.text?.body;
          const type = msg?.type;
          const direction = msg?.direction;
          const imageId = msg?.image?.id;
          const audioId = msg?.audio?.id;

          const isOutbound = direction === "outbound";
          if (!from || isOutbound) continue;

          let response: string | null = null;

          const userMessageForFormat = (text || "").trim() || (type === "audio" ? "(mensaje de voz)" : "");
          const includeSources = wantsSources(userMessageForFormat);

          // 1) Imagen: descargar → GPT-4o-mini visión
          if (type === "image" && imageId) {
            if (isDev) console.log(`🖼️ Imagen recibida de ${from}`);
            try {
              const media = await getWhatsAppMediaAsBase64(imageId, "image/jpeg");
              if (media?.dataUrl) {
                response = await getOndaReplyWithImage(
                  text?.trim() || "¿Qué ves en esta imagen? Responde según ONDA.",
                  media.dataUrl,
                  null,
                  null,
                  includeSources,
                  "whatsapp"
                );
              } else {
                response = "No pude procesar la imagen. ¿Puedes enviarla de nuevo?";
              }
            } catch (err) {
              console.error("❌ Error procesando imagen:", err);
              response = "Uy, falló el análisis de la imagen. Intenta en un ratito.";
            }
          }
          // 2) Audio: descargar → Whisper → texto → ONDA
          else if (type === "audio" && audioId) {
            if (isDev) console.log(`🎤 Audio recibido de ${from}`);
            try {
              const media = await getWhatsAppMediaAsBase64(audioId, "audio/ogg");
              if (media?.dataUrl) {
                const transcribed = await transcribeAudio(media.dataUrl);
                const userMessage = transcribed || "(no se pudo transcribir el audio)";
                response = await getOndaReply(userMessage, null, null, wantsSources(userMessage), null, "whatsapp");
              } else {
                response = "No pude descargar el audio. ¿Puedes enviar un mensaje de texto?";
              }
            } catch (err) {
              console.error("❌ Error procesando audio:", err);
              await recordError({
                source: "whatsapp",
                userMessage: "(audio)",
                error: err instanceof Error ? err.message : String(err),
              });
              response = "No pude transcribir el audio. ¿Me lo escribes por texto?";
            }
          }
          // 3) Texto
          else if (text && (type === "text" || !type)) {
            if (isDev) console.log(`💬 Mensaje recibido de ${from}: ${text}`);
            try {
              response = await getOndaReply(text, null, null, includeSources, null, "whatsapp");
            } catch (err) {
              console.error("❌ Error procesando mensaje:", err);
            }
          }

          if (response) {
            const parsed = parseResponseFormat(response);
            try {
              if (isDev) console.log(`🤖 Respuesta formato=${parsed.formato}: ${parsed.text.substring(0, 80)}...`);
              const textResult = await sendWhatsAppText(from, parsed.text);
              if (textResult.ok) {
                if (isDev) console.log("✅ Respuesta (texto) enviada correctamente");
              } else {
                console.error("❌ Error al enviar texto:", textResult.error);
              }

              if (parsed.formato === "audio" && parsed.text.length <= 4000) {
                try {
                  const audioBuffer = await generateSpeech(parsed.text);
                  const audioResult = await sendWhatsAppAudio(from, audioBuffer);
                  if (audioResult.ok && isDev) console.log("✅ Respuesta (voz) enviada");
                  else console.error("❌ Error al enviar voz:", audioResult.error);
                } catch (voiceErr) {
                  console.error("❌ Error generando/enviando voz:", voiceErr);
                }
              }

              if (parsed.formato === "infografia" && parsed.infographicPayload) {
                try {
                  const result = await renderInfographicPng(parsed.infographicPayload, null);
                  if (result.ok) {
                    const caption = parsed.text.slice(0, 200).trim();
                    const imgResult = await sendWhatsAppImage(
                      from,
                      result.buffer,
                      "image/png",
                      caption || undefined
                    );
                    if (imgResult.ok && isDev) console.log("✅ Infografía PNG enviada");
                    else console.error("❌ Error al enviar infografía:", imgResult.error);
                  }
                } catch (imgErr) {
                  console.error("❌ Error generando/enviando infografía:", imgErr);
                }
              } else if (parsed.formato === "imagen") {
                try {
                  const imgGen = await generateImageFromText(parsed.text);
                  if (imgGen.ok) {
                    const imgResult = await sendWhatsAppImage(
                      from,
                      imgGen.buffer,
                      "image/png",
                      undefined
                    );
                    if (imgResult.ok && isDev) console.log("✅ Imagen generada enviada");
                    else console.error("❌ Error al enviar imagen generada:", imgResult.error);
                  }
                } catch (imgErr) {
                  console.error("❌ Error generando/enviando imagen:", imgErr);
                }
              }

              if (parsed.guideId) {
                const guide = await getGuideImageBuffer(parsed.guideId);
                if (guide) {
                  const imgResult = await sendWhatsAppImage(
                    from,
                    guide.buffer,
                    guide.mimeType,
                    undefined
                  );
                  if (imgResult.ok && isDev) console.log("✅ Guía (imagen) enviada");
                  else console.error("❌ Error al enviar imagen:", imgResult.error);
                }
              }
            } catch (error) {
              console.error("❌ Error enviando respuesta:", error);
              await recordError({
                source: "whatsapp",
                userMessage: text?.trim() ?? (type === "audio" ? "(audio)" : "(imagen)"),
                botResponse: response ?? undefined,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          } else {
            if (isDev) console.log("⏭️ Mensaje ignorado", { from, type, direction });
          }
        }
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("❌ Error en webhook:", error);
    return new Response("OK", { status: 200 });
  }
}
