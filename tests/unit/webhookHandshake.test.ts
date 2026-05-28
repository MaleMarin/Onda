/**
 * Tests del flujo del webhook (GET handshake y POST firma) sin tocar la
 * lógica conversacional. Se mockean las dependencias pesadas para que el
 * import del route no arrastre fetch a OpenAI, KV, etc.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@vercel/kv", () => ({
  kv: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
    ttl: vi.fn().mockResolvedValue(-2),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
  },
}));

vi.mock("@/lib/ondaReply", () => ({
  getOndaReply: vi.fn(),
  getOndaReplyWithImage: vi.fn(),
}));

vi.mock("@/lib/transcribe", () => ({ transcribeAudio: vi.fn() }));
vi.mock("@/lib/tts", () => ({ generateSpeech: vi.fn() }));
vi.mock("@/lib/generateImage", () => ({ generateImageFromText: vi.fn() }));
vi.mock("@/lib/infographic", () => ({ renderInfographicPng: vi.fn() }));

import { signMetaWebhookBody } from "@/lib/verifyWebhookSignature";

const TEST_SECRET = "secret-app-secret-32-chars-min____";
const TEST_VERIFY_TOKEN = "verify-token-test";

beforeEach(() => {
  process.env.WHATSAPP_WEBHOOK_SECRET = TEST_SECRET;
  process.env.WHATSAPP_VERIFY_TOKEN = TEST_VERIFY_TOKEN;
  Object.assign(process.env, { NODE_ENV: "test" });
});

async function importRoute() {
  return await import("@/app/api/webhook/route");
}

describe("GET /api/webhook — handshake de Meta", () => {
  it("token correcto → devuelve el challenge tal cual", async () => {
    const route = await importRoute();
    const url = `https://x.test/api/webhook?hub.mode=subscribe&hub.verify_token=${TEST_VERIFY_TOKEN}&hub.challenge=12345`;
    const res = await route.GET(new Request(url));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("12345");
  });

  it("token incorrecto → 403 Forbidden", async () => {
    const route = await importRoute();
    const url = `https://x.test/api/webhook?hub.mode=subscribe&hub.verify_token=WRONG&hub.challenge=12345`;
    const res = await route.GET(new Request(url));
    expect(res.status).toBe(403);
  });

  it("mode != subscribe → 403", async () => {
    const route = await importRoute();
    const url = `https://x.test/api/webhook?hub.mode=other&hub.verify_token=${TEST_VERIFY_TOKEN}&hub.challenge=12345`;
    const res = await route.GET(new Request(url));
    expect(res.status).toBe(403);
  });

  it("sin parámetros y en producción sin diag token → respuesta genérica (no expone env)", async () => {
    Object.assign(process.env, { NODE_ENV: "production" });
    delete process.env.WHATSAPP_DIAG_TOKEN;
    delete process.env.WHATSAPP_WEBHOOK_SECRET;
    const route = await importRoute();
    const res = await route.GET(new Request("https://x.test/api/webhook"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.env_flags).toBeUndefined();
    expect(body.whatsapp).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain("documentation");
  });
});

describe("POST /api/webhook — verificación de firma", () => {
  it("sin firma → 401 INVALID_WEBHOOK_SIGNATURE", async () => {
    const route = await importRoute();
    const body = JSON.stringify({ entry: [] });
    const res = await route.POST(
      new Request("https://x.test/api/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      })
    );
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.code).toBe("INVALID_WEBHOOK_SIGNATURE");
  });

  it("firma incorrecta → 401", async () => {
    const route = await importRoute();
    const body = JSON.stringify({ entry: [] });
    const res = await route.POST(
      new Request("https://x.test/api/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-hub-signature-256": "sha256=00".padEnd(7 + 64, "0"),
        },
        body,
      })
    );
    expect(res.status).toBe(401);
  });

  it("firma correcta con payload vacío (sin messages) → 200", async () => {
    const route = await importRoute();
    const body = JSON.stringify({ entry: [] });
    const sig = signMetaWebhookBody(TEST_SECRET, body);
    const res = await route.POST(
      new Request("https://x.test/api/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-hub-signature-256": sig },
        body,
      })
    );
    expect(res.status).toBe(200);
  });

  it("sin WHATSAPP_WEBHOOK_SECRET → 503 (no procesa nada)", async () => {
    delete process.env.WHATSAPP_WEBHOOK_SECRET;
    const route = await importRoute();
    const res = await route.POST(
      new Request("https://x.test/api/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
    );
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.code).toBe("MISSING_WHATSAPP_WEBHOOK_SECRET");
  });
});

describe("POST /api/webhook — dedupe + 200 OK rápido", () => {
  it("responde 200 incluso con un mensaje de texto válido (procesamiento en background)", async () => {
    const route = await importRoute();
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: "wamid.test_dedupe_1",
                    from: "5491112345678",
                    type: "text",
                    text: { body: "hola" },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const body = JSON.stringify(payload);
    const sig = signMetaWebhookBody(TEST_SECRET, body);

    const start = Date.now();
    const res = await route.POST(
      new Request("https://x.test/api/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-hub-signature-256": sig },
        body,
      })
    );
    const elapsed = Date.now() - start;
    expect(res.status).toBe(200);
    // No debe colgarse sincrónicamente esperando OpenAI ni KV largos.
    // El timeout aquí es laxo (vitest default 30s) pero el contrato del
    // refactor es: 200 inmediato. Si esto sube de varios segundos en CI con
    // mocks, hay un await que no debería estar en el path síncrono.
    expect(elapsed).toBeLessThan(5000);
  });
});
