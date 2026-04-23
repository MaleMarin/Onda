import { classifyIntent } from "../../../../lib/intentClassifier";
import {
  classifyOrchestratorDepth,
  generateTemaFromExchange,
  getOndaReplyStream,
  getOndaReplyWithImage,
  type ArticleContext,
} from "../../../../lib/ondaReply";
import {
  buildMemoryContextBlock,
  buildSessionSummary,
  getSessionSummary,
  saveSessionSummary,
  type SessionMessage,
} from "../../../../lib/sessionMemory";
import { searchPrivateDocs } from "../../../../lib/firebaseRag";
import { getRagContext } from "../../../../lib/rag";
import { parseResponseFormat, wantsSources, type ParseResponseFormatOptions } from "../../../../lib/responseFormat";
import { searchWeb } from "../../../../lib/searchWeb";
import { transcribeAudio, TRANSCRIBE_ERROR } from "../../../../lib/transcribe";
import { extractArticle } from "../../../../lib/extractArticle";
import { generateImageFromText } from "../../../../lib/generateImage";
import { renderInfographicPng } from "../../../../lib/infographic";
import { infographicStreamAltPrefix } from "../../../../lib/infographicPayload";
import { EjeOnda } from "../../../../content/types";
import { checkRateLimit } from "../../../../lib/rateLimiter";
import { checkUserMessage } from "../../../../lib/promptSafety";
import {
  AUDIO_VALIDATION_TOO_LARGE,
  AUDIO_VALIDATION_TOO_LONG,
  bufferFromDataUrl,
  validateImage,
} from "../../../../lib/validateMedia";
import { randomUUID } from "crypto";
import { generateRequestId } from "../../../../lib/telemetry";
import { recordEvent } from "../../../../lib/insightsTelemetry";
import {
  buildHeuristicSummarySafe,
  buildRiskFlagsForTelemetry,
  detectIntentType,
  detectTopicTags,
  userRequestedTelemetryOptOut,
} from "../../../../lib/insightsTagger";
import {
  inferContentType,
  localeBucketFromUnified,
  mapFormatoToOutputFormat,
  verbosityFromUnified,
} from "../../../../lib/insightsTurnHelpers";
import { recordConversation } from "../../../../lib/auditStore";
import { recordConversationImpact } from "../../../../lib/impactMetrics";
import { getCachedResponse } from "../../../../lib/responseCache";
import { parseUserPreferencesFromApi, type OndaUserPreferences } from "../../../../lib/userPreferences";
import {
  buildOndaPreferencesForRequest,
  isDefaultUserPrefs,
  maybeInfographicUserPrefix,
  normalizePrefs,
  parseUserPrefsFromApi,
} from "../../../../lib/userPrefs";
import { computeWebPlayAudioDecision } from "../../../../lib/playAudioContract";
import { computeRiskPipelineFlags, riskPipelineSkipsCache } from "../../../../lib/riskModes";
import { detectTransparencyRequest } from "../../../../lib/transparencyMode";
import { buildListeningInvitePayload } from "../../../../lib/onda/contributions/web";

/** Tiempo máximo de ejecución del handler (Vercel: 60 en Hobby, hasta 300 en Pro). */
export const maxDuration = 60;

/** Las evidencias de búsqueda (RAG + Tavily) se construyen aquí; si Tavily falla o tarda >8s, arrancamos con RAG/PDFs. La velocidad es credibilidad. */
const TAVILY_TIMEOUT_MS = 8_000;
const RAG_TIMEOUT_MS = 8_000;

const URL_REGEX = /\b(https?:\/\/[^\s)\]}>"']+)/i;
/** Para logs dev: extensión coherente con `lib/transcribe` (mime sin codecs). */
function extFromAudioMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes("webm")) return "webm";
  if (m.includes("ogg")) return "ogg";
  if (m.includes("wav")) return "wav";
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
  if (m.includes("mp4") || m.includes("m4a")) return "m4a";
  return "?";
}

function infographicParseOptions(
  prefs: OndaUserPreferences,
  userMessage: string,
  ejeVal: EjeOnda | null
): ParseResponseFormatOptions {
  const elderHint =
    /\b(mais\s+simples|bem\s+grande|para\s+minha\s+m[aã]e|m[aá]s\s+simples|texto\s+grande|lectura\s+f[aá]cil|m[aá]s\s+grande)\b/i.test(
      userMessage
    );
  return {
    infographic: {
      locale: prefs.locale === "pt-BR" ? "pt" : "es",
      elderFriendly: prefs.readingMode === "easy" || elderHint,
      eje: ejeVal,
    },
  };
}

function extractFirstUrl(text: string): string | null {
  if (!text || typeof text !== "string") return null;
  const m = text.match(URL_REGEX);
  if (!m) return null;
  return m[1].replace(/[.,;:)]+$/, "").trim();
}

/** Obtiene la primera URL del mensaje actual o del historial reciente (mensajes de usuario). */
function getUrlFromMessageOrHistory(
  message: string,
  history: Array<{ role: string; content: string }>
): string | null {
  const fromCurrent = extractFirstUrl(message);
  if (fromCurrent) return fromCurrent;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role !== "user") continue;
    const url = extractFirstUrl(history[i].content);
    if (url) return url;
  }
  return null;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_EJES = new Set<string>([EjeOnda.A_MANO, EjeOnda.CIVITA, EjeOnda.PROFES]);

/** Emite la respuesta en trozos para simular stream (ej. cuando viene de visión sin streaming). */
function* chunkText(text: string, size = 40): Generator<string> {
  for (let i = 0; i < text.length; i += size) {
    yield text.slice(i, i + size);
  }
}

/**
 * Único endpoint de chat (estándar Vercel AI SDK / streaming). No existe /api/chat duplicado.
 * POST: message, image, audio, eje, history. Con imagen: visión sin stream; solo texto: stream real.
 */
export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "anonymous";
    const webRl = await checkRateLimit(ip, "web", 30, 60);
    if (!webRl.allowed) {
      return Response.json(
        { error: "Demasiadas solicitudes. Esperá un momento antes de continuar." },
        { status: 429 }
      );
    }

    const requestStart = Date.now();

    const body = await req.json();
    let message = typeof body?.message === "string" ? body.message.trim() : "";
    const image =
      typeof body?.image === "string" && body.image.startsWith("data:")
        ? (body.image as string)
        : null;
    const audio =
      typeof body?.audio === "string" && (body.audio.startsWith("data:") || body.audio.length > 100)
        ? (body.audio as string)
        : null;

    const ejeRaw = body?.eje;
    const eje =
      typeof ejeRaw === "string" && VALID_EJES.has(ejeRaw) ? (ejeRaw as EjeOnda) : null;

    const rawHistory = Array.isArray(body?.history) ? body.history : [];
    const history = rawHistory
      .filter((m: unknown) => {
        if (typeof m !== "object" || m === null || !("role" in m) || !("content" in m)) return false;
        const r = (m as { role: string }).role;
        const c = (m as { content: unknown }).content;
        return (r === "user" || r === "model") && typeof c === "string";
      })
      .map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "model",
        content: String(m.content).trim(),
      }));

    const sessionHeader = req.headers.get("x-session-id")?.trim();
    const sessionBody = typeof body?.sessionId === "string" ? body.sessionId.trim() : "";
    const sessionId = sessionHeader || sessionBody || "anonymous";

    const inclusiveFromApi = parseUserPreferencesFromApi(body?.userPreferences);
    const unified = normalizePrefs(parseUserPrefsFromApi(body?.prefs));
    const alreadyInvitedInConversation = body?.alreadyInvitedInConversation === true;

    let memoryBlock = "";
    if (sessionId !== "anonymous") {
      const prevSummary = await getSessionSummary("web", sessionId);
      if (prevSummary) {
        memoryBlock = buildMemoryContextBlock(prevSummary);
      }
    }

    if (!message && !image && !audio) {
      return Response.json(
        { error: "Enviá un mensaje de texto, una imagen o un audio." },
        { status: 400 }
      );
    }

    const isDev = process.env.NODE_ENV === "development";
    /** Alineado con `lib/transcribe` (12 KB). */
    const MIN_AUDIO_BYTES = 12 * 1024;

    if (audio) {
      let audioSizeBytes = 0;
      let audioMime = "";
      const isDataUrl = typeof audio === "string" && audio.startsWith("data:");
      if (isDataUrl) {
        const commaIdx = audio.indexOf(",");
        if (commaIdx === -1) {
          return Response.json(
            { error: "Formato de audio inválido." },
            { status: 400 }
          );
        }
        const header = audio.slice(0, commaIdx);
        audioMime = header.split(";")[0].replace("data:", "").trim();
        if (!/^audio\//i.test(audioMime)) {
          return Response.json(
            { error: "Formato de audio inválido." },
            { status: 400 }
          );
        }
        const b64 = audio.slice(commaIdx + 1);
        audioSizeBytes = Buffer.byteLength(b64, "base64");
      } else if (typeof audio === "string" && audio.length > 100) {
        try {
          const buf = Buffer.from(audio, "base64");
          audioSizeBytes = buf.length;
          audioMime = "";
        } catch {
          return Response.json(
            { error: "Formato de audio inválido." },
            { status: 400 }
          );
        }
      } else {
        return Response.json(
          { error: "Formato de audio inválido." },
          { status: 400 }
        );
      }

      if (isDev) {
        console.log(
          `[audio] mime=${audioMime || "(raw)"}, size=${audioSizeBytes}, ext=${extFromAudioMime(audioMime)}`
        );
      }

      if (audioSizeBytes < MIN_AUDIO_BYTES) {
        return Response.json(
          {
            error:
              "El audio viene vacío o demasiado corto. Graba 2–3 segundos y reintenta.",
          },
          { status: 400 }
        );
      }

      try {
        const transcribed = await transcribeAudio(audio);
        message = message ? `${message}\n\n[Voz transcrita]: ${transcribed}` : transcribed;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[chat/stream] transcribe", err);

        let userMessage: string;
        switch (msg) {
          case TRANSCRIBE_ERROR.AUDIO_TOO_SMALL:
            userMessage =
              "El audio viene vacío o demasiado corto. Graba 2–3 segundos y reintenta.";
            break;
          case TRANSCRIBE_ERROR.FFMPEG_MISSING:
            console.error(
              "[chat/stream] ffmpeg-static ausente o inválido — ejecutá: npm i ffmpeg-static"
            );
            userMessage =
              "No puedo convertir este audio (webm). Falta ffmpeg en el servidor.";
            break;
          case TRANSCRIBE_ERROR.FFMPEG_CONVERT_FAILED:
            userMessage =
              "No pude convertir el audio. Intenta grabar de nuevo o enviar el archivo como .m4a o .mp3.";
            break;
          case TRANSCRIBE_ERROR.WHISPER_FAILED:
            userMessage = "No pude leer el audio. Intenta enviarlo de nuevo.";
            break;
          case AUDIO_VALIDATION_TOO_LARGE:
            userMessage = AUDIO_VALIDATION_TOO_LARGE;
            break;
          case AUDIO_VALIDATION_TOO_LONG:
            userMessage = AUDIO_VALIDATION_TOO_LONG;
            break;
          default:
            userMessage =
              msg.includes("muy corto") || msg.includes("corto") || msg.includes("vacío")
                ? "El audio viene vacío o demasiado corto. Graba 2–3 segundos y reintenta."
                : "No pude leer el audio. Intenta enviarlo de nuevo.";
        }
        return Response.json({ error: userMessage }, { status: 400 });
      }
    }

    if (image) {
      const imgBuf = bufferFromDataUrl(image);
      if (!imgBuf) {
        return Response.json({ error: "Formato de imagen inválido." }, { status: 400 });
      }
      const iv = await validateImage(imgBuf);
      if (!iv.valid) {
        return Response.json({ error: iv.error ?? "Imagen no válida." }, { status: 400 });
      }
    }

    const safetyMsg = checkUserMessage(message);
    if (!safetyMsg.safe) {
      return Response.json(
        { error: safetyMsg.response ?? "No pude procesar ese mensaje." },
        { status: 400 }
      );
    }
    for (const h of history) {
      if (h.role !== "user") continue;
      const hs = checkUserMessage(h.content);
      if (!hs.safe) {
        return Response.json(
          { error: hs.response ?? "No pude procesar ese mensaje." },
          { status: 400 }
        );
      }
    }

    const userPreferences = buildOndaPreferencesForRequest(inclusiveFromApi, unified, message);
    const messageForModel = maybeInfographicUserPrefix(unified, message);

    let articleContext: ArticleContext | null = null;
    const firstUrl = getUrlFromMessageOrHistory(message, history);

    if (firstUrl) {
      if (isDev) console.log("[article] url detected:", firstUrl);
      const extracted = await extractArticle(firstUrl);
      if (extracted.ok) {
        if (isDev) {
          console.log("[article] status ok? ", extracted.status, "/ thin?", extracted.thin, "| text length:", extracted.text?.length ?? 0);
          console.log("[article] meta title present?", !!extracted.meta?.title?.trim());
          if (extracted.thin || !extracted.text?.trim()) console.log("[article] using meta fallback (title/description/host)");
        }
        articleContext = {
          text: extracted.text,
          thin: extracted.thin,
          host: extracted.host,
          url: extracted.url,
          meta: extracted.meta,
        };
      } else {
        if (isDev) console.log("[article] extract failed:", extracted.error, "| host?", "host" in extracted ? extracted.host : "—");
        try {
          const u = new URL(firstUrl);
          const host =
            "host" in extracted && extracted.host ? extracted.host : u.host;
          const meta =
            "meta" in extracted && extracted.meta
              ? extracted.meta
              : { title: "", description: "" };
          articleContext = {
            text: "",
            thin: true,
            host,
            url: firstUrl,
            meta,
          };
        } catch {
          articleContext = null;
        }
      }
    }

    const encoder = new TextEncoder();
    const query = message ?? "";
    const telemetryOptOut =
      body?.insightsOptOut === true ||
      body?.telemetry === false ||
      userRequestedTelemetryOptOut(message);
    const riskPre = computeRiskPipelineFlags(query, Boolean(image), eje, userPreferences.locale);
    const ejeForModel = riskPre.emergency ? EjeOnda.A_MANO : eje;
    const riskPipeline = computeRiskPipelineFlags(query, Boolean(image), ejeForModel, userPreferences.locale);
    const transparencyExplicit = detectTransparencyRequest(messageForModel || message, userPreferences.locale)
      ? true
      : undefined;
    const requestId = generateRequestId("web");
    const intentResultForLog = classifyIntent(query || " ");
    console.info(`[${requestId}] chat/stream START intent=${intentResultForLog.intent}`);
    const telemetryCtx = { requestId, canal: "web" as const };

    if (!telemetryOptOut) {
      const rfStart = buildRiskFlagsForTelemetry(riskPipeline, query, userPreferences.locale);
      const contentTypeStart = inferContentType(query, Boolean(image), Boolean(audio));
      const dtStart = detectIntentType({
        userText: query,
        conversationIntent: intentResultForLog.intent,
        hasLink: Boolean(firstUrl),
        hasImage: Boolean(image),
        hasAudio: Boolean(audio),
        transparency: Boolean(transparencyExplicit),
        risk: riskPipeline,
        locale: userPreferences.locale,
      });
      const tagsStart = detectTopicTags(
        query,
        eje,
        rfStart,
        Boolean(firstUrl),
        Boolean(image),
        Boolean(audio)
      );
      void recordEvent({
        timestamp: new Date().toISOString(),
        channel: "web",
        locale: localeBucketFromUnified(unified),
        eje: ejeForModel,
        detected_intent: dtStart,
        content_type: contentTypeStart,
        output_format: "texto",
        verbosity: verbosityFromUnified(unified),
        sources_requested: Boolean(unified.sources || wantsSources(message)),
        risk_flags: rfStart,
        outcome: "ok",
        turn_stats: { user_chars: query.length, assistant_chars: 0 },
        tags: tagsStart,
        summary_safe: buildHeuristicSummarySafe({
          detectedIntent: dtStart,
          contentType: contentTypeStart,
          eje: ejeForModel,
        }),
        lifecycle: "start",
        request_id: requestId,
      }).catch(() => {});
    }

    type StreamContextBundle = {
      extraContext: string | undefined;
      rag_used: boolean;
      web_search_used: boolean;
    };

    /** Búsqueda web solo si el orquestador ve "deep/docs" o el intent conversacional pide RAG (p. ej. fact_check). */
    const contextBundlePromise: Promise<StreamContextBundle> = image
      ? Promise.resolve({ extraContext: undefined, rag_used: false, web_search_used: false })
      : (async (): Promise<StreamContextBundle> => {
          const intentResult = classifyIntent(query);
          const orch = await classifyOrchestratorDepth(query, ejeForModel, 0);
          const isDeep = orch === "deep" || orch === "docs";
          const shouldSearch = isDeep || intentResult.ragNeeded;

          const webP = shouldSearch
            ? Promise.race([
                searchWeb(query),
                new Promise<string>((_, rej) =>
                  setTimeout(() => rej(new Error("tavily_timeout")), TAVILY_TIMEOUT_MS)
                ),
              ]).catch(() => "")
            : Promise.resolve("");

          const ragP = Promise.all([getRagContext(query), searchPrivateDocs(query)]).then(([rag, privateDocs]) => ({
            rag: rag ?? "",
            privateDocs: privateDocs ?? "",
          }));

          const ragWithTimeout = Promise.race([
            ragP,
            new Promise<{ rag: string; privateDocs: string }>((resolve) =>
              setTimeout(() => resolve({ rag: "", privateDocs: "" }), RAG_TIMEOUT_MS)
            ),
          ]);

          const [webContext, { rag, privateDocs }] = await Promise.all([webP, ragWithTimeout]);

          const rag_used = Boolean(rag?.trim()) || Boolean(privateDocs?.trim());
          const web_search_used = Boolean(webContext?.trim());
          const ragEmpty = !rag?.trim() && !privateDocs?.trim();

          const factCheckFootnote =
            intentResult.intent === "fact_check" && ragEmpty
              ? `\n\n--- NOTA DEL SISTEMA (RAG interno vacío, verificación) ---\nNo hay fragmentos recuperados de la base documental interna para esta consulta. Al final de tu respuesta, añade una línea breve como nota al pie: indica que la verificación se apoya en búsqueda abierta y conocimiento general, no en documentos internos de Precisar, y sugiere contrastar con fuentes oficiales.\n`
              : "";

          const base = [webContext, rag, privateDocs].filter(Boolean).join("\n\n");
          const combined = (base + factCheckFootnote).trim();

          return {
            extraContext: combined || undefined,
            rag_used,
            web_search_used,
          };
        })();

    const couldUseCacheProbe =
      !image &&
      !audio &&
      history.length === 0 &&
      !wantsSources(message) &&
      !unified.sources &&
      isDefaultUserPrefs(unified) &&
      !articleContext &&
      !memoryBlock?.trim() &&
      !riskPipelineSkipsCache(riskPipeline) &&
      !detectTransparencyRequest(messageForModel || message, userPreferences.locale);
    let cacheHitForImpact = false;
    if (couldUseCacheProbe) {
      try {
        const cr = await getCachedResponse(message || "", ejeForModel ?? "none", intentResultForLog.intent);
        cacheHitForImpact = Boolean(cr.hit && cr.response);
      } catch {
        cacheHitForImpact = false;
      }
    }

    const stream = new ReadableStream({
      async start(controller) {
        let partialSoFar = "";
        let assistantTextForMemory = "";
        let streamOk = true;
        try {
          const includeSources = unified.sources || wantsSources(message);
          let extraContext: string | undefined;
          let bundle: StreamContextBundle = {
            extraContext: undefined,
            rag_used: false,
            web_search_used: false,
          };
          try {
            bundle = await contextBundlePromise;
            extraContext = bundle.extraContext;
          } catch (contextErr) {
            console.warn("[chat/stream] context fetch failed, continuing without:", contextErr);
            extraContext = undefined;
          }

          const emitPlayAudioContract = (rawAssistant: string, userMsg: string) => {
            const p = parseResponseFormat(rawAssistant);
            const dec = computeWebPlayAudioDecision({
              outputMode: userPreferences.outputMode,
              userMessage: userMsg,
              parsed: p,
            });
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  playAudio: dec.play,
                  playAudioReason: dec.reason,
                }) + "\n"
              )
            );
          };

          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                rag_used: bundle.rag_used,
                web_search_used: bundle.web_search_used,
              }) + "\n"
            )
          );
          if (image) {
            const fullReply = await getOndaReplyWithImage(
              messageForModel || message || "¿Qué ves en esta imagen?",
              image,
              ejeForModel,
              history.length > 0 ? history : null,
              includeSources,
              "web",
              extraContext || undefined,
              memoryBlock || undefined,
              telemetryCtx,
              userPreferences,
              riskPipeline,
              unified,
              transparencyExplicit
            );
            const imgOpts = infographicParseOptions(userPreferences, messageForModel || message, ejeForModel);
            assistantTextForMemory = parseResponseFormat(fullReply, imgOpts).text.trim();
            for (const chunk of chunkText(fullReply)) {
              controller.enqueue(encoder.encode(JSON.stringify({ text: chunk }) + "\n"));
            }
            const parsedImg = parseResponseFormat(fullReply, imgOpts);
            if (parsedImg.formato === "infografia" && parsedImg.infographicPayload) {
              controller.enqueue(encoder.encode(JSON.stringify({ text: "\n\n_Generando infografía…_" }) + "\n"));
              try {
                const result = await renderInfographicPng(parsedImg.infographicPayload, ejeForModel);
                if (result.ok) {
                  const alt = parsedImg.infographicPayload.altText;
                  const altLab = infographicStreamAltPrefix(
                    userPreferences.locale === "pt-BR" ? "pt" : "es"
                  );
                  controller.enqueue(
                    encoder.encode(
                      JSON.stringify({
                        infographic: {
                          mime: "image/png",
                          dataUrl: result.dataUrl,
                          altText: alt,
                          alt: alt,
                        },
                      }) + "\n"
                    )
                  );
                  controller.enqueue(
                    encoder.encode(JSON.stringify({ text: `\n\n${altLab}${alt}` }) + "\n")
                  );
                } else {
                  controller.enqueue(
                    encoder.encode(
                      JSON.stringify({
                        text: `\n\n_No se pudo generar la infografía: ${result.error}_`,
                      }) + "\n"
                    )
                  );
                }
              } catch (imgErr) {
                console.warn("[chat/stream] infographic generation failed:", imgErr);
              }
            } else if (parsedImg.formato === "imagen") {
              controller.enqueue(encoder.encode(JSON.stringify({ text: "\n\n_Generando imagen…_" }) + "\n"));
              try {
                const imgGen = await generateImageFromText(parsedImg.text);
                if (imgGen.ok) {
                  const dataUrl = `data:${imgGen.mimeType};base64,${imgGen.buffer.toString("base64")}`;
                  controller.enqueue(encoder.encode(JSON.stringify({ image: dataUrl }) + "\n"));
                }
              } catch (imgErr) {
                console.warn("[chat/stream] image generation failed:", imgErr);
              }
            }
            emitPlayAudioContract(fullReply, (messageForModel || message).trim());
            try {
              const tema = await generateTemaFromExchange(message || "¿Qué ves en esta imagen?", fullReply);
              if (tema) controller.enqueue(encoder.encode(JSON.stringify({ tema }) + "\n"));
            } catch {
              // ignore
            }
          } else {
            for await (const chunk of getOndaReplyStream(
              messageForModel,
              ejeForModel,
              history.length > 0 ? history : null,
              includeSources,
              articleContext,
              extraContext ?? null,
              "web",
              memoryBlock || undefined,
              telemetryCtx,
              userPreferences,
              riskPipeline,
              unified,
              transparencyExplicit
            )) {
              partialSoFar += chunk;
              controller.enqueue(encoder.encode(JSON.stringify({ text: chunk }) + "\n"));
            }
            const streamOpts = infographicParseOptions(userPreferences, messageForModel, ejeForModel);
            const parsed = parseResponseFormat(partialSoFar, streamOpts);
            assistantTextForMemory = parsed.text.trim();
            if (parsed.formato === "infografia" && parsed.infographicPayload) {
              controller.enqueue(encoder.encode(JSON.stringify({ text: "\n\n_Generando infografía…_" }) + "\n"));
              try {
                const result = await renderInfographicPng(parsed.infographicPayload, ejeForModel);
                if (result.ok) {
                  const alt = parsed.infographicPayload.altText;
                  const altLab = infographicStreamAltPrefix(
                    userPreferences.locale === "pt-BR" ? "pt" : "es"
                  );
                  controller.enqueue(
                    encoder.encode(
                      JSON.stringify({
                        infographic: {
                          mime: "image/png",
                          dataUrl: result.dataUrl,
                          altText: alt,
                          alt: alt,
                        },
                      }) + "\n"
                    )
                  );
                  controller.enqueue(
                    encoder.encode(JSON.stringify({ text: `\n\n${altLab}${alt}` }) + "\n")
                  );
                } else {
                  controller.enqueue(
                    encoder.encode(
                      JSON.stringify({
                        text: `\n\n_No se pudo generar la infografía: ${result.error}_`,
                      }) + "\n"
                    )
                  );
                }
              } catch (imgErr) {
                console.warn("[chat/stream] infographic generation failed:", imgErr);
              }
            } else if (parsed.formato === "imagen") {
              controller.enqueue(encoder.encode(JSON.stringify({ text: "\n\n_Generando imagen…_" }) + "\n"));
              try {
                const imgGen = await generateImageFromText(parsed.text);
                if (imgGen.ok) {
                  const dataUrl = `data:${imgGen.mimeType};base64,${imgGen.buffer.toString("base64")}`;
                  controller.enqueue(encoder.encode(JSON.stringify({ image: dataUrl }) + "\n"));
                }
              } catch (imgErr) {
                console.warn("[chat/stream] image generation failed:", imgErr);
              }
            }
            emitPlayAudioContract(partialSoFar, (messageForModel || message).trim());
            try {
              const tema = await generateTemaFromExchange(query, partialSoFar);
              if (tema) controller.enqueue(encoder.encode(JSON.stringify({ tema }) + "\n"));
            } catch {
              // ignore
            }
          }
          if (streamOk && assistantTextForMemory) {
            const invRf = buildRiskFlagsForTelemetry(riskPipeline, query, userPreferences.locale);
            const invDt = detectIntentType({
              userText: query,
              conversationIntent: intentResultForLog.intent,
              hasLink: Boolean(firstUrl),
              hasImage: Boolean(image),
              hasAudio: Boolean(audio),
              transparency: Boolean(transparencyExplicit),
              risk: riskPipeline,
              locale: userPreferences.locale,
            });
            const invite = buildListeningInvitePayload({
              channel: "web",
              locale: userPreferences.locale,
              userText: query,
              assistantText: assistantTextForMemory,
              conversationIntent: intentResultForLog.intent,
              detectedIntent: invDt,
              riskPipeline,
              riskScamTelemetry: invRf.scam,
              riskSensitiveTelemetry: invRf.sensitive,
              eje: ejeForModel,
              turnToken: randomUUID(),
              alreadyInvitedInConversation,
            });
            if (invite) {
              controller.enqueue(
                encoder.encode(JSON.stringify({ listeningInvite: invite }) + "\n")
              );
            }
          }
          controller.enqueue(encoder.encode(JSON.stringify({ done: true }) + "\n"));
        } catch (err) {
          streamOk = false;
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error(`[${requestId}] [chat/stream] error en stream:`, errMsg, err);
          const isImageRequest = !!image;
          if (partialSoFar.trim().length > 0) {
            if (!assistantTextForMemory) {
              assistantTextForMemory = parseResponseFormat(partialSoFar.trim()).text.trim();
            }
            controller.enqueue(
              encoder.encode(JSON.stringify({ text: partialSoFar.trim() }) + "\n")
            );
            controller.enqueue(
              encoder.encode(JSON.stringify({ text: "\n\n_La conexión se interrumpió; aquí va lo que pude generar. Puedes preguntar de nuevo para seguir._" }) + "\n")
            );
          } else {
            const fallbackMsg =
              isImageRequest
                ? "No pude analizar la imagen. Puedes probar con otra más liviana o contarme por texto qué ves."
                : "No pude completar la respuesta ahora. Probá de nuevo en unos segundos; si pasa otra vez, escribí la pregunta en una frase corta.";
            controller.enqueue(
              encoder.encode(JSON.stringify({ error: fallbackMsg }) + "\n")
            );
          }
        } finally {
          console.info(`[${requestId}] chat/stream END ${streamOk ? "OK" : "ERROR"}`);
          if (sessionId !== "anonymous" && assistantTextForMemory) {
            const userLine =
              message.trim() ||
              (image ? "[imagen]" : audio ? "[audio]" : "");
            const conv: SessionMessage[] = [
              ...history.map((m: { role: "user" | "model"; content: string }) => ({
                role: m.role,
                content: m.content,
              })),
              { role: "user", content: userLine || "(mensaje)" },
              { role: "model", content: assistantTextForMemory },
            ];
            if (conv.length > 2) {
              const intentResult = classifyIntent(message || userLine || "");
              const ejeLabel = ejeForModel ?? EjeOnda.A_MANO;
              void saveSessionSummary(
                "web",
                sessionId,
                buildSessionSummary(conv, intentResult.intent, ejeLabel)
              ).catch((saveErr) => console.warn("[memory] error guardando sesión:", saveErr));
            }
          }
          if (streamOk && assistantTextForMemory) {
            void recordConversationImpact({
              eje: ejeForModel ?? "A_MANO",
              canal: "web",
              intent: intentResultForLog.intent,
              responseMs: Date.now() - requestStart,
              cacheHit: cacheHitForImpact,
              userIdentifier: ip,
            }).catch(() => {});
            void recordConversation({
              sessionId: sessionId !== "anonymous" ? sessionId : undefined,
              excerpt: `intent=${intentResultForLog.intent};eje=${ejeForModel ?? "none"};canal=web`,
            }).catch(() => {});
          }
          if (!telemetryOptOut) {
            const rfEnd = buildRiskFlagsForTelemetry(riskPipeline, query, userPreferences.locale);
            const convEnd = classifyIntent(query || " ");
            const dtEnd = detectIntentType({
              userText: query,
              conversationIntent: convEnd.intent,
              hasLink: Boolean(firstUrl),
              hasImage: Boolean(image),
              hasAudio: Boolean(audio),
              transparency: Boolean(transparencyExplicit),
              risk: riskPipeline,
              locale: userPreferences.locale,
            });
            const tagsEnd = detectTopicTags(
              query,
              eje,
              rfEnd,
              Boolean(firstUrl),
              Boolean(image),
              Boolean(audio)
            );
            const imgOptsEnd = infographicParseOptions(userPreferences, messageForModel || message, ejeForModel);
            const parsedEnd = assistantTextForMemory
              ? parseResponseFormat(assistantTextForMemory, imgOptsEnd)
              : null;
            const outF = parsedEnd ? mapFormatoToOutputFormat(parsedEnd.formato) : "texto";
            const outcome: "ok" | "fallback" | "error" = streamOk
              ? "ok"
              : partialSoFar.trim().length > 0
                ? "fallback"
                : "error";
            void recordEvent({
              timestamp: new Date().toISOString(),
              channel: "web",
              locale: localeBucketFromUnified(unified),
              eje: ejeForModel,
              detected_intent: dtEnd,
              content_type: inferContentType(query, Boolean(image), Boolean(audio)),
              output_format: outF,
              verbosity: verbosityFromUnified(unified),
              sources_requested: Boolean(unified.sources || wantsSources(message)),
              risk_flags: rfEnd,
              outcome,
              error_code:
                outcome === "ok" ? undefined : outcome === "fallback" ? "stream_partial" : "stream_failed",
              turn_stats: {
                user_chars: query.length,
                assistant_chars: assistantTextForMemory.length,
                latency_ms: Date.now() - requestStart,
              },
              tags: tagsEnd,
              summary_safe: buildHeuristicSummarySafe({
                detectedIntent: dtEnd,
                contentType: inferContentType(query, Boolean(image), Boolean(audio)),
                eje: ejeForModel,
              }),
              lifecycle: "end",
              request_id: requestId,
            }).catch(() => {});
          }
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("[chat/stream]", e);
    return Response.json(
      { error: "Algo falló en el servidor. Intenta de nuevo en un momento." },
      { status: 500 }
    );
  }
}
