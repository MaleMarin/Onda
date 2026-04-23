import { describe, it, expect } from "vitest";
import { EjeOnda } from "@/content/types";
import {
  buildRiskFlagsForTelemetry,
  detectTopicTags,
  sanitizeTextForTelemetry,
  userRequestedTelemetryOptOut,
} from "@/lib/insightsTagger";
import { computeRiskPipelineFlags } from "@/lib/riskModes";

describe("sanitizeTextForTelemetry", () => {
  it("elimina emails y teléfonos y acorta URLs a dominio", () => {
    const raw =
      "Hola contacto@banco.com llama al +56 9 8765 4321 y mira https://ejemplo.com/path?x=1 fin";
    const s = sanitizeTextForTelemetry(raw);
    expect(s).not.toMatch(/contacto@/);
    expect(s).toContain("[REDACTED]");
    expect(s).toContain("[url:ejemplo.com]");
    expect(s).not.toContain("https://");
  });
});

describe("userRequestedTelemetryOptOut", () => {
  it("detecta pedidos de no guardar", () => {
    expect(userRequestedTelemetryOptOut("no guardar analítica por favor")).toBe(true);
    expect(userRequestedTelemetryOptOut("¿Qué es phishing?")).toBe(false);
  });
});

describe("detectTopicTags", () => {
  it("añade tags típicos de estafa y eje", () => {
    const risk = buildRiskFlagsForTelemetry(
      computeRiskPipelineFlags("me llegó una estafa del banco con link", false, EjeOnda.A_MANO, "es-LATAM"),
      "me llegó una estafa del banco con link",
      "es-LATAM"
    );
    const tags = detectTopicTags(
      "me llegó una estafa del banco con link",
      EjeOnda.A_MANO,
      risk,
      true,
      false,
      false
    );
    expect(tags).toContain("eje_a_mano");
    expect(tags.some((t) => t.includes("estafa") || t.includes("banco"))).toBe(true);
  });
});
