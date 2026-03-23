import { describe, it, expect } from "vitest";
import { buildIntentContextBlock, classifyIntent } from "@/lib/intentClassifier";

describe("classifyIntent", () => {
  const cases: Array<[string, string, boolean, "high" | "low"]> = [
    ["¿Es verdad que el 5G causa cáncer?", "fact_check", true, "high"],
    ["¿es cierto que Musk compró Twitter?", "fact_check", true, "high"],
    ["¿Cómo funcionan los algoritmos de TikTok?", "explanation", false, "high"],
    ["explícame qué es un deepfake", "explanation", false, "high"],
    ["¿qué hago si me hackean el WhatsApp?", "action", false, "high"],
    ["¿cómo denuncio una cuenta falsa?", "action", false, "high"],
    ["ya no sé en qué creer, estoy agotado", "emotional", false, "high"],
    ["me angustia lo que leo en redes", "explanation", false, "low"],
    ["me llegó un audio que dice que el presidente renunció", "disinformation", true, "high"],
    ["circula un video de un político diciendo algo raro", "explanation", false, "low"],
  ];

  cases.forEach(([message, expectedIntent, expectedRagNeeded, expectedConfidence]) => {
    it(`clasifica "${message.slice(0, 40)}..." como ${expectedIntent}`, () => {
      const result = classifyIntent(message);
      expect(result.intent).toBe(expectedIntent);
      expect(result.ragNeeded).toBe(expectedRagNeeded);
      expect(result.confidence).toBe(expectedConfidence);
    });
  });

  it("fallback a explanation con low confidence", () => {
    const result = classifyIntent("hola, ¿cómo estás?");
    expect(result.intent).toBe("explanation");
    expect(result.confidence).toBe("low");
  });
});

describe("buildIntentContextBlock", () => {
  const intents = [
    "fact_check",
    "explanation",
    "action",
    "emotional",
    "disinformation",
  ] as const;

  it("incluye tipo detectado y orientación por intent", () => {
    for (const intent of intents) {
      const block = buildIntentContextBlock({
        intent,
        ragNeeded: intent === "fact_check",
        confidence: "high",
      });
      expect(block).toContain(intent);
      expect(block).toContain("Orientación");
    }
  });

  it("añade nota de baja confianza", () => {
    const block = buildIntentContextBlock({
      intent: "explanation",
      ragNeeded: false,
      confidence: "low",
    });
    expect(block.toLowerCase()).toContain("confianza baja");
  });
});
