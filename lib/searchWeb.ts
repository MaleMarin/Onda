/**
 * Búsqueda web en vivo para Onda (Tavily o Serper).
 * Tavily: filtrada por dominios de los 50 nodos fiables (shared.ts).
 * El resultado se inyecta como contexto extra con etiquetas [Fuente: URL] para citas obligatorias.
 */

import { DOMINIOS_FIABLES_TAVILY } from "../content/shared";

const MAX_SNIPPETS = 8;
const MAX_SNIPPET_LEN = 2000;

function truncate(s: string, max: number): string {
  if (!s || s.length <= max) return s;
  return s.slice(0, max).trim() + "…";
}

/**
 * Busca en la web y devuelve un texto para inyectar en el prompt.
 * Prioridad: TAVILY_API_KEY > SERPER_API_KEY.
 * Tavily: include_domains = dominios fiables Onda; search_depth "advanced" para búsqueda profunda.
 */
export async function searchWeb(query: string): Promise<string> {
  const q = query?.trim();
  if (!q) return "";

  const tavilyKey = process.env.TAVILY_API_KEY;
  const serperKey = process.env.SERPER_API_KEY;

  if (!tavilyKey && !serperKey) {
    console.error("[searchWeb] TAVILY_API_KEY y SERPER_API_KEY no configurados. Búsqueda web no disponible. Configura al menos una en .env.local / Vercel.");
    return "";
  }

  if (tavilyKey) {
    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: tavilyKey,
          query: q,
          search_depth: "advanced",
          max_results: MAX_SNIPPETS,
          include_answer: false,
          include_domains: DOMINIOS_FIABLES_TAVILY.slice(0, 50),
        }),
      });
      if (!res.ok) {
        const errBody = await res.text();
        console.error("[searchWeb] Tavily API error:", res.status, res.statusText, errBody);
        return "";
      }
      const data = (await res.json()) as { results?: Array<{ title?: string; url?: string; content?: string }> };
      const results = data.results ?? [];
      const lines = results
        .slice(0, MAX_SNIPPETS)
        .map((r) => {
          const title = r.title ? `[${r.title}]` : "";
          const content = truncate(r.content || "", MAX_SNIPPET_LEN);
          const url = r.url ?? "";
          return `${title} ${content} [Fuente: ${url}]`.trim();
        })
        .filter(Boolean);
      if (lines.length === 0) return "";
      return "Búsqueda web (fuentes fiables — 50 nodos):\n" + lines.join("\n\n");
    } catch (err) {
      console.error("[searchWeb] Tavily fetch failed:", err instanceof Error ? err.message : String(err));
      return "";
    }
  }

  if (serperKey) {
    try {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
        body: JSON.stringify({ q }),
      });
      if (!res.ok) {
        const errBody = await res.text();
        console.error("[searchWeb] Serper API error:", res.status, res.statusText, errBody);
        return "";
      }
      const data = (await res.json()) as { organic?: Array<{ title?: string; link?: string; snippet?: string }> };
      const organic = data.organic ?? [];
      const lines = organic
        .slice(0, MAX_SNIPPETS)
        .map((r) => {
          const title = r.title ? `[${r.title}]` : "";
          const snippet = truncate(r.snippet || "", MAX_SNIPPET_LEN);
          const link = r.link ?? "";
          return `${title} ${snippet} [Fuente: ${link}]`.trim();
        })
        .filter(Boolean);
      if (lines.length === 0) return "";
      return "Búsqueda web:\n" + lines.join("\n\n");
    } catch (err) {
      console.error("[searchWeb] Serper fetch failed:", err instanceof Error ? err.message : String(err));
      return "";
    }
  }

  return "";
}
