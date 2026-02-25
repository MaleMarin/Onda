import { getOndaReplyStream, getOndaReplyWithImage, type ArticleContext } from "../../../../lib/ondaReply";
import { wantsSources } from "../../../../lib/responseFormat";
import { transcribeAudio } from "../../../../lib/transcribe";
import { extractArticle } from "../../../../lib/extractArticle";
import { EjeOnda } from "../../../../content/types";

const URL_REGEX = /\b(https?:\/\/[^\s)\]}>"']+)/i;
function extractFirstUrl(text: string): string | null {
  const m = text.match(URL_REGEX);
  if (!m) return null;
  return m[1].replace(/[.,;:)]+$/, "").trim();
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
 * POST con mismo body que /api/chat. Acepta message, image, audio, eje, history.
 * Con imagen usa GPT-4o-mini (visión, sin streaming); solo texto usa GPT-4o-mini en streaming real.
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

    if (audio) {
      try {
        const transcribed = await transcribeAudio(audio);
        message = message ? `${message}\n\n[Voz transcrita]: ${transcribed}` : transcribed;
      } catch (err) {
        console.error("[chat/stream] transcribe", err);
        return Response.json(
          { error: "No pude transcribir el audio. Probá con otro formato o envíalo por texto." },
          { status: 400 }
        );
      }
    }

    let articleContext: ArticleContext | null = null;
    const firstUrl = extractFirstUrl(message);
    const isDev = process.env.NODE_ENV === "development";

    if (firstUrl) {
      if (isDev) console.log("[ONDA] URL detected:", firstUrl);
      const extracted = await extractArticle(firstUrl);
      if (extracted.ok) {
        if (isDev) {
          console.log("[ONDA] extract ok | thin:", extracted.thin, "| status:", extracted.status, "| text length:", extracted.text?.length ?? 0);
          if (extracted.thin || !extracted.text?.trim()) console.log("[ONDA] using meta fallback (title/description/host)");
        }
        articleContext = {
          text: extracted.text,
          thin: extracted.thin,
          host: extracted.host,
          url: extracted.url,
          meta: extracted.meta,
        };
      } else {
        if (isDev) console.log("[ONDA] extract failed:", extracted.error, "| using meta fallback (host only)");
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
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const includeSources = wantsSources(message);
          if (image) {
            const fullReply = await getOndaReplyWithImage(
              message || "¿Qué ves en esta imagen?",
              image,
              eje,
              history.length > 0 ? history : null,
              includeSources
            );
            for (const chunk of chunkText(fullReply)) {
              controller.enqueue(encoder.encode(JSON.stringify({ text: chunk }) + "\n"));
            }
          } else {
            for await (const chunk of getOndaReplyStream(
              message,
              eje,
              history.length > 0 ? history : null,
              includeSources,
              articleContext
            )) {
              controller.enqueue(encoder.encode(JSON.stringify({ text: chunk }) + "\n"));
            }
          }
          controller.enqueue(encoder.encode(JSON.stringify({ done: true }) + "\n"));
        } catch (err) {
          console.error("[chat/stream]", err);
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                error: "Uy, se cortó la conexión. ¿Probamos de nuevo?",
              }) + "\n"
            )
          );
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
      { error: "No pude conectar. Revisa OPENAI_API_KEY." },
      { status: 500 }
    );
  }
}
