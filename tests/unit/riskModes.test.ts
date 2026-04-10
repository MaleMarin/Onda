import { describe, expect, it } from "vitest";
import { EjeOnda } from "@/content/types";
import {
  computeRiskPipelineFlags,
  detectEmergencyKeywords,
  detectScamKeywords,
  detectScreenshotIntent,
  detectSensitiveData,
} from "@/lib/riskModes";

describe("riskModes", () => {
  it("detectEmergencyKeywords ES", () => {
    expect(detectEmergencyKeywords("me hackearon el mail", "es")).toBe(true);
    expect(detectEmergencyKeywords("me robaron", "es")).toBe(true);
    expect(detectEmergencyKeywords("hola qué tal", "es")).toBe(false);
  });

  it("detectEmergencyKeywords PT", () => {
    expect(detectEmergencyKeywords("me hackearam o instagram", "pt")).toBe(true);
    expect(detectEmergencyKeywords("roubaram minha conta do banco", "pt")).toBe(true);
    expect(detectEmergencyKeywords("bom dia", "pt")).toBe(false);
  });

  it("detectScamKeywords", () => {
    expect(detectScamKeywords("é golpe esse pix?", "pt")).toBe(true);
    expect(detectScamKeywords("es estafa de phishing", "es")).toBe(true);
  });

  it("detectScreenshotIntent", () => {
    expect(detectScreenshotIntent("te mando el pantallazo del chat", "es")).toBe(true);
    expect(detectScreenshotIntent("print da conversa", "pt")).toBe(true);
  });

  it("detectSensitiveData", () => {
    expect(detectSensitiveData("mi contraseña es secreta123")).toBe(true);
    expect(detectSensitiveData("hola mundo")).toBe(false);
  });

  it("computeRiskPipelineFlags emergency desactiva pantallazo", () => {
    const f = computeRiskPipelineFlags("me hackearon", false, EjeOnda.A_MANO, "es-LATAM");
    expect(f.emergency).toBe(true);
    expect(f.pantallazoDetective).toBe(false);
  });

  it("computeRiskPipelineFlags imagen + A_MANO activa pantallazo", () => {
    const f = computeRiskPipelineFlags("mira esta foto", true, EjeOnda.A_MANO, "es-LATAM");
    expect(f.pantallazoDetective).toBe(true);
  });

  it("computeRiskPipelineFlags Civita sin imagen no pantallazo", () => {
    const f = computeRiskPipelineFlags("es phishing?", false, EjeOnda.CIVITA, "es-LATAM");
    expect(f.pantallazoDetective).toBe(false);
  });
});
