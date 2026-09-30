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

  it('opt-out con mensaje exacto "BAJA"', () => {
    expect(isOptOutMessage("BAJA")).toBe(true);
  });

  it('opt-out con "baja." (signos ignorados en coincidencia exacta)', () => {
    expect(isOptOutMessage("baja.")).toBe(true);
  });

  it('no opt-out si "baja" aparece en una frase normal', () => {
    expect(isOptOutMessage("la baja de precios es falsa?")).toBe(false);
  });

  it('regresión: "stop" sigue siendo opt-out', () => {
    expect(isOptOutMessage("stop")).toBe(true);
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
