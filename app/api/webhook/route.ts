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
import { markMessageIfNew } from "../../../lib/waDedupe";
import { runInBackground } from "../../../lib/waBackground";
import { buildSafeWaLog, diagnosticAllowed, hashPhone, logWaError, logWaInfo, logWaWarn } from "../../../lib/waSafeLog";
import { listRequiredTemplates } from "../../../lib/waTemplates";
import { makeWindowAwareSender } from "../../../lib/waWindowGuard";

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

type WaPayloadValue = {
  messages?: Array<WaIncomingMessage>;
  statuses?: Array<{ id?: string; status?: string }>;
};

type WaIncomingMessage = {
  id?: string;
  from?: string;
  text?: { body?: string };
  type?: string;
  direction?: string;
  image?: { id?: string };
  audio?: { id?: string };
};

/**
 * Webhook de WhatsApp.
 *
 * GET: handshake de Meta para suscripción del webhook.
 * POST: recibe eventos, valida firma, deduplica por message.id y responde
 *       200 OK inmediato. El procesamiento (Whisper, OpenAI, TTS, envío) se
 *       ejecuta en background con `waitUntil` (si está disponible) o
 *       fire-and-forget como fallback.
 */

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === "subscribe" && token && challenge && verifyToken && token === verifyToken) {
    if (isDev) console.log("[wa] handshake verificado");
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // Diagnóstico: solo si no hay parámetros de handshake.
  if (!mode && !token) {
    // En producción, requerir header `x-onda-diag-token` para no exponer
    // topología ni presencia de secretos a terceros.
    if (!diagnosticAllowed(req)) {
      return new Response(
        JSON.stringify({
          status: "ok",
          message:
            "Diagnóstico restringido en producción. Use header `x-onda-diag-token` con el secreto configurado.",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
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
            WHATSAPP_BUSINESS_ACCOUNT_ID: !!process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
            WHATSAPP_APP_SECRET_OR_META_APP_SECRET:
              !!(process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET),
            OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
            KV_REST_API_URL: !!process.env.KV_REST_API_URL,
            KV_REST_API_TOKEN: !!process.env.KV_REST_API_TOKEN,
          },
          templates: listRequiredTemplates(),
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
              "Plantillas HSM aprobadas (onda_reactivacion / onda_bienvenida_optin / onda_aviso_servicio) para mensajes fuera de la ventana de 24 h.",
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

  console.error("[wa] handshake fallido");
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
    console.error("[wa] firma de webhook inválida o ausente");
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

  // ── Parseo mínimo. Errores → 200 OK (Meta no debe reintentar payloads inválidos). ──
  let payload: { entry?: Array<{ changes?: Array<{ value?: WaPayloadValue }> }> } = {};
  try {
    const contentType = req.headers.get("content-type") || "";
    if (rawBody && (contentType.includes("application/json") || rawBody.trim().startsWith("{"))) {
      payload = JSON.parse(rawBody);
    }
  } catch {
    if (isDev) console.log("[wa] body vacío o no JSON");
    return new Response("OK", { status: 200 });
  }

  // ── Rate limit por sender (KV INCR rápido). Si limita, registramos y respondemos 200. ──
  const waSender = extractWhatsAppSenderFromPayload(payload);
  const waRl = await checkRateLimit(waSender, "wa", 20, 60);
  if (!waRl.allowed) {
    logWaWarn("rate-limit excedido; mensaje descartado", {
      phone: waSender,
      extra: { remaining: waRl.remaining, resetInSeconds: waRl.resetInSeconds },
    });
    return new Response("OK", { status: 200 });
  }

  // ── Recolección de mensajes con dedupe por message.id (KV NX EX 24h). ──
  const entries = payload?.entry || [];
  const toProcess: Array<{ value: WaPayloadValue; msg: WaIncomingMessage }> = [];

  for (const entry of entries) {
    const changes = entry?.changes || [];
    for (const change of changes) {
      const value = change?.value;
      if (!value) continue;
      if (value.statuses && Array.isArray(value.statuses) && value.statuses.length > 0) {
        if (isDev) console.log("[wa] status update ignorado");
        continue;
      }
      const messages = value?.messages || [];
      for (const msg of messages) {
        const direction = msg?.direction;
        if (direction === "outbound") continue;
        const msgId = (msg?.id ?? "").toString().trim();
        if (msgId) {
          const isNew = await markMessageIfNew(msgId);
          if (!isNew) {
            logWaInfo("evento duplicado (message.id ya visto)", {
              phone: msg?.from,
              extra: { msgIdHash: msgId.slice(-8) },
            });
            continue;
          }
        } else {
          // Sin id no podemos garantizar dedupe; aceptamos pero lo dejamos visible.
          logWaWarn("mensaje sin id; dedupe no aplicable", { phone: msg?.from });
        }
        toProcess.push({ value, msg });
      }
    }
  }

  if (toProcess.length === 0) {
    return new Response("OK", { status: 200 });
  }

  // ── Encolar procesamiento en background y responder 200 inmediato. ──
  await runInBackground(async () => {
    for (const { value, msg } of toProcess) {
      try {
        await processWhatsAppMessage(value, msg);
      } catch (err) {
        logWaError("error procesando mensaje en background", {
          phone: msg?.from,
          extra: { err: err instanceof Error ? err.message : String(err) },
        });
      }
    }
  }, "wa-webhook");

  return new Response("OK", { status: 200 });
}

/**
 * Procesa un mensaje individual fuera del request HTTP.
 * Encapsula toda la lógica conversacional, opt-out, ventana 24 h, locks,
 * envío de texto/audio/imagen y telemetría.
 */
async function processWhatsAppMessage(_value: WaPayloadValue, msg: WaIncomingMessage): Promise<void> {
  const messageStart = Date.now();
  const from = msg?.from;
  const text = msg?.text?.body;
  const type = msg?.type;
  const direction = msg?.direction;
  const imageId = msg?.image?.id;
  const audioId = msg?.audio?.id;

  const isOutbound = direction === "outbound";
  if (!from || isOutbound) return;

  const requestId = generateRequestId("wa");
  const probeForIntent =
    (typeof text === "string" && text.trim()) ||
    (type === "audio" ? "(audio)" : type === "image" ? "(imagen)" : "") ||
    " ";
  const waLogIntent = classifyIntent(probeForIntent).intent;
  console.info(
    `[${requestId}] wa mensaje`,
    buildSafeWaLog({ phone: from, type: type ?? null, extra: { intent: waLogIntent } })
  );
  const telemetryWa = { requestId, canal: "wa" as const };

  const textBody = typeof text === "string" ? text.trim() : "";
  const guardedSendText = makeWindowAwareSender(from, requestId);

  if (from !== "unknown") {
    await renewMessageWindow(from);

    if (textBody && isOptOutMessage(textBody)) {
      await setOptOut(from);
      await guardedSendText(WA_OPT_OUT_ACK);
      return;
    }

    if (await isOptedOut(from)) {
      if (textBody && isOptInMessage(textBody)) {
        await setOptIn(from);
        await guardedSendText(WA_OPT_IN_ACK);
      } else {
        await guardedSendText(WA_OPTED_OUT_NOTICE);
        return;
      }
    }

    const windowOk = await isWindowActive(from);
    if (!windowOk) {
      logWaWarn(
        "ventana 24h cerrada para este número; fuera de ventana sólo se enviarán plantillas aprobadas",
        { phone: from, requestId }
      );
    }

    if (await isFirstContact(from)) {
      await guardedSendText(WA_FIRST_CONTACT_WELCOME);
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
            logWaWarn("contribución no guardada", {
              phone: from,
              requestId,
              extra: { err: ce instanceof Error ? ce.message : String(ce) },
            });
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
      if (txCmd.helpReply) await guardedSendText(txCmd.helpReply);
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
        await guardedSendText(safe.response);
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
      if (isDev) console.log(`[wa] imagen recibida ${hashPhone(from)}`);
      try {
        const media = await getWhatsAppMediaAsBase64(imageId, "image/jpeg");
        if (media?.dataUrl) {
          const imgBuf = bufferFromDataUrl(media.dataUrl);
          if (!imgBuf) {
            response = "No pude procesar la imagen. ¿Puedes enviarla de nuevo?";
          } else {
            const iv = await validateImage(imgBuf);
            if (!iv.valid) {
              await guardedSendText(WA_IMAGE_VALIDATION_REPLY);
              return { response: null, waUserTurn: "", nextWaState: null };
            }
            const caption = (text || "").trim();
            if (caption) {
              const imgSafe = checkUserMessage(caption);
              if (!imgSafe.safe && imgSafe.response) {
                await guardedSendText(imgSafe.response);
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
        logWaError("error procesando imagen", {
          requestId,
          phone: from,
          extra: { err: err instanceof Error ? err.message : String(err) },
        });
        response = "Uy, falló el análisis de la imagen. Intenta en un ratito.";
      }
    }
    // 2) Audio: descargar → Whisper → texto → ONDA
    else if (type === "audio" && audioId) {
      if (isDev) console.log(`[wa] audio recibido ${hashPhone(from)}`);
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
              await guardedSendText(reply);
              return { response: null, waUserTurn: "", nextWaState: null };
            }
            if (session.history.length === 0) {
              await guardedSendText(WA_AUDIO_TRANSCRIBING_ACK);
            }
            const sttLang = sttLangFromSession(session, "");
            const transcribed = await transcribeAudio(media.dataUrl, { language: sttLang });
            const userMessage = transcribed || "(no se pudo transcribir el audio)";
            const audioSafe = checkUserMessage(userMessage);
            if (!audioSafe.safe && audioSafe.response) {
              await guardedSendText(audioSafe.response);
              return { response: null, waUserTurn: "", nextWaState: null };
            }
            await runWaTextPipeline(userMessage);
          }
        } else {
          response = "No pude descargar el audio. ¿Puedes enviar un mensaje de texto?";
        }
      } catch (err) {
        logWaError("error procesando audio", {
          requestId,
          phone: from,
          extra: { err: err instanceof Error ? err.message : String(err) },
        });
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
      if (isDev) {
        console.log(
          `[wa] texto recibido`,
          buildSafeWaLog({ requestId, phone: from, text })
        );
      }
      await runWaTextPipeline(text.trim());
    }

    return { response, waUserTurn, nextWaState };
  });

  if (locked === null) {
    logWaWarn("mensaje ignorado por lock activo", { phone: from, requestId });
    return;
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
      if (isDev) {
        console.log(
          `[wa] respuesta formato=${parsed.formato}`,
          buildSafeWaLog({ requestId, phone: from, text: parsed.text })
        );
      }
      const parts = splitForWhatsApp(parsed.text);
      for (let pi = 0; pi < parts.length; pi++) {
        const textResult = await guardedSendText(parts[pi]);
        if (!textResult.ok) {
          logWaError("error enviando texto", {
            requestId,
            phone: from,
            extra: { err: textResult.error },
          });
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
          // Fuera de ventana: NO enviamos audio/imagen (sólo plantilla permitida).
          const windowOk = await isWindowActive(from);
          if (!windowOk) {
            logWaWarn("ventana cerrada; audio TTS omitido", { requestId, phone: from });
          } else {
            const ttsText = parsed.text.slice(0, WA_TTS_CHAR_LIMIT);
            const audioBuffer = await generateSpeech(ttsText);
            const audioResult = await sendWhatsAppAudio(from, audioBuffer);
            if (!audioResult.ok) {
              logWaError("error enviando audio", {
                requestId,
                phone: from,
                extra: { err: audioResult.error },
              });
            }
          }
        } catch (voiceErr) {
          logWaError("error generando voz", {
            requestId,
            phone: from,
            extra: { err: voiceErr instanceof Error ? voiceErr.message : String(voiceErr) },
          });
        }
      }

      if (parsed.formato === "infografia" && parsed.infographicPayload) {
        try {
          const windowOk = await isWindowActive(from);
          if (!windowOk) {
            logWaWarn("ventana cerrada; infografía omitida", { requestId, phone: from });
          } else {
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
              if (!imgResult.ok) {
                logWaError("error enviando infografía", {
                  requestId,
                  phone: from,
                  extra: { err: imgResult.error },
                });
              }
              const igLocale: InfographicLocale =
                nextWaState?.prefs.locale === "es" ? "es" : "pt";
              const altPack = altTextForWhatsApp(parsed.infographicPayload.altText, igLocale);
              const altResult = await guardedSendText(
                `${infographicAltWhatsAppPrefix(igLocale)}${altPack.text}`
              );
              if (!altResult.ok) {
                logWaError("error enviando alt-text infografía", {
                  requestId,
                  phone: from,
                  extra: { err: altResult.error },
                });
              }
            } else {
              await guardedSendText(
                result.error ||
                  "Não foi possível gerar a infografia agora. Posso enviar em texto se quiser."
              );
            }
          }
        } catch (imgErr) {
          logWaError("error generando infografía", {
            requestId,
            phone: from,
            extra: { err: imgErr instanceof Error ? imgErr.message : String(imgErr) },
          });
        }
      } else if (parsed.formato === "imagen") {
        try {
          const windowOk = await isWindowActive(from);
          if (!windowOk) {
            logWaWarn("ventana cerrada; imagen generada omitida", { requestId, phone: from });
          } else {
            const imgGen = await generateImageFromText(parsed.text);
            if (imgGen.ok) {
              const imgResult = await sendWhatsAppImage(
                from,
                imgGen.buffer,
                "image/png",
                undefined
              );
              if (!imgResult.ok) {
                logWaError("error enviando imagen generada", {
                  requestId,
                  phone: from,
                  extra: { err: imgResult.error },
                });
              }
            }
          }
        } catch (imgErr) {
          logWaError("error generando imagen", {
            requestId,
            phone: from,
            extra: { err: imgErr instanceof Error ? imgErr.message : String(imgErr) },
          });
        }
      }

      if (parsed.guideId) {
        const windowOk = await isWindowActive(from);
        if (!windowOk) {
          logWaWarn("ventana cerrada; guía omitida", { requestId, phone: from });
        } else {
          const guide = await getGuideImageBuffer(parsed.guideId);
          if (guide) {
            const imgResult = await sendWhatsAppImage(
              from,
              guide.buffer,
              guide.mimeType,
              undefined
            );
            if (!imgResult.ok) {
              logWaError("error enviando guía", {
                requestId,
                phone: from,
                extra: { err: imgResult.error },
              });
            }
          }
        }
      }
    } catch (error) {
      logWaError("error enviando respuesta", {
        requestId,
        phone: from,
        extra: { err: error instanceof Error ? error.message : String(error) },
      });
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
          const tr = await guardedSendText(inviteParts[ii]);
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
      ).catch((err) =>
        logWaWarn("error guardando sesión", {
          phone: from,
          requestId,
          extra: { err: err instanceof Error ? err.message : String(err) },
        })
      );
    }
  } else {
    if (isDev) {
      console.log(
        `[wa] mensaje ignorado`,
        buildSafeWaLog({ requestId, phone: from, type: type ?? null, extra: { direction } })
      );
    }
  }
}
