import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { sendWhatsAppTemplate } from "@/lib/whatsapp";

const ORIG_FETCH = globalThis.fetch;

beforeAll(() => {
  process.env.WHATSAPP_ACCESS_TOKEN = "EAAtest";
  process.env.WHATSAPP_PHONE_NUMBER_ID = "1234567890";
  process.env.GRAPH_VERSION = "v24.0";
});

afterAll(() => {
  globalThis.fetch = ORIG_FETCH;
});

describe("sendWhatsAppTemplate", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rechaza si templateName está vacío (no inventamos nombres no aprobados por Meta)", async () => {
    const r = await sendWhatsAppTemplate("549111111", "", [], "es");
    expect(r.ok).toBe(false);
    expect(r.error).toContain("templateName vacío");
  });

  it("hace POST a /messages con type=template y la estructura que pide Meta", async () => {
    const calls: Array<{ url: unknown; init: RequestInit }> = [];
    globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
      calls.push({ url, init: init ?? {} });
      return new Response(JSON.stringify({ messages: [{ id: "wamid.x" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof globalThis.fetch;

    const r = await sendWhatsAppTemplate("+549 11 1234-5678", "onda_reactivacion_v1", ["Mariana"], "es_AR");
    expect(r.ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(String(calls[0].url)).toContain("/v24.0/1234567890/messages");
    const body = JSON.parse(calls[0].init.body as string);
    expect(body.messaging_product).toBe("whatsapp");
    expect(body.to).toBe("5491112345678");
    expect(body.type).toBe("template");
    expect(body.template.name).toBe("onda_reactivacion_v1");
    expect(body.template.language).toEqual({ code: "es_AR" });
    expect(body.template.components[0].type).toBe("body");
    expect(body.template.components[0].parameters[0]).toEqual({ type: "text", text: "Mariana" });
  });

  it("sin params no incluye 'components' (válido para plantillas sin variables)", async () => {
    const calls: Array<{ url: unknown; init: RequestInit }> = [];
    globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
      calls.push({ url, init: init ?? {} });
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof globalThis.fetch;

    await sendWhatsAppTemplate("549111111", "onda_aviso_servicio_v1", [], "es");
    const body = JSON.parse(calls[0].init.body as string);
    expect(body.template.components).toBeUndefined();
  });

  it("propaga el código de error de Meta cuando responde 4xx", async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({ error: { message: "Template name does not exist", code: 132001 } }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )) as unknown as typeof globalThis.fetch;

    const r = await sendWhatsAppTemplate("549111111", "no_existe", [], "es");
    expect(r.ok).toBe(false);
    expect(r.code).toBe(132001);
    expect(r.error).toContain("Template name does not exist");
  });
});
