import { describe, it, expect } from "vitest";
import { EjeOnda } from "@/content/types";
import { buildListeningStreamPayload, shouldOfferStructuredListening } from "@/lib/listeningInvite";

describe("shouldOfferStructuredListening", () => {
  it("no invita en emergencia", () => {
    expect(
      shouldOfferStructuredListening({
        userText: "me hackearon la cuenta del banco ayuda",
        conversationIntent: "fact_check",
        detectedIntent: "estafa",
        riskPipeline: { emergency: true, sensitive: false, pantallazoDetective: false },
        riskScamTelemetry: true,
        riskSensitiveTelemetry: false,
        eje: EjeOnda.A_MANO,
      })
    ).toBe(false);
  });

  it("invita en estafa / scam telemetry", () => {
    expect(
      shouldOfferStructuredListening({
        userText: "me llegó un mensaje del banco con un link raro",
        conversationIntent: "fact_check",
        detectedIntent: "estafa",
        riskPipeline: { emergency: false, sensitive: false, pantallazoDetective: false },
        riskScamTelemetry: true,
        riskSensitiveTelemetry: false,
        eje: EjeOnda.A_MANO,
      })
    ).toBe(true);
  });

  it("no invita con mensaje muy corto", () => {
    expect(
      shouldOfferStructuredListening({
        userText: "hola",
        conversationIntent: "explanation",
        detectedIntent: "general",
        riskPipeline: { emergency: false, sensitive: false, pantallazoDetective: false },
        riskScamTelemetry: false,
        riskSensitiveTelemetry: false,
        eje: EjeOnda.CIVITA,
      })
    ).toBe(false);
  });
});

describe("buildListeningStreamPayload", () => {
  it("devuelve payload cuando aplica", () => {
    const p = buildListeningStreamPayload({
      locale: "es-LATAM",
      userText: "¿Es verdad que esta cadena de WhatsApp sobre el banco es phishing?",
      assistantText: "Aquí va una respuesta modelo sobre phishing y pasos a seguir.",
      conversationIntent: "fact_check",
      detectedIntent: "estafa",
      riskPipeline: { emergency: false, sensitive: false, pantallazoDetective: false },
      riskScamTelemetry: true,
      riskSensitiveTelemetry: false,
      eje: EjeOnda.A_MANO,
      turnToken: "11111111-1111-4111-8111-111111111111",
    });
    expect(p).not.toBeNull();
    expect(p?.show).toBe(true);
    expect(p?.turnToken).toBe("11111111-1111-4111-8111-111111111111");
    expect(p?.prompt.length).toBeGreaterThan(10);
  });
});
