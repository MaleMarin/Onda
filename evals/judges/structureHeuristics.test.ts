import { describe, it, expect } from "vitest";
import { passesScanStructure60s } from "./structureHeuristics";

describe("passesScanStructure60s", () => {
  it("acepta bullets y pasos 1. 2. 3.", () => {
    const t = `Una frase inicial clara que introduce el tema con suficiente contexto para superar el umbral mínimo de longitud del chequeo de estructura.\n\n- a\n- b\n- c\n\n1) primero\n2) segundo\n3) tercero\n`;
    expect(passesScanStructure60s(t)).toBe(true);
  });

  it("rechaza texto sin pasos numerados", () => {
    const t = `Solo párrafo largo sin lista ni numeración suficiente. `.repeat(5);
    expect(passesScanStructure60s(t)).toBe(false);
  });
});
