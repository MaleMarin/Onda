import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { extractArticle, extractDnsLookup } from "@/lib/extractArticle";

describe("extractArticle", () => {
  const originalFetch = globalThis.fetch;
  const originalLookup = extractDnsLookup.lookup;

  beforeEach(() => {
    extractDnsLookup.lookup = async () => ["93.184.216.34"];
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    extractDnsLookup.lookup = originalLookup;
    vi.restoreAllMocks();
  });

  it("rechaza esquemas que no sean http(s)", async () => {
    const r = await extractArticle("file:///etc/passwd");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("invalid_url");
    expect(globalThis.fetch).toBe(originalFetch);
  });

  it("bloquea loopback y metadata sin fetch", async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;
    const cases = [
      "http://127.0.0.1/",
      "http://127.0.0.1:80",
      "http://localhost/admin",
      "http://0.0.0.0/",
      "http://169.254.169.254/latest/meta-data/",
      "http://10.0.0.8/secret",
      "http://192.168.1.1/",
      "http://172.16.5.1/",
      "http://[::1]/",
    ];
    for (const url of cases) {
      const r = await extractArticle(url);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toBe("blocked_url");
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("bloquea redirect hacia IP privada", async () => {
    globalThis.fetch = vi.fn(async () => {
      return {
        status: 302,
        headers: { get: (k: string) => (k.toLowerCase() === "location" ? "http://127.0.0.1/ssrf" : null) },
        body: null,
        text: async () => "",
      } as unknown as Response;
    });
    const r = await extractArticle("https://ejemplo.org/redir");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("blocked_url");
  });

  it("marca thin cuando el HTML aporta poco texto (paywall/meta)", async () => {
    globalThis.fetch = vi.fn(async () => {
      const shortBody =
        "<html><head><title>T</title></head><body><p>Pequeño.</p></body></html>";
      return {
        ok: false,
        status: 403,
        headers: { get: () => null },
        body: null,
        text: async () => shortBody,
      } as unknown as Response;
    });

    const r = await extractArticle("https://ejemplo.org/articulo");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.thin).toBe(true);
      expect(r.status).toBe(403);
    }
  });

  it("403 con og:title en HTML: extrae meta aunque res.ok sea false", async () => {
    globalThis.fetch = vi.fn(async () => {
      const html = `<!DOCTYPE html><html><head>
<meta content="Titular OG" property="og:title">
<meta name="description" content="Bajada útil">
</head><body><p>x</p></body></html>`;
      return {
        ok: false,
        status: 403,
        headers: { get: () => null },
        body: null,
        text: async () => html,
      } as unknown as Response;
    });
    const r = await extractArticle("https://economist.com/foo");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.meta.title).toContain("Titular OG");
      expect(r.meta.description).toContain("Bajada");
      expect(r.thin).toBe(true);
    }
  });

  it("fetch fallido de URL pública devuelve fetch_failed, no blocked_url", async () => {
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
