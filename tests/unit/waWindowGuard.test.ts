import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeWindowAwareSender } from "@/lib/waWindowGuard";

const PHONE = "5491112345678";
const REQ = "req-test-1";

describe("makeWindowAwareSender (ventana 24h)", () => {
  beforeEach(() => {
    delete process.env.WHATSAPP_TEMPLATE_REACTIVATION;
    delete process.env.WHATSAPP_TEMPLATE_LANGUAGE;
  });

  it("ventana abierta: envía texto libre normalmente", async () => {
    const sendText = vi.fn().mockResolvedValue({ ok: true });
    const sendTemplate = vi.fn();
    const send = makeWindowAwareSender(PHONE, REQ, {
      isWindowActiveFn: async () => true,
      sendTextFn: sendText,
      sendTemplateFn: sendTemplate,
    });
    const r = await send("hola mundo");
    expect(r.ok).toBe(true);
    expect(sendText).toHaveBeenCalledWith(PHONE, "hola mundo");
    expect(sendTemplate).not.toHaveBeenCalled();
  });

  it("ventana cerrada + sin template configurado: NO envía nada y devuelve error", async () => {
    const sendText = vi.fn();
    const sendTemplate = vi.fn();
    const send = makeWindowAwareSender(PHONE, REQ, {
      isWindowActiveFn: async () => false,
      sendTextFn: sendText,
      sendTemplateFn: sendTemplate,
    });
    const r = await send("hola mundo");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("window-closed-no-template");
    expect(sendText).not.toHaveBeenCalled();
    expect(sendTemplate).not.toHaveBeenCalled();
  });

  it("ventana cerrada + template configurada: envía SOLO la plantilla (no texto libre)", async () => {
    process.env.WHATSAPP_TEMPLATE_REACTIVATION = "onda_reactivacion_v1";
    process.env.WHATSAPP_TEMPLATE_LANGUAGE = "es";
    const sendText = vi.fn();
    const sendTemplate = vi.fn().mockResolvedValue({ ok: true });
    const send = makeWindowAwareSender(PHONE, REQ, {
      isWindowActiveFn: async () => false,
      sendTextFn: sendText,
      sendTemplateFn: sendTemplate,
    });
    const r = await send("respuesta del modelo");
    expect(r.ok).toBe(true);
    expect(sendText).not.toHaveBeenCalled();
    expect(sendTemplate).toHaveBeenCalledWith(PHONE, "onda_reactivacion_v1", [], "es");
  });

  it("ventana cerrada: el segundo envío del turno se suprime (no spam de plantilla)", async () => {
    process.env.WHATSAPP_TEMPLATE_REACTIVATION = "onda_reactivacion_v1";
    const sendTemplate = vi.fn().mockResolvedValue({ ok: true });
    const send = makeWindowAwareSender(PHONE, REQ, {
      isWindowActiveFn: async () => false,
      sendTextFn: vi.fn(),
      sendTemplateFn: sendTemplate,
    });
    await send("parte 1");
    const r2 = await send("parte 2");
    expect(r2.ok).toBe(false);
    expect(r2.error).toBe("window-closed-template-already-sent");
    expect(sendTemplate).toHaveBeenCalledTimes(1);
  });

  it("from='unknown': trata como ventana abierta (caso edge sin número)", async () => {
    const sendText = vi.fn().mockResolvedValue({ ok: true });
    const send = makeWindowAwareSender("unknown", REQ, {
      isWindowActiveFn: async () => false, // ignored para 'unknown'
      sendTextFn: sendText,
      sendTemplateFn: vi.fn(),
    });
    const r = await send("aviso");
    expect(r.ok).toBe(true);
    expect(sendText).toHaveBeenCalled();
  });

  it("texto vacío no se envía", async () => {
    const sendText = vi.fn();
    const send = makeWindowAwareSender(PHONE, REQ, {
      isWindowActiveFn: async () => true,
      sendTextFn: sendText,
      sendTemplateFn: vi.fn(),
    });
    const r = await send("   ");
    expect(r.ok).toBe(false);
    expect(sendText).not.toHaveBeenCalled();
  });
});
