import { describe, it, expect } from "vitest";
import { countInfographicActionSteps, countInfographicImportantBullets } from "./infographicHeuristics";

describe("infographicHeuristics", () => {
  const pt = `TITULO: T\nO_ESSENCIAL:\n- a\n- b\n- c\nPOR_QUE_IMPORTA:\n- w\nO_QUE_FAZER_AGORA:\n1) x\n2) y\n3) z\nFONTES: x\n\n[ONDA_FORMATO:infografia]`;

  it("cuenta bullets en O_ESSENCIAL", () => {
    expect(countInfographicImportantBullets(pt)).toBe(3);
  });

  it("cuenta pasos en O_QUE_FAZER_AGORA", () => {
    expect(countInfographicActionSteps(pt)).toBe(3);
  });

  const es = `TITULO: T\nLO_IMPORTANTE:\n- a\n- b\nPOR_QUE_IMPORTA:\n- w\nQUE_HACER_AHORA:\n1) u\n2) v\nFUENTES: z\n`;

  it("cuenta bullets en LO_IMPORTANTE", () => {
    expect(countInfographicImportantBullets(es)).toBe(2);
  });
});
