import { describe, it, expect } from "vitest";
import { EjeOnda } from "@/content/types";
import { shouldInviteContribution } from "@/lib/onda/contributions/shouldInviteContribution";
import { buildListeningInvitePayload } from "@/lib/onda/contributions/web";

describe("shouldInviteContribution", () => {
  it("no invita en emergencia", () => {
    const r = shouldInviteContribution({
      channel: "web",
      userText: "me hackearon la cuenta del banco ayuda",
      conversationIntent: "fact_check",
      detectedIntent: "estafa",
      riskPipeline: { emergency: true, sensitive: false, pantallazoDetective: false, disinfo360: false },
      riskScamTelemetry: true,
      riskSensitiveTelemetry: false,
      eje: EjeOnda.A_MANO,
      assistantResponseChars: 200,
      alreadyInvitedInConversation: false,
      locale: "es-LATAM",
      promptSeed: "x",
    });
    expect(r.shouldInvite).toBe(false);
  });

  it("invita en estafa / scam telemetry", () => {
    const r = shouldInviteContribution({
      channel: "web",
      userText: "me llegó un mensaje del banco con un link raro",
      conversationIntent: "fact_check",
      detectedIntent: "estafa",
      riskPipeline: { emergency: false, sensitive: false, pantallazoDetective: false, disinfo360: false },
      riskScamTelemetry: true,
      riskSensitiveTelemetry: false,
      eje: EjeOnda.A_MANO,
      assistantResponseChars: 200,
      alreadyInvitedInConversation: false,
      locale: "es-LATAM",
      promptSeed: "x",
    });
    expect(r.shouldInvite).toBe(true);
    expect(r.suggestedPrompt?.length).toBeGreaterThan(10);
  });

  it("no invita con mensaje muy corto", () => {
    const r = shouldInviteContribution({
      channel: "web",
      userText: "hola",
      conversationIntent: "explanation",
      detectedIntent: "general",
      riskPipeline: { emergency: false, sensitive: false, pantallazoDetective: false, disinfo360: false },
      riskScamTelemetry: false,
      riskSensitiveTelemetry: false,
      eje: EjeOnda.CIVITA,
      assistantResponseChars: 200,
      alreadyInvitedInConversation: false,
      locale: "es-LATAM",
      promptSeed: "x",
    });
    expect(r.shouldInvite).toBe(false);
  });

  it("no invita si ya hubo invitación en la conversación", () => {
    const r = shouldInviteContribution({
      channel: "web",
      userText: "¿Es verdad que esta cadena de WhatsApp sobre el banco es phishing?",
      conversationIntent: "fact_check",
      detectedIntent: "estafa",
      riskPipeline: { emergency: false, sensitive: false, pantallazoDetective: false, disinfo360: false },
      riskScamTelemetry: true,
      riskSensitiveTelemetry: false,
      eje: EjeOnda.A_MANO,
      assistantResponseChars: 200,
      alreadyInvitedInConversation: true,
      locale: "es-LATAM",
      promptSeed: "x",
    });
    expect(r.shouldInvite).toBe(false);
  });
});

describe("buildListeningInvitePayload", () => {
  it("web: contexto de escucha sin formulario inmediato (expectingExperienceFollowUp)", () => {
    const p = buildListeningInvitePayload({
      channel: "web",
      locale: "es-LATAM",
      userText: "¿Es verdad que esta cadena de WhatsApp sobre el banco es phishing?",
      assistantText: "Aquí va una respuesta modelo sobre phishing y pasos a seguir.",
      conversationIntent: "fact_check",
      detectedIntent: "estafa",
      riskPipeline: { emergency: false, sensitive: false, pantallazoDetective: false, disinfo360: false },
      riskScamTelemetry: true,
      riskSensitiveTelemetry: false,
      eje: EjeOnda.A_MANO,
      turnToken: "11111111-1111-4111-8111-111111111111",
      alreadyInvitedInConversation: false,
    });
    expect(p).not.toBeNull();
    expect(p?.show).toBe(false);
    expect(p?.expectingExperienceFollowUp).toBe(true);
    expect(p?.turnToken).toBe("11111111-1111-4111-8111-111111111111");
    expect(p?.prompt).toBe("");
  });

  it("whatsapp: sigue mostrando prompt explícito en segundo paso", () => {
    const p = buildListeningInvitePayload({
      channel: "whatsapp",
      locale: "es-LATAM",
      userText: "¿Es verdad que esta cadena de WhatsApp sobre el banco es phishing?",
      assistantText: "Aquí va una respuesta modelo sobre phishing y pasos a seguir.",
      conversationIntent: "fact_check",
      detectedIntent: "estafa",
      riskPipeline: { emergency: false, sensitive: false, pantallazoDetective: false, disinfo360: false },
      riskScamTelemetry: true,
      riskSensitiveTelemetry: false,
      eje: EjeOnda.A_MANO,
      turnToken: "22222222-2222-4222-8222-222222222222",
      alreadyInvitedInConversation: false,
    });
    expect(p).not.toBeNull();
    expect(p?.show).toBe(true);
    expect(p?.prompt.length).toBeGreaterThan(10);
  });
});
