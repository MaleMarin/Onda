import { describe, it, expect } from "vitest";
import { isOptOutMessage, isOptInMessage } from "@/lib/waCompliance";

describe("isOptOutMessage", () => {
  const optOuts = ["STOP", "parar", "Detener", "BASTA", "no mas", "no más", "cancelar", "salir"];
  optOuts.forEach((word) => {
    it(`detecta opt-out: "${word}"`, () => {
      expect(isOptOutMessage(word)).toBe(true);
    });
  });

  it("no confunde mensaje normal con opt-out", () => {
    expect(isOptOutMessage("¿cómo verifico una noticia?")).toBe(false);
    expect(isOptOutMessage("quiero aprender más")).toBe(false);
  });
});

describe("isOptInMessage", () => {
  const optIns = ["hola", "Hola", "inicio", "START", "comenzar"];
  optIns.forEach((word) => {
    it(`detecta opt-in: "${word}"`, () => {
      expect(isOptInMessage(word)).toBe(true);
    });
  });
});
