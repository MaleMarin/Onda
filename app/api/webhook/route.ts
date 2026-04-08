import { recordConversation, recordError, recordUsage } from "../../../lib/auditStore";
import { recordConversationImpact } from "../../../lib/impactMetrics";
import { generateImageFromText } from "../../../lib/generateImage";
import { renderInfographicPng } from "../../../lib/infographic";
import { getGuideImageBuffer } from "../../../lib/guides";
import { classifyIntent } from "../../../lib/intentClassifier";
import { getOndaReply, getOndaReplyWithImage } from "../../../lib/ondaReply";
import {
  buildMemoryContextBlock,
  buildSessionSummary,
  getSessionSummary,
  saveSessionSummary,
} from "../../../lib/sessionMemory";
import { parseResponseFormat, wantsSources } from "../../../lib/responseFormat";
import { transcribeAudio } from "../../../lib/transcribe";
import { generateSpeech } from "../../../lib/tts";
import {
  getWhatsAppMediaAsBase64,
  sendWhatsAppAudio,
  sendWhatsAppImage,
  sendWhatsAppText,
  splitForWhatsApp,
} from "../../../lib/whatsapp";
import { withLock } from "../../../lib/waMessageQueue";
import { checkRateLimit } from "../../../lib/rateLimiter";
import { verifyWebhookSignature } from "../../../lib/verifyWebhookSignature";
import { checkUserMessage } from "../../../lib/promptSafety";
import {
  AUDIO_VALIDATION_TOO_LONG,
  bufferFromDataUrl,
  validateAudio,
  validateImage,
} from "../../../lib/validateMedia";
import {
  isFirstContact,
  isOptInMessage,
  isOptOutMessage,
  isOptedOut,
  isWindowActive,
  markAsSeen,
  renewMessageWindow,
  setOptIn,
  setOptOut,
  WA_FIRST_CONTACT_WELCOME,
  WA_OPTED_OUT_NOTICE,
  WA_OPT_IN_ACK,
  WA_OPT_OUT_ACK,
} from "../../../lib/waCompliance";
import { generateRequestId } from "../../../lib/telemetry";
import { parseWaInclusiveCommand } from "../../../lib/waInclusivePreferences";
import { formatWebhookPostBlockedMessage, getWhatsAppEnvReport } from "../../../lib/waWebhookEnv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isDev = process.env.NODE_ENV === "development";

const WA_IMAGE_VALIDATION_REPLY =
  "No pude leer esa imagen. ¿Podés enviarla en JPG, PNG o WebP de menos de 5MB?";

const WA_AUDIO_TOO_LONG_REPLY =
  "Ese audio es demasiado largo para que lo procese. El máximo es 2 minutos, ¿podés recortarlo?";

function extractWhatsAppSenderFromPayload(payload: unknown): string {
  try {
    const from = (
      payload as {
        entry?: Array<{
          changes?: Array<{ value?: { messages?: Array<{ from?: string }> } }>;
        }>;
      }
    )?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;
    if (typeof from === "string" && from.trim()) return from.trim();
  } catch {
    /* ignore */
  }
  return "unknown";
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
    const waReport = getWhatsAppEnvReport();
    const origin = new URL(req.url).origin;
    return new Response(
      JSON.stringify(
        {
          status: "ONDA WhatsApp Bot",
          message: "Diagnóstico del endpoint (GET). Para POST firmado revisá `whatsapp` y `health_url`.",
          url_webhook: `${origin}/api/webhook`,
          health_url: `${origin}/api/wa/health`,
          whatsapp: waReport,
          env_flags: {
            WHATSAPP_WEBHOOK_SECRET: !!process.env.WHATSAPP_WEBHOOK_SECRET?.trim(),
            WHATSAPP_VERIFY_TOKEN: !!process.env.WHATSAPP_VERIFY_TOKEN,
            WHATSAPP_ACCESS_TOKEN: !!process.env.WHATSAPP_ACCESS_TOKEN,
            WHATSAPP_PHONE_NUMBER_ID: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
            WHATSAPP_APP_SECRET_OR_META_APP_SECRET: !!(process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET),
            OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
          },
          documentation: {
            checklist_operativo: "docs/META-WHATSAPP-CHECKLIST.md",
            detalle_tecnico: "docs/WHATSAPP-OPERACION.md",
          },
          meta_vs_repo: {
            repo_must_provide: [
              "WHATSAPP_WEBHOOK_SECRET — firma de cada POST (x-hub-signature-256). Sin esto el servidor rechaza el cuerpo.",
              "WHATSAPP_ACCESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID — para enviar respuestas por la API de Meta.",
              "WHATSAPP_VERIFY_TOKEN — debe coincidir con el token que configurás al suscribir el webhook en Meta.",
            ],
            meta_must_provide: [
              "App de Meta + número de WhatsApp Business aprobado según sus políticas.",
              "URL pública HTTPS de este webhook y suscripción a eventos `messages`.",
              "Mismo secreto en Meta (App Secret / configuración de webhook) que en WHATSAPP_WEBHOOK_SECRET.",
            ],
          },
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
  const webhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    const report = getWhatsAppEnvReport();
    const body = formatWebhookPostBlockedMessage(report);
    console.error("[webhook] POST bloqueado:", report.missingForWebhookPost.join(", "));
    return new Response(
      JSON.stringify({
        error: "configuration",
        code: "MISSING_WHATSAPP_WEBHOOK_SECRET",
        message: body,
        missing: report.missingForWebhookPost,
        health_url_hint: "GET /api/wa/health para el informe completo.",
        documentation: { checklist: "docs/META-WHATSAPP-CHECKLIST.md" },
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      }
    );
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");
  if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
    console.error("❌ Firma de webhook inválida o ausente");
    return new Response(
      JSON.stringify({
        error: "unauthorized",
        code: "INVALID_WEBHOOK_SIGNATURE",
        message:
          "El header x-hub-signature-256 no coincide con el cuerpo. Revisá WHATSAPP_WEBHOOK_SECRET y que el proxy no altere el body. Checklist: docs/META-WHATSAPP-CHECKLIST.md",
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      }
    );
  }

  console.log("[webhook] POST recibido");
  try {
    let payload: any;
    try {
      const contentType = req.headers.get("content-type") || "";
      if (rawBody && (contentType.includes("application/json") || rawBody.trim().startsWith("{"))) {
        payload = JSON.parse(rawBody);
      } else {
        payload = {};
      }
    } catch {
      if (isDev) console.log("📩 Webhook: body vacío o no JSON");
      return new Response("OK", { status: 200 });
    }

    const waSender = extractWhatsAppSenderFromPayload(payload);
    const waRl = await checkRateLimit(waSender, "wa", 20, 60);
    if (!waRl.allowed) {
      return new Response(
        JSON.stringify({
          error: "Demasiadas solicitudes. Esperá un momento antes de escribir de nuevo.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Remaining": String(waRl.remaining),
            "X-RateLimit-Reset": String(waRl.resetInSeconds),
          },
        }
      );
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
          const messageStart = Date.now();
          const from = msg?.from;
          const text = msg?.text?.body;
          const type = msg?.type;
          const direction = msg?.direction;
          const imageId = msg?.image?.id;
          const audioId = msg?.audio?.id;

          const isOutbound = direction === "outbound";
          if (!from || isOutbound) continue;

          const requestId = generateRequestId("wa");
          const probeForIntent =
            (typeof text === "string" && text.trim()) ||
            (type === "audio" ? "(audio)" : type === "image" ? "(imagen)" : "") ||
            " ";
          const waLogIntent = classifyIntent(probeForIntent).intent;
          console.info(`[${requestId}] webhook mensaje from=${from} intent=${waLogIntent}`);
          const telemetryWa = { requestId, canal: "wa" as const };

          const textBody = typeof text === "string" ? text.trim() : "";

          if (from !== "unknown") {
            await renewMessageWindow(from);

            if (textBody && isOptOutMessage(textBody)) {
              await setOptOut(from);
              await sendWhatsAppText(from, WA_OPT_OUT_ACK);
              continue;
            }

            if (await isOptedOut(from)) {
              if (textBody && isOptInMessage(textBody)) {
                await setOptIn(from);
                await sendWhatsAppText(from, WA_OPT_IN_ACK);
              } else {
                await sendWhatsAppText(from, WA_OPTED_OUT_NOTICE);
                continue;
              }
            }

            const windowOk = await isWindowActive(from);
            if (!windowOk) {
              console.warn(
                "[waCompliance] Ventana de 24 h inactiva para este número; fuera de ventana Meta solo permite plantillas aprobadas (envío libre no implementado aquí)."
              );
            }

            if (await isFirstContact(from)) {
              await sendWhatsAppText(from, WA_FIRST_CONTACT_WELCOME);
              await markAsSeen(from);
            }
          }

          const userMessageForFormat = (text || "").trim() || (type === "audio" ? "(mensaje de voz)" : "");
          const includeSources = wantsSources(userMessageForFormat);

          let memoryBlock = "";
          if (from && from !== "unknown") {
            const prevSummary = await getSessionSummary("wa", from);
            if (prevSummary) {
              memoryBlock = buildMemoryContextBlock(prevSummary);
            }
          }

          const locked = await withLock(from, async () => {
            let response: string | null = null;
            let waUserTurn = "";

            // 1) Imagen: descargar → GPT-4o-mini visión
            if (type === "image" && imageId) {
              if (isDev) console.log(`🖼️ Imagen recibida de ${from}`);
              try {
                const media = await getWhatsAppMediaAsBase64(imageId, "image/jpeg");
                if (media?.dataUrl) {
                  const imgBuf = bufferFromDataUrl(media.dataUrl);
                  if (!imgBuf) {
                    response = "No pude procesar la imagen. ¿Puedes enviarla de nuevo?";
                  } else {
                    const iv = await validateImage(imgBuf);
                    if (!iv.valid) {
                      await sendWhatsAppText(from, WA_IMAGE_VALIDATION_REPLY);
                      return { response: null, waUserTurn: "" };
                    }
                    const caption = (text || "").trim();
                    if (caption) {
                      const imgSafe = checkUserMessage(caption);
                      if (!imgSafe.safe && imgSafe.response) {
                        await sendWhatsAppText(from, imgSafe.response);
                        return { response: null, waUserTurn: "" };
                      }
                    }
                    waUserTurn = text?.trim() || "¿Qué ves en esta imagen? Responde según ONDA.";
                    const imgCmd = parseWaInclusiveCommand(from, waUserTurn);
                    if (imgCmd.helpReply) await sendWhatsAppText(from, imgCmd.helpReply);
                    if (!imgCmd.outgoingText.trim()) {
                      return { response: null, waUserTurn: waUserTurn };
                    }
                    const imgText = imgCmd.outgoingText.trim();
                    response = await getOndaReplyWithImage(
                      imgText,
                      media.dataUrl,
                      null,
                      null,
                      includeSources,
                      "whatsapp",
                      undefined,
                      memoryBlock || undefined,
                      telemetryWa,
                      imgCmd.prefs
                    );
                  }
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
                  const audioBuf = bufferFromDataUrl(media.dataUrl);
                  if (!audioBuf) {
                    response = "No pude descargar el audio. ¿Puedes enviar un mensaje de texto?";
                  } else {
                    const av = await validateAudio(audioBuf);
                    if (!av.valid) {
                      const reply =
                        av.error === AUDIO_VALIDATION_TOO_LONG
                          ? WA_AUDIO_TOO_LONG_REPLY
                          : av.error ?? "No pude procesar ese audio.";
                      await sendWhatsAppText(from, reply);
                      return { response: null, waUserTurn: "" };
                    }
                    const transcribed = await transcribeAudio(media.dataUrl);
                    const userMessage = transcribed || "(no se pudo transcribir el audio)";
                    const audioSafe = checkUserMessage(userMessage);
                    if (!audioSafe.safe && audioSafe.response) {
                      await sendWhatsAppText(from, audioSafe.response);
                      return { response: null, waUserTurn: "" };
                    }
                    const auCmd = parseWaInclusiveCommand(from, userMessage);
                    if (auCmd.helpReply) await sendWhatsAppText(from, auCmd.helpReply);
                    if (!auCmd.outgoingText.trim()) {
                      return { response: null, waUserTurn: userMessage };
                    }
                    const audioText = auCmd.outgoingText.trim();
                    waUserTurn = audioText;
                    response = await getOndaReply(
                      audioText,
                      null,
                      null,
                      wantsSources(audioText),
                      null,
                      "whatsapp",
                      undefined,
                      memoryBlock || undefined,
                      telemetryWa,
                      auCmd.prefs
                    );
                  }
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
                const txCmd = parseWaInclusiveCommand(from, text.trim());
                if (txCmd.helpReply) await sendWhatsAppText(from, txCmd.helpReply);
                if (!txCmd.outgoingText.trim()) {
                  return { response: null, waUserTurn: text.trim() };
                }
                const textForOnda = txCmd.outgoingText.trim();
                const textSafe = checkUserMessage(textForOnda);
                if (!textSafe.safe && textSafe.response) {
                  await sendWhatsAppText(from, textSafe.response);
                  return { response: null, waUserTurn: "" };
                }
                waUserTurn = textForOnda;
                response = await getOndaReply(
                  textForOnda,
                  null,
                  null,
                  includeSources,
                  null,
                  "whatsapp",
                  undefined,
                  memoryBlock || undefined,
                  telemetryWa,
                  txCmd.prefs
                );
              } catch (err) {
                console.error("❌ Error procesando mensaje:", err);
              }
            }

            return { response, waUserTurn };
          });

          if (locked === null) {
            console.warn(`[queue] mensaje ignorado por lock activo: ${from}`);
            continue;
          }

          const { response, waUserTurn } = locked;

          if (response) {
            const parsed = parseResponseFormat(response);
            try {
              if (isDev) console.log(`🤖 Respuesta formato=${parsed.formato}: ${parsed.text.substring(0, 80)}...`);
              const parts = splitForWhatsApp(parsed.text);
              for (let pi = 0; pi < parts.length; pi++) {
                const textResult = await sendWhatsAppText(from, parts[pi]);
                if (textResult.ok) {
                  if (isDev) console.log("✅ Respuesta (texto) enviada correctamente");
                } else {
                  console.error("❌ Error al enviar texto:", textResult.error);
                }
                if (parts.length > 1 && pi < parts.length - 1) {
                  await new Promise((r) => setTimeout(r, 500));
                }
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

            const waIntentRecorded = classifyIntent(waUserTurn || textBody || " ");
            void recordConversationImpact({
              eje: "A_MANO",
              canal: "whatsapp",
              intent: waIntentRecorded.intent,
              responseMs: Date.now() - messageStart,
              cacheHit: false,
              userIdentifier: from || "unknown",
            }).catch(() => {});
            void recordUsage({
              event: "message_sent",
              eje: "A_MANO",
              sessionId: from && from !== "unknown" ? from : undefined,
              responseTimeMs: Date.now() - messageStart,
            }).catch(() => {});
            void recordConversation({
              sessionId: from && from !== "unknown" ? from : undefined,
              excerpt: `intent=${waIntentRecorded.intent};eje=A_MANO;canal=whatsapp`,
            }).catch(() => {});

            if (from && from !== "unknown" && waUserTurn) {
              const intentResult = classifyIntent(waUserTurn);
              void saveSessionSummary(
                "wa",
                from,
                buildSessionSummary(
                  [{ role: "user", content: waUserTurn }],
                  intentResult.intent,
                  "A_MANO"
                )
              ).catch((err) => console.warn("[memory/wa] error guardando sesión:", err));
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
