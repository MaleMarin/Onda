/**
 * Verifica que .env.example y example.env documenten TODAS las variables
 * críticas para WhatsApp en producción. Si alguien borra accidentalmente
 * una variable obligatoria, este test rompe.
 */

import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const CRITICAL_VARS = [
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_BUSINESS_ACCOUNT_ID",
  "WHATSAPP_VERIFY_TOKEN",
  "WHATSAPP_WEBHOOK_SECRET",
  "WHATSAPP_APP_SECRET",
  "META_APP_SECRET",
  "GRAPH_VERSION",
  "WHATSAPP_TEMPLATE_REACTIVATION",
  "WHATSAPP_TEMPLATE_WELCOME_OPTIN",
  "WHATSAPP_TEMPLATE_SERVICE_NOTICE",
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
];

function readFile(rel: string): string {
  return fs.readFileSync(path.resolve(__dirname, "../../", rel), "utf8");
}

describe(".env.example contiene variables críticas", () => {
  const file = readFile(".env.example");
  for (const v of CRITICAL_VARS) {
    it(`incluye ${v}`, () => {
      expect(file).toMatch(new RegExp(`(?:^|\\n)${v}=`, "m"));
    });
  }

  it("no contiene valores reales (sólo claves vacías o placeholders)", () => {
    // Heurística defensiva: ningún token de Meta (EAA...) debe aparecer.
    expect(file).not.toMatch(/EAA[A-Za-z0-9_-]{20,}/);
    // No debería contener strings que parezcan claves reales de OpenAI.
    expect(file).not.toMatch(/sk-[A-Za-z0-9]{20,}/);
  });
});

describe("example.env contiene variables críticas", () => {
  const file = readFile("example.env");
  for (const v of CRITICAL_VARS) {
    it(`incluye ${v}`, () => {
      expect(file).toMatch(new RegExp(`(?:^|\\n)${v}=`, "m"));
    });
  }
});
