import { getOndaReplyStream, getOndaReplyWithImage, generateTemaFromExchange, type ArticleContext } from "../../../../lib/ondaReply";
import { searchPrivateDocs } from "../../../../lib/firebaseRag";
import { getRagContext } from "../../../../lib/rag";
import { parseResponseFormat, wantsSources } from "../../../../lib/responseFormat";
import { searchWeb } from "../../../../lib/searchWeb";
import { transcribeAudio, TRANSCRIBE_ERROR } from "../../../../lib/transcribe";
import { extractArticle } from "../../../../lib/extractArticle";
import { generateImageFromText } from "../../../../lib/generateImage";
import { renderInfographicPng } from "../../../../lib/infographic";
import { EjeOnda } from "../../../../content/types";

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
          default:
            userMessage =
              msg.includes("muy corto") || msg.includes("corto") || msg.includes("vacío")
                ? "El audio viene vacío o demasiado corto. Graba 2–3 segundos y reintenta."
                : "No pude leer el audio. Intenta enviarlo de nuevo.";
        }
        return Response.json({ error: userMessage }, { status: 400 });
      }
    }

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
        if (isDev) console.log("[article] extract failed:", extracted.error, "| using meta fallback (host only)");
        try {
          const u = new URL(firstUrl);
          articleContext = {
            text: "",
            thin: true,
            host: u.host,
            url: firstUrl,
            meta: { title: "", description: "" },
          };
        } catch {
          articleContext = null;
        }
      }
    }

    const encoder = new TextEncoder();
    const query = message ?? "";

    /** Tavily: max 8s. Si falla o se excede, usamos "" y arrancamos con RAG/PDFs (paralelismo real con fallback). */
    const webContextPromise = image
      ? Promise.resolve("")
      : Promise.race([
          searchWeb(query),
          new Promise<string>((_, rej) => setTimeout(() => rej(new Error("tavily_timeout")), TAVILY_TIMEOUT_MS)),
        ]).catch(() => "");

    /** RAG + docs privados (OEI/Precisar) en paralelo; max 8s para no retrasar el inicio del stream. */
    const ragAndPrivatePromise = image
      ? Promise.resolve({ rag: "", privateDocs: "" })
      : Promise.all([getRagContext(query), searchPrivateDocs(query)]).then(([rag, privateDocs]) => ({ rag: rag ?? "", privateDocs: privateDocs ?? "" }));

    const ragAndPrivateWithTimeout = image
      ? ragAndPrivatePromise
      : Promise.race([
          ragAndPrivatePromise,
          new Promise<{ rag: string; privateDocs: string }>((resolve) =>
            setTimeout(() => resolve({ rag: "", privateDocs: "" }), RAG_TIMEOUT_MS)
          ),
        ]);

    /** Contexto completo: web (o "" si Tavily falló/8s) + RAG + docs. Si Tavily tarda, el bot empieza a escribir con PDFs. */
    const extraContextPromise = image
      ? Promise.resolve(undefined)
      : (async () => {
          const [webContext, { rag, privateDocs }] = await Promise.all([webContextPromise, ragAndPrivateWithTimeout]);
          const combined = [webContext, rag, privateDocs].filter(Boolean).join("\n\n");
          return combined || undefined;
        })();

    const stream = new ReadableStream({
      async start(controller) {
        let partialSoFar = "";
        try {
          const includeSources = wantsSources(message);
          let extraContext: string | undefined;
          try {
            extraContext = await extraContextPromise;
          } catch (contextErr) {
            console.warn("[chat/stream] context fetch failed, continuing without:", contextErr);
            extraContext = undefined;
          }
          if (image) {
            const fullReply = await getOndaReplyWithImage(
              message || "¿Qué ves en esta imagen?",
              image,
              eje,
              history.length > 0 ? history : null,
              includeSources,
              undefined,
              extraContext || undefined
            );
            for (const chunk of chunkText(fullReply)) {
              controller.enqueue(encoder.encode(JSON.stringify({ text: chunk }) + "\n"));
            }
            const parsedImg = parseResponseFormat(fullReply);
            if (parsedImg.formato === "infografia" && parsedImg.infographicPayload) {
              controller.enqueue(encoder.encode(JSON.stringify({ text: "\n\n_Generando infografía…_" }) + "\n"));
              try {
                const result = await renderInfographicPng(parsedImg.infographicPayload, eje);
                if (result.ok) {
                  controller.enqueue(
                    encoder.encode(JSON.stringify({ infographic: { mime: "image/png", dataUrl: result.dataUrl, alt: "Infografía ONDA" } }) + "\n")
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
            try {
              const tema = await generateTemaFromExchange(message || "¿Qué ves en esta imagen?", fullReply);
              if (tema) controller.enqueue(encoder.encode(JSON.stringify({ tema }) + "\n"));
            } catch {
              // ignore
            }
          } else {
            for await (const chunk of getOndaReplyStream(
              message,
              eje,
              history.length > 0 ? history : null,
              includeSources,
              articleContext,
              extraContext ?? null
            )) {
              partialSoFar += chunk;
              controller.enqueue(encoder.encode(JSON.stringify({ text: chunk }) + "\n"));
            }
            const parsed = parseResponseFormat(partialSoFar);
            if (parsed.formato === "infografia" && parsed.infographicPayload) {
              controller.enqueue(encoder.encode(JSON.stringify({ text: "\n\n_Generando infografía…_" }) + "\n"));
              try {
                const result = await renderInfographicPng(parsed.infographicPayload, eje);
                if (result.ok) {
                  controller.enqueue(
                    encoder.encode(JSON.stringify({ infographic: { mime: "image/png", dataUrl: result.dataUrl, alt: "Infografía ONDA" } }) + "\n")
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
            try {
              const tema = await generateTemaFromExchange(query, partialSoFar);
              if (tema) controller.enqueue(encoder.encode(JSON.stringify({ tema }) + "\n"));
            } catch {
              // ignore
            }
          }
          controller.enqueue(encoder.encode(JSON.stringify({ done: true }) + "\n"));
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error("[chat/stream] error en stream:", errMsg, err);
          const isImageRequest = !!image;
          if (partialSoFar.trim().length > 0) {
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
