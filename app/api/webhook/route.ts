import { recordConversation, recordError, recordUsage } from "../../../lib/auditStore";
import { recordConversationImpact } from "../../../lib/impactMetrics";
import { generateImageFromText } from "../../../lib/generateImage";
import { renderInfographicPng } from "../../../lib/infographic";
import {
  altTextForWhatsApp,
  infographicAltWhatsAppPrefix,
  type InfographicLocale,
} from "../../../lib/infographicPayload";
import { getGuideImageBuffer } from "../../../lib/guides";
import { classifyIntent } from "../../../lib/intentClassifier";
import { getOndaReply, getOndaReplyWithImage } from "../../../lib/ondaReply";
import { computeRiskPipelineFlags, detectEmergencyKeywords } from "../../../lib/riskModes";
import {
  buildMemoryContextBlock,
  buildSessionSummary,
  getSessionSummary,
  saveSessionSummary,
} from "../../../lib/sessionMemory";
import { inferChatLocaleFromMessage } from "../../../lib/inferChatLocale";
import { computeWebPlayAudioDecision } from "../../../lib/playAudioContract";
import { parseResponseFormat, wantsSources } from "../../../lib/responseFormat";
import { detectTransparencyRequest } from "../../../lib/transparencyMode";
import {
  mergePrefs,
  normalizePrefs,
  parsePreferenceCommand,
  pickPreferenceAck,
} from "../../../lib/userPrefs";
import { DEFAULT_ONDA_USER_PREFERENCES, mergeOndaUserPreferences } from "../../../lib/userPreferences";
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
import { randomUUID } from "crypto";
import { recordEvent } from "@/lib/insightsTelemetry";
import {
  buildHeuristicSummarySafe,
  buildRiskFlagsForTelemetry,
  detectIntentType,
  detectTopicTags,
  userRequestedTelemetryOptOut,
} from "../../../lib/insightsTagger";
import {
  inferContentType,
  localeBucketFromUnified,
  mapFormatoToOutputFormat,
  verbosityFromUnified,
} from "@/lib/insightsTurnHelpers";
import { buildListeningInvitePayload } from "../../../lib/onda/contributions/web";
import { ejeOndaToContributionSlug } from "../../../lib/onda/contributions/types";
import { saveOndaContribution } from "../../../lib/onda/contributions/saveContribution";
import {
  isShortAcknowledgement,
  looksLikeContributionFollowUp,
  looksLikeNewStandaloneQuestion,
  suggestContributionTypeFromText,
} from "../../../lib/onda/contributions/extractContributionMetadata";
import type { OndaChatLocale } from "../../../lib/userPreferences";
import { DEFAULT_USER_PREFS } from "../../../lib/userPrefs";
import { parseWaInclusiveCommand } from "../../../lib/waInclusivePreferences";
import { formatWebhookPostBlockedMessage, getWhatsAppEnvReport } from "../../../lib/waWebhookEnv";
import { WA_AUDIO_TRANSCRIBING_ACK } from "../../../content/shared";
import { EjeOnda } from "../../../content/types";
import {
  alignWaSessionAfterModelTurn,
  appendWaHistory,
  applyLanguageAndFormatFromText,
  buildWaModelPreferences,
  consumeWaEjeCommand,
  getSession,
  maybeInfographicHint,
  ondaPrefsToWaPrefsPatch,
  responseWhenEjeMissing,
  responseWhenVagueIntent,
  setSession,
  waEjeToEnum,
  waHistoryToOndaHistory,
  type WaSession,
} from "../../../lib/waSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isDev = process.env.NODE_ENV === "development";

/** Límite de caracteres enviados al TTS en WhatsApp (calidad y coste). */
const WA_TTS_CHAR_LIMIT = 1500;

const WA_IMAGE_VALIDATION_REPLY =
  "No pude leer esa imagen. ¿Podés enviarla en JPG, PNG o WebP de menos de 5MB?";

const WA_AUDIO_TOO_LONG_REPLY =
  "Ese audio es demasiado largo para que lo procese. El máximo es 2 minutos, ¿podés recortarlo?";

const WA_TECHNICAL_REPLY_PT =
  "Tive um problema técnico agora. Pode tentar de novo? Se preferir, escreva em 1 frase o que você precisa.";

function sttLangFromSession(session: WaSession, text: string): "pt" | "es" {
  if (session.prefs.locale === "pt") return "pt";
  if (session.prefs.locale === "es") return "es";
  const loc = inferChatLocaleFromMessage(text, "es-LATAM");
  return loc === "es-LATAM" ? "es" : "pt";
}

function sessionHistoryForSummary(session: WaSession): Array<{ role: "user" | "model"; content: string }> {
  return session.history.map((m) => ({
    role: m.role === "assistant" ? ("model" as const) : ("user" as const),
    content: m.content,
  }));
}

function impactEjeFromSession(s: WaSession | null | undefined): EjeOnda {
  return waEjeToEnum(s?.eje ?? null) ?? EjeOnda.A_MANO;
}

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

          let memoryBlock = "";
          if (from && from !== "unknown") {
            const prevSummary = await getSessionSummary("wa", from);
            if (prevSummary) {
              memoryBlock = buildMemoryContextBlock(prevSummary);
            }
          }

          const locked = await withLock<{
            response: string | null;
            waUserTurn: string;
            nextWaState: WaSession | null;
          }>(from, async () => {
            let session = await getSession(from);
            if (session.contributionInviteContext) {
              const sent = session.contributionInviteContext.sentAt;
              if (Date.now() - sent > 30 * 60 * 1000) {
                session = { ...session, contributionInviteContext: undefined };
              }
            }
            if (textBody && (type === "text" || !type)) {
              const ctx0 = session.contributionInviteContext;
              if (ctx0) {
                if (isShortAcknowledgement(textBody)) {
                  session = { ...session, contributionInviteContext: undefined };
                } else if (looksLikeNewStandaloneQuestion(textBody)) {
                  session = { ...session, contributionInviteContext: undefined };
                } else if (looksLikeContributionFollowUp(textBody)) {
                  const ctype = ctx0.suggestedContributionType ?? suggestContributionTypeFromText(textBody);
                  try {
                    await saveOndaContribution({
                      channel: "whatsapp",
                      eje: ctx0.ejeSlug,
                      conversationId: from,
                      turnToken: ctx0.turnToken,
                      userQuestion: ctx0.userEcho,
                      assistantResponseSummary: ctx0.assistantSummary,
                      contributionText: textBody.trim(),
                      contributionType: ctype,
                      topic: ctx0.topicHint || undefined,
                      tags: ctx0.topicHint ? [ctx0.topicHint] : undefined,
                      locale: ctx0.locale,
                    });
                  } catch (ce) {
                    console.warn("[wa/contribution] save failed:", ce);
                  }
                  session = { ...session, contributionInviteContext: undefined };
                }
              }
            }
            let response: string | null = null;
            let waUserTurn = "";
            let nextWaState: WaSession | null = null;

            type PipelineOpts = { imageDataUrl?: string };

            const runWaTextPipeline = async (
              rawIncoming: string,
              opts: PipelineOpts = {}
            ): Promise<{ ok: boolean }> => {
              const trimmedIn = rawIncoming.trim();
              const txCmd = parseWaInclusiveCommand(from, trimmedIn, {
                basePrefs: buildWaModelPreferences(session, trimmedIn, null),
              });
              if (txCmd.helpReply) await sendWhatsAppText(from, txCmd.helpReply);
              if (!txCmd.outgoingText.trim()) {
                session = {
                  ...session,
                  ondaMerged: txCmd.prefs,
                  prefs: { ...session.prefs, ...ondaPrefsToWaPrefsPatch(txCmd.prefs) },
                };
                waUserTurn = trimmedIn;
                nextWaState = session;
                return { ok: true };
              }
              const rawAfter = txCmd.outgoingText.trim();
              session = {
                ...session,
                ondaMerged: txCmd.prefs,
                prefs: { ...session.prefs, ...ondaPrefsToWaPrefsPatch(txCmd.prefs) },
              };
              const purePref = parsePreferenceCommand(rawAfter, normalizePrefs(session.prefs));
              if (purePref) {
                const merged = mergePrefs(session.prefs, purePref.patch);
                session = { ...session, prefs: merged, updatedAt: Date.now() };
                const ack = pickPreferenceAck(merged, purePref.ackText, session.ondaMerged?.locale);
                waUserTurn = trimmedIn;
                nextWaState = appendWaHistory(session, trimmedIn, ack);
                response = ack;
                return { ok: true };
              }
              /** Comando puro transparência / transparencia — marca el siguiente turno; sin LLM. */
              if (/^transpar[eê]ncia$/i.test((rawAfter || "").trim())) {
                const baseOm = mergeOndaUserPreferences(
                  DEFAULT_ONDA_USER_PREFERENCES,
                  session.ondaMerged ?? {}
                );
                session = {
                  ...session,
                  ondaMerged: mergeOndaUserPreferences(baseOm, { transparencyNext: true }),
                  updatedAt: Date.now(),
                };
                const ack =
                  session.prefs.locale === "es"
                    ? "Ok. En el próximo mensaje explico la base de la respuesta."
                    : "Ok. No próximo envio eu explico a base da resposta.";
                waUserTurn = trimmedIn;
                nextWaState = appendWaHistory(session, trimmedIn, ack);
                response = ack;
                return { ok: true };
              }
              session = applyLanguageAndFormatFromText(session, rawAfter);
              const ejeHit = consumeWaEjeCommand(rawAfter, session);
              session = ejeHit.session;
              if (ejeHit.confirmation && !ejeHit.remainder) {
                waUserTurn = rawAfter;
                nextWaState = appendWaHistory(session, rawAfter, ejeHit.confirmation);
                response = ejeHit.confirmation;
                return { ok: true };
              }
              let userLine = (ejeHit.remainder || rawAfter).trim();
              userLine = maybeInfographicHint(session, userLine);
              if (!userLine.trim()) {
                waUserTurn = rawAfter;
                nextWaState = session;
                return { ok: true };
              }
              const safe = checkUserMessage(userLine);
              if (!safe.safe && safe.response) {
                await sendWhatsAppText(from, safe.response);
                waUserTurn = "";
                nextWaState = null;
                response = null;
                return { ok: false };
              }
              const riskLoc = session.prefs.locale === "es" ? "es" : "pt";
              if (detectEmergencyKeywords(userLine, riskLoc)) {
                session = {
                  ...session,
                  eje: session.eje ?? "A_MANO",
                  updatedAt: Date.now(),
                };
              }
              const gate = responseWhenEjeMissing(session, userLine);
              if (gate) {
                waUserTurn = rawAfter;
                nextWaState = appendWaHistory(gate.session, rawAfter, gate.text);
                response = gate.text;
                return { ok: true };
              }
              const vague = responseWhenVagueIntent(session, userLine);
              if (vague) {
                waUserTurn = rawAfter;
                nextWaState = appendWaHistory(vague.session, rawAfter, vague.text);
                response = vague.text;
                return { ok: true };
              }
              const prefsForModel = buildWaModelPreferences(session, userLine, null);
              const oneShotTransparency = session.ondaMerged?.transparencyNext === true;
              const transparencyForTurn =
                oneShotTransparency || detectTransparencyRequest(userLine, prefsForModel.locale)
                  ? true
                  : undefined;
              const riskPipeline = computeRiskPipelineFlags(
                userLine,
                Boolean(opts.imageDataUrl),
                waEjeToEnum(session.eje),
                prefsForModel.locale
              );
              const includeSources =
                session.prefs.sources || wantsSources(rawAfter) || wantsSources(userLine);
              waUserTurn = rawAfter;
              try {
                if (opts.imageDataUrl) {
                  response = await getOndaReplyWithImage(
                    userLine,
                    opts.imageDataUrl,
                    waEjeToEnum(session.eje),
                    waHistoryToOndaHistory(session),
                    includeSources,
                    "whatsapp",
                    undefined,
                    memoryBlock || undefined,
                    telemetryWa,
                    prefsForModel,
                    riskPipeline,
                    normalizePrefs(session.prefs),
                    transparencyForTurn
                  );
                } else {
                  response = await getOndaReply(
                    userLine,
                    waEjeToEnum(session.eje),
                    waHistoryToOndaHistory(session),
                    includeSources,
                    null,
                    "whatsapp",
                    undefined,
                    memoryBlock || undefined,
                    telemetryWa,
                    prefsForModel,
                    riskPipeline,
                    normalizePrefs(session.prefs),
                    transparencyForTurn
                  );
                }
              } catch (err) {
                await recordError({
                  source: "whatsapp",
                  userMessage: userLine,
                  error: err instanceof Error ? err.message : String(err),
                });
                response = WA_TECHNICAL_REPLY_PT;
              }
              const parsedLocal = parseResponseFormat(response);
              let aligned = alignWaSessionAfterModelTurn(session, prefsForModel);
              if (oneShotTransparency) {
                aligned = {
                  ...aligned,
                  ondaMerged: mergeOndaUserPreferences(
                    aligned.ondaMerged ?? DEFAULT_ONDA_USER_PREFERENCES,
                    { transparencyNext: false }
                  ),
                };
              }
              nextWaState = appendWaHistory(aligned, rawAfter, parsedLocal.text);
              return { ok: true };
            };

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
                      return { response: null, waUserTurn: "", nextWaState: null };
                    }
                    const caption = (text || "").trim();
                    if (caption) {
                      const imgSafe = checkUserMessage(caption);
                      if (!imgSafe.safe && imgSafe.response) {
                        await sendWhatsAppText(from, imgSafe.response);
                        return { response: null, waUserTurn: "", nextWaState: null };
                      }
                    }
                    const imgPrompt = text?.trim() || "¿Qué ves en esta imagen? Responde según ONDA.";
                    await runWaTextPipeline(imgPrompt, { imageDataUrl: media.dataUrl });
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
                      return { response: null, waUserTurn: "", nextWaState: null };
                    }
                    if (session.history.length === 0) {
                      await sendWhatsAppText(from, WA_AUDIO_TRANSCRIBING_ACK);
                    }
                    const sttLang = sttLangFromSession(session, "");
                    const transcribed = await transcribeAudio(media.dataUrl, { language: sttLang });
                    const userMessage = transcribed || "(no se pudo transcribir el audio)";
                    const audioSafe = checkUserMessage(userMessage);
                    if (!audioSafe.safe && audioSafe.response) {
                      await sendWhatsAppText(from, audioSafe.response);
                      return { response: null, waUserTurn: "", nextWaState: null };
                    }
                    await runWaTextPipeline(userMessage);
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
              await runWaTextPipeline(text.trim());
            }

            return { response, waUserTurn, nextWaState };
          });

          if (locked === null) {
            console.warn(`[queue] mensaje ignorado por lock activo: ${from}`);
            continue;
          }

          const { response, waUserTurn, nextWaState } = locked;

          if (nextWaState && from && from !== "unknown") {
            await setSession(from, nextWaState);
          }

          if (response) {
            const parsed = parseResponseFormat(response, {
              infographic: {
                locale: nextWaState?.prefs.locale === "es" ? "es" : "pt",
                elderFriendly: nextWaState?.ondaMerged?.readingMode === "easy",
                eje: waEjeToEnum(nextWaState?.eje ?? null),
              },
            });
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

              const audioDecision = computeWebPlayAudioDecision({
                outputMode: nextWaState?.ondaMerged?.outputMode ?? "text",
                userMessage: waUserTurn || "",
                parsed,
              });
              if (audioDecision.play && parsed.text.trim().length > 0) {
                try {
                  const ttsText = parsed.text.slice(0, WA_TTS_CHAR_LIMIT);
                  const audioBuffer = await generateSpeech(ttsText);
                  const audioResult = await sendWhatsAppAudio(from, audioBuffer);
                  if (audioResult.ok && isDev) console.log("✅ Respuesta (voz) enviada");
                  else console.error("❌ Error al enviar voz:", audioResult.error);
                } catch (voiceErr) {
                  console.error("❌ Error generando/enviando voz:", voiceErr);
                }
              }

              if (parsed.formato === "infografia" && parsed.infographicPayload) {
                try {
                  const result = await renderInfographicPng(
                    parsed.infographicPayload,
                    waEjeToEnum(nextWaState?.eje ?? null)
                  );
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
                    const igLocale: InfographicLocale =
                      nextWaState?.prefs.locale === "es" ? "es" : "pt";
                    const altPack = altTextForWhatsApp(parsed.infographicPayload.altText, igLocale);
                    const altResult = await sendWhatsAppText(
                      from,
                      `${infographicAltWhatsAppPrefix(igLocale)}${altPack.text}`
                    );
                    if (!altResult.ok && isDev) {
                      console.error("❌ Error al enviar texto alternativo:", altResult.error);
                    }
                  } else {
                    await sendWhatsAppText(
                      from,
                      result.error ||
                        "Não foi possível gerar a infografia agora. Posso enviar em texto se quiser."
                    );
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
            const impactEje = impactEjeFromSession(nextWaState);
            const p = nextWaState?.prefs ?? DEFAULT_USER_PREFS;
            const ondaLoc: OndaChatLocale =
              (nextWaState?.ondaMerged?.locale as OndaChatLocale | undefined) ??
              (p.locale === "pt" ? "pt-BR" : "es-LATAM");
            const waTelemetrySkip =
              (await isOptedOut(from)) ||
              !waUserTurn.trim() ||
              userRequestedTelemetryOptOut(waUserTurn) ||
              typeof response !== "string";
            if (!waTelemetrySkip) {
              const riskWa = computeRiskPipelineFlags(
                waUserTurn,
                type === "image",
                impactEje,
                ondaLoc
              );
              const hasLinkWa = /\bhttps?:\/\//i.test(waUserTurn);
              const tranWa = detectTransparencyRequest(waUserTurn, ondaLoc);
              const dtWa = detectIntentType({
                userText: waUserTurn,
                conversationIntent: waIntentRecorded.intent,
                hasLink: hasLinkWa,
                hasImage: type === "image",
                hasAudio: type === "audio",
                transparency: tranWa,
                risk: riskWa,
                locale: ondaLoc,
              });
              const rfWa = buildRiskFlagsForTelemetry(riskWa, waUserTurn, ondaLoc);
              const tagsWa = detectTopicTags(
                waUserTurn,
                impactEje,
                rfWa,
                hasLinkWa,
                type === "image",
                type === "audio"
              );
              const parsedWa = parseResponseFormat(response);
              void recordEvent({
                timestamp: new Date().toISOString(),
                channel: "whatsapp",
                locale: localeBucketFromUnified(p),
                eje: impactEje,
                detected_intent: dtWa,
                content_type: inferContentType(waUserTurn, type === "image", type === "audio"),
                output_format: mapFormatoToOutputFormat(parsedWa.formato),
                verbosity: verbosityFromUnified(p),
                sources_requested: Boolean(p.sources || wantsSources(waUserTurn)),
                risk_flags: rfWa,
                outcome: "ok",
                turn_stats: {
                  user_chars: waUserTurn.length,
                  assistant_chars: response.length,
                  latency_ms: Date.now() - messageStart,
                },
                tags: tagsWa,
                summary_safe: buildHeuristicSummarySafe({
                  detectedIntent: dtWa,
                  contentType: inferContentType(waUserTurn, type === "image", type === "audio"),
                  eje: impactEje,
                }),
                lifecycle: "end",
                request_id: requestId,
              }).catch(() => {});
            }

            if (
              typeof response === "string" &&
              waUserTurn.trim() &&
              parsed.text.trim() &&
              !(await isOptedOut(from)) &&
              !userRequestedTelemetryOptOut(waUserTurn)
            ) {
              const riskListen = computeRiskPipelineFlags(
                waUserTurn,
                type === "image",
                impactEje,
                ondaLoc
              );
              const hasLinkL = /\bhttps?:\/\//i.test(waUserTurn);
              const tranL = detectTransparencyRequest(waUserTurn, ondaLoc);
              const dtL = detectIntentType({
                userText: waUserTurn,
                conversationIntent: waIntentRecorded.intent,
                hasLink: hasLinkL,
                hasImage: type === "image",
                hasAudio: type === "audio",
                transparency: tranL,
                risk: riskListen,
                locale: ondaLoc,
              });
              const rfL = buildRiskFlagsForTelemetry(riskListen, waUserTurn, ondaLoc);
              let sInvite: WaSession | null = nextWaState;
              if (from && from !== "unknown") {
                sInvite = await getSession(from);
              }
              const rawPending = sInvite?.contributionInviteContext;
              const pendingFresh =
                rawPending && Date.now() - rawPending.sentAt <= 30 * 60 * 1000 ? rawPending : undefined;
              const alreadyInvitedInConversation = Boolean(pendingFresh);
              const inviteWa = buildListeningInvitePayload({
                channel: "whatsapp",
                locale: ondaLoc,
                userText: waUserTurn,
                assistantText: parsed.text.trim(),
                conversationIntent: waIntentRecorded.intent,
                detectedIntent: dtL,
                riskPipeline: riskListen,
                riskScamTelemetry: rfL.scam,
                riskSensitiveTelemetry: rfL.sensitive,
                eje: impactEje,
                turnToken: randomUUID(),
                alreadyInvitedInConversation,
              });
              if (inviteWa?.show) {
                await new Promise((r) => setTimeout(r, 450));
                const inviteParts = splitForWhatsApp(inviteWa.prompt);
                for (let ii = 0; ii < inviteParts.length; ii++) {
                  const tr = await sendWhatsAppText(from, inviteParts[ii]);
                  if (!tr.ok) break;
                  if (ii < inviteParts.length - 1) {
                    await new Promise((r) => setTimeout(r, 320));
                  }
                }
              }
              if (from && from !== "unknown") {
                const cur = await getSession(from);
                if (inviteWa?.show) {
                  await setSession(from, {
                    ...cur,
                    contributionInviteContext: {
                      turnToken: inviteWa.turnToken,
                      userEcho: inviteWa.userEcho,
                      assistantSummary: inviteWa.assistantSummary,
                      topicHint: inviteWa.topicHint,
                      locale: inviteWa.locale,
                      sentAt: Date.now(),
                      ejeSlug: ejeOndaToContributionSlug(impactEje),
                      ...(inviteWa.suggestedContributionType
                        ? { suggestedContributionType: inviteWa.suggestedContributionType }
                        : {}),
                    },
                  });
                } else if (cur.contributionInviteContext) {
                  await setSession(from, { ...cur, contributionInviteContext: undefined });
                }
              }
            }

            void recordConversationImpact({
              eje: impactEje,
              canal: "whatsapp",
              intent: waIntentRecorded.intent,
              responseMs: Date.now() - messageStart,
              cacheHit: false,
              userIdentifier: from || "unknown",
            }).catch(() => {});
            void recordUsage({
              event: "message_sent",
              eje: impactEje,
              sessionId: from && from !== "unknown" ? from : undefined,
              responseTimeMs: Date.now() - messageStart,
            }).catch(() => {});
            void recordConversation({
              sessionId: from && from !== "unknown" ? from : undefined,
              excerpt: `intent=${waIntentRecorded.intent};eje=${impactEje};canal=whatsapp`,
            }).catch(() => {});

            if (from && from !== "unknown" && waUserTurn) {
              const intentResult = classifyIntent(waUserTurn);
              const hist = nextWaState?.history?.length
                ? sessionHistoryForSummary(nextWaState)
                : [{ role: "user" as const, content: waUserTurn }];
              void saveSessionSummary(
                "wa",
                from,
                buildSessionSummary(hist, intentResult.intent, String(impactEje))
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
