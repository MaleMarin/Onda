import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildSafeWaLog, diagnosticAllowed, hashPhone, redactText } from "@/lib/waSafeLog";

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_LOG_DEBUG = process.env.WHATSAPP_LOG_DEBUG;
const ORIGINAL_PEPPER = process.env.WHATSAPP_LOG_PEPPER;
const ORIGINAL_DIAG = process.env.WHATSAPP_DIAG_TOKEN;
const ORIGINAL_SECRET = process.env.WHATSAPP_WEBHOOK_SECRET;

function setEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete (process.env as Record<string, string | undefined>)[key];
  } else {
    (process.env as Record<string, string | undefined>)[key] = value;
  }
}

afterEach(() => {
  setEnv("NODE_ENV", ORIGINAL_NODE_ENV);
  setEnv("WHATSAPP_LOG_DEBUG", ORIGINAL_LOG_DEBUG);
  setEnv("WHATSAPP_LOG_PEPPER", ORIGINAL_PEPPER);
  setEnv("WHATSAPP_DIAG_TOKEN", ORIGINAL_DIAG);
  setEnv("WHATSAPP_WEBHOOK_SECRET", ORIGINAL_SECRET);
});

describe("hashPhone", () => {
  it("no expone el número completo y mantiene los últimos 2 dígitos como pista", () => {
    setEnv("WHATSAPP_LOG_PEPPER", "pepper-test");
    const phone = "+5491112345678";
    const h = hashPhone(phone);
    expect(h).not.toContain("12345678");
    expect(h).not.toContain("549");
    expect(h).toMatch(/^wa:[0-9a-f]{12}:\.\.78$/);
  });

  it("hash determinístico para el mismo número (sirve para correlacionar logs)", () => {
    setEnv("WHATSAPP_LOG_PEPPER", "pepper-test");
    expect(hashPhone("+5491112345678")).toBe(hashPhone("549 1112345678"));
  });

  it("número vacío → wa:unknown", () => {
    expect(hashPhone(null)).toBe("wa:unknown");
    expect(hashPhone(undefined)).toBe("wa:unknown");
    expect(hashPhone("")).toBe("wa:unknown");
  });
});

describe("redactText (privacidad de logs)", () => {
  it("PRODUCCIÓN sin LOG_DEBUG: nunca incluye el texto del usuario, sólo longitud", () => {
    setEnv("NODE_ENV", "production");
    setEnv("WHATSAPP_LOG_DEBUG", "");
    const txt = "información médica confidencial y un teléfono +54 911 1234 5678";
    const out = redactText(txt);
    expect(out).not.toContain("médica");
    expect(out).not.toContain("1234");
    expect(out).toMatch(/^<len=\d+>$/);
  });

  it("DESARROLLO: incluye preview corto pero recortado", () => {
    setEnv("NODE_ENV", "development");
    const out = redactText("hola, esto es un mensaje un poco largo para probar el preview");
    expect(out).toContain("hola");
    expect(out).toContain("<len=");
  });

  it("PRODUCCIÓN con WHATSAPP_LOG_DEBUG=1 sí incluye preview (escotilla explícita)", () => {
    setEnv("NODE_ENV", "production");
    setEnv("WHATSAPP_LOG_DEBUG", "1");
    const out = redactText("dato sensible");
    expect(out).toContain("dato sensible");
  });
});

describe("buildSafeWaLog", () => {
  it("nunca expone el número en claro y respeta redactText", () => {
    setEnv("NODE_ENV", "production");
    setEnv("WHATSAPP_LOG_DEBUG", "");
    const log = buildSafeWaLog({ phone: "+5491112345678", text: "mensaje secreto del usuario" });
    expect(JSON.stringify(log)).not.toContain("12345678");
    expect(JSON.stringify(log)).not.toContain("mensaje secreto");
    expect(log.phoneHash).toBeTruthy();
    expect(log.text).toMatch(/^<len=\d+>$/);
  });
});

describe("diagnosticAllowed (GET /api/webhook en producción)", () => {
  it("en producción sin token configurado → bloqueado", () => {
    setEnv("NODE_ENV", "production");
    setEnv("WHATSAPP_DIAG_TOKEN", "");
    setEnv("WHATSAPP_WEBHOOK_SECRET", "");
    const req = new Request("https://example.com/api/webhook");
    expect(diagnosticAllowed(req)).toBe(false);
  });

  it("en producción con header correcto → permitido", () => {
    setEnv("NODE_ENV", "production");
    setEnv("WHATSAPP_DIAG_TOKEN", "diag-secret-1234");
    const req = new Request("https://example.com/api/webhook", {
      headers: { "x-onda-diag-token": "diag-secret-1234" },
    });
    expect(diagnosticAllowed(req)).toBe(true);
  });

  it("en producción con header incorrecto → bloqueado", () => {
    setEnv("NODE_ENV", "production");
    setEnv("WHATSAPP_DIAG_TOKEN", "diag-secret-1234");
    const req = new Request("https://example.com/api/webhook", {
      headers: { "x-onda-diag-token": "wrong-token-xxxx" },
    });
    expect(diagnosticAllowed(req)).toBe(false);
  });

  it("en desarrollo siempre permitido (no bloquea el flujo local)", () => {
    setEnv("NODE_ENV", "development");
    const req = new Request("https://example.com/api/webhook");
    expect(diagnosticAllowed(req)).toBe(true);
  });
});
