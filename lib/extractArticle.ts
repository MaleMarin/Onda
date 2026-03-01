/**
 * Extracción de texto y meta de una URL (artículo/noticia).
 * Uso: backend (API route + chat stream) para evitar CORS.
 */

function safeUrl(u: string): URL | null {
  try {
    const url = new URL(u);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url;
  } catch {
    return null;
  }
}

function stripHtml(html: string): string {
  const noScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  const text = noScripts
    .replace(/<\/(p|div|br|li|h1|h2|h3|article|section)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  return text;
}

function pickMeta(html: string): { title: string; description: string } {
  const title =
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
  const desc =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]?.trim() ??
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1]?.trim() ??
    "";
  const ogTitle =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]?.trim() ?? "";
  return { title: ogTitle || title, description: desc };
}

export type ExtractResult = {
  ok: true;
  status: number;
  url: string;
  host: string;
  meta: { title: string; description: string };
  text: string;
  thin: boolean;
} | {
  ok: false;
  error: string;
};

const MAX_TEXT_LENGTH = 22000;
const THIN_THRESHOLD = 1500;

export async function extractArticle(urlParam: string): Promise<ExtractResult> {
  const url = safeUrl(urlParam);
  if (!url) return { ok: false, error: "invalid_url" };

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    // SIEMPRE leer HTML: aunque res.ok sea false (403, 404, paywall) podemos rescatar <title> y og:description.
    const html = await res.text();
    const meta = pickMeta(html);
    const rawText = stripHtml(html);
    const text = rawText.slice(0, MAX_TEXT_LENGTH);
    const thin = text.length < THIN_THRESHOLD;

    return {
      ok: true,
      status: res.status,
      url: url.toString(),
      host: url.host,
      meta,
      text,
      thin,
    };
  } catch {
    return { ok: false, error: "fetch_failed" };
  }
}
