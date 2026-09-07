/**
 * Extracción de texto y meta de una URL (artículo/noticia).
 * Bloquea esquemas no http(s), hosts privados y redirects a red interna (SSRF).
 */

import { promises as dns } from "node:dns";

export type ExtractError =
  | "invalid_url"
  | "blocked_url"
  | "fetch_failed"
  | "timeout"
  | "too_large";

export type ExtractResult =
  | {
      ok: true;
      status: number;
      url: string;
      host: string;
      meta: { title: string; description: string };
      text: string;
      thin: boolean;
    }
  | {
      ok: false;
      error: ExtractError;
      /** Presente si la URL era pública pero falló el fetch (p. ej. red). */
      host?: string;
      meta?: { title: string; description: string };
    };

const MAX_TEXT_LENGTH = 22000;
const THIN_THRESHOLD = 1500;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 1_500_000;
const MAX_REDIRECTS = 5;

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata.google.com",
  "metadata",
  "host.docker.internal",
  "kubernetes.default",
  "kubernetes.default.svc",
]);

/** Inyectable en tests. */
export const extractDnsLookup = {
  lookup: async (hostname: string): Promise<string[]> => {
    const result = await dns.lookup(hostname, { all: true, verbatim: true });
    return result.map((r) => r.address);
  },
};

function safeUrl(u: string): URL | null {
  try {
    const url = new URL(u);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (!url.hostname) return null;
    return url;
  } catch {
    return null;
  }
}

function stripHtml(html: string): string {
  const noScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  return noScripts
    .replace(/<\/(p|div|br|li|h1|h2|h3|article|section)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function escapeReKey(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pickMetaAttribute(html: string, attr: "name" | "property", key: string): string {
  const k = escapeReKey(key);
  const a = escapeReKey(attr);
  const forward = new RegExp(`<meta[^>]+${a}=["']${k}["'][^>]+content=["']([^"']+)["']`, "i");
  const backward = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+${a}=["']${k}["']`, "i");
  return html.match(forward)?.[1]?.trim() ?? html.match(backward)?.[1]?.trim() ?? "";
}

function pickMeta(html: string): { title: string; description: string } {
  const ogTitle =
    pickMetaAttribute(html, "property", "og:title") ||
    pickMetaAttribute(html, "name", "twitter:title") ||
    "";
  const titleTag =
    html
      .match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
      ?.replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim() ?? "";
  const desc =
    pickMetaAttribute(html, "name", "description") ||
    pickMetaAttribute(html, "property", "og:description") ||
    pickMetaAttribute(html, "name", "twitter:description") ||
    "";
  return { title: (ogTitle || titleTag).trim(), description: desc.trim() };
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => {
    if (!/^\d{1,3}$/.test(p)) return NaN;
    return Number(p);
  });
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return ((nums[0] << 24) | (nums[1] << 16) | (nums[2] << 8) | nums[3]) >>> 0;
}

function inCidr(ipInt: number, base: string, bits: number): boolean {
  const baseInt = ipv4ToInt(base);
  if (baseInt == null) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

export function isPrivateOrReservedIPv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n == null) return false;
  return (
    inCidr(n, "0.0.0.0", 8) ||
    inCidr(n, "10.0.0.0", 8) ||
    inCidr(n, "127.0.0.0", 8) ||
    inCidr(n, "169.254.0.0", 16) ||
    inCidr(n, "172.16.0.0", 12) ||
    inCidr(n, "192.168.0.0", 16)
  );
}

function expandIpv6(ip: string): string | null {
  let raw = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (raw.startsWith("::ffff:")) {
    const v4 = raw.slice(7);
    if (ipv4ToInt(v4) != null) raw = `::ffff:${v4}`;
  }
  if (raw === "::") raw = "0:0:0:0:0:0:0:0";
  if (raw === "::1") raw = "0:0:0:0:0:0:0:1";
  const [head, tail] = raw.split("::");
  const headParts = head ? head.split(":") : [];
  const tailParts = tail ? tail.split(":") : [];
  if (raw.includes("::")) {
    const missing = 8 - headParts.length - tailParts.length;
    if (missing < 0) return null;
    const filled = [...headParts, ...Array(missing).fill("0"), ...tailParts];
    if (filled.length !== 8) return null;
    return filled.map((p) => p.padStart(4, "0")).join(":");
  }
  const parts = raw.split(":");
  if (parts.length !== 8) return null;
  return parts.map((p) => p.padStart(4, "0")).join(":");
}

export function isPrivateOrReservedIPv6(ip: string): boolean {
  const mapped = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (mapped.startsWith("::ffff:")) {
    const v4 = mapped.slice(7);
    if (isPrivateOrReservedIPv4(v4)) return true;
  }
  const full = expandIpv6(ip);
  if (!full) return false;
  const first = parseInt(full.slice(0, 4), 16);
  if (full === "0000:0000:0000:0000:0000:0000:0000:0001") return true;
  if (full === "0000:0000:0000:0000:0000:0000:0000:0000") return true;
  if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7
  if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10
  return false;
}

function parseDecimalOrIpv4Hostname(host: string): string | null {
  if (/^\d+$/.test(host)) {
    const n = Number(host);
    if (!Number.isSafeInteger(n) || n < 0 || n > 0xffffffff) return null;
    return `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`;
  }
  if (ipv4ToInt(host) != null) return host;
  return null;
}

export function isBlockedHostname(hostname: string): boolean {
  const h = hostname.trim().toLowerCase().replace(/\.$/, "").replace(/^\[|\]$/g, "");
  if (!h) return true;
  if (BLOCKED_HOSTNAMES.has(h)) return true;
  if (h.endsWith(".localhost") || h.endsWith(".internal") || h.endsWith(".local")) return true;
  if (h.includes("metadata.google")) return true;
  const asV4 = parseDecimalOrIpv4Hostname(h);
  if (asV4 && isPrivateOrReservedIPv4(asV4)) return true;
  if (h.includes(":") && isPrivateOrReservedIPv6(h)) return true;
  return false;
}

function fail(error: ExtractError, host?: string): ExtractResult {
  if (error === "blocked_url" || error === "invalid_url") {
    return { ok: false, error };
  }
  return {
    ok: false,
    error,
    ...(host ? { host } : {}),
    meta: { title: "", description: "" },
  };
}

async function assertPublicUrl(url: URL): Promise<ExtractError | null> {
  if (!["http:", "https:"].includes(url.protocol)) return "invalid_url";
  if (isBlockedHostname(url.hostname)) return "blocked_url";
  const asV4 = parseDecimalOrIpv4Hostname(url.hostname);
  if (asV4) {
    return isPrivateOrReservedIPv4(asV4) ? "blocked_url" : null;
  }
  if (url.hostname.includes(":")) {
    return isPrivateOrReservedIPv6(url.hostname) ? "blocked_url" : null;
  }
  try {
    const addrs = await extractDnsLookup.lookup(url.hostname);
    if (addrs.length === 0) return "fetch_failed";
    for (const addr of addrs) {
      if (isPrivateOrReservedIPv4(addr) || isPrivateOrReservedIPv6(addr)) return "blocked_url";
    }
    return null;
  } catch {
    return "fetch_failed";
  }
}

async function readBodyCapped(res: Response): Promise<{ ok: true; text: string } | { ok: false; error: ExtractError }> {
  const declared = Number(res.headers.get("content-length") || 0);
  if (declared > MAX_RESPONSE_BYTES) return { ok: false, error: "too_large" };

  if (!res.body) {
    const text = await res.text();
    if (text.length > MAX_RESPONSE_BYTES) return { ok: false, error: "too_large" };
    return { ok: true, text };
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        try {
          await reader.cancel();
        } catch {
          /* ignore */
        }
        return { ok: false, error: "too_large" };
      }
      chunks.push(value);
    }
  }
  const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
  return { ok: true, text: buf.toString("utf8") };
}

function resolveRedirect(current: URL, location: string): URL | null {
  try {
    return new URL(location, current);
  } catch {
    return null;
  }
}

export async function extractArticle(urlParam: string): Promise<ExtractResult> {
  const initial = safeUrl(urlParam);
  if (!initial) return fail("invalid_url");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    let current = initial;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const blocked = await assertPublicUrl(current);
      if (blocked) return fail(blocked, blocked === "fetch_failed" ? current.host : undefined);

      let res: Response;
      try {
        res = await fetch(current.toString(), {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
            Accept: "text/html,application/xhtml+xml",
          },
          redirect: "manual",
          signal: controller.signal,
        });
      } catch (e) {
        const name = e instanceof Error ? e.name : "";
        if (name === "AbortError") return fail("timeout", current.host);
        return fail("fetch_failed", current.host);
      }

      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) return fail("fetch_failed", current.host);
        const next = resolveRedirect(current, loc);
        if (!next) return fail("invalid_url");
        current = next;
        continue;
      }

      const body = await readBodyCapped(res);
      if (!body.ok) return fail(body.error, current.host);

      const meta = pickMeta(body.text);
      const rawText = stripHtml(body.text);
      const text = rawText.slice(0, MAX_TEXT_LENGTH);
      return {
        ok: true,
        status: res.status,
        url: current.toString(),
        host: current.host,
        meta,
        text,
        thin: text.length < THIN_THRESHOLD,
      };
    }
    return fail("blocked_url");
  } finally {
    clearTimeout(timer);
  }
}
