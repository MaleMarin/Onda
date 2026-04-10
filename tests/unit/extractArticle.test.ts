import { describe, it, expect, vi, afterEach } from "vitest";
import { extractArticle } from "@/lib/extractArticle";

describe("extractArticle", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it(
    "rechaza esquemas que no sean http(s)",
    async () => {
      const r = await extractArticle("file:///etc/passwd");
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toBe("invalid_url");
    },
    15_000
  );

  it(
    "marca thin cuando el HTML aporta poco texto (paywall/meta)",
    async () => {
      globalThis.fetch = vi.fn(async () => {
        const shortBody =
          "<html><head><title>T</title></head><body><p>Pequeño.</p></body></html>";
        return {
          ok: false,
          status: 403,
          text: async () => shortBody,
        } as Response;
      });

      const r = await extractArticle("https://ejemplo.org/articulo");
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.thin).toBe(true);
        expect(r.status).toBe(403);
      }
    },
    15_000
  );

  it(
    "403 con og:title en HTML: extrae meta aunque res.ok sea false",
    async () => {
      globalThis.fetch = vi.fn(async () => {
        const html = `<!DOCTYPE html><html><head>
<meta content="Titular OG" property="og:title">
<meta name="description" content="Bajada útil">
</head><body><p>x</p></body></html>`;
        return {
          ok: false,
          status: 403,
          text: async () => html,
        } as Response;
      });
      const r = await extractArticle("https://economist.com/foo");
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.meta.title).toContain("Titular OG");
        expect(r.meta.description).toContain("Bajada");
        expect(r.thin).toBe(true);
      }
    },
    15_000
  );

  it("fetch fallido devuelve ok:false con host y meta vacía", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("network down");
    });
    const r = await extractArticle("https://ejemplo.org/ruta");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe("fetch_failed");
      expect(r.host).toBe("ejemplo.org");
      expect(r.meta).toEqual({ title: "", description: "" });
    }
  });
});
