import { describe, it, expect } from "vitest";
import {
  buildMemoryContextBlock,
  buildSessionSummary,
  daysSinceSessionDate,
} from "@/lib/sessionMemory";

describe("buildSessionSummary", () => {
  it("extrae topics de mensajes del usuario", () => {
    const messages = [
      { role: "user" as const, content: "quiero saber sobre algoritmos y redes sociales" },
      { role: "model" as const, content: "los algoritmos son..." },
      { role: "user" as const, content: "y qué hay sobre deepfakes y verificación" },
    ];
    const summary = buildSessionSummary(messages, "explanation", "A_MANO");
    expect(summary.topics.length).toBeGreaterThan(0);
    expect(summary.lastIntent).toBe("explanation");
    expect(summary.lastEje).toBe("A_MANO");
  });

  it("prioriza snippets de usuario (no palabras sueltas como lista de topics)", () => {
    const messages = [{ role: "user" as const, content: "que para con los pero como este" }];
    const summary = buildSessionSummary(messages, "explanation", "A_MANO");
    expect(summary.topics.length).toBe(1);
    expect(summary.topics[0].length).toBeGreaterThan(4);
  });
});

describe("daysSinceSessionDate", () => {
  it("retorna 0 para fecha inválida", () => {
    expect(daysSinceSessionDate("no-es-fecha")).toBe(0);
  });

  it("calcula diferencia en días UTC", () => {
    const past = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(daysSinceSessionDate(past)).toBeGreaterThanOrEqual(3);
  });
});

describe("buildMemoryContextBlock", () => {
  it("incluye los topics en el bloque", () => {
    const summary = {
      topics: ["deepfakes", "algoritmos"],
      lastIntent: "fact_check",
      lastEje: "CIVITA",
      sessionDate: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    };
    const block = buildMemoryContextBlock(summary);
    expect(block).toContain("deepfakes");
    expect(block).toContain("algoritmos");
    expect(block).toContain("fact_check");
  });
});
