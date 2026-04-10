import { describe, it, expect } from "vitest";
import { EjeOnda } from "@/content/types";
import { parseWaEjeSelection } from "@/lib/waEjeCommands";

describe("parseWaEjeSelection", () => {
  it("detecta só a palavra Civita", () => {
    const r = parseWaEjeSelection("Cívita");
    expect(r.eje).toBe(EjeOnda.CIVITA);
    expect(r.selectionOnly).toBe(true);
  });

  it("detecta prefixo civita: resto", () => {
    const r = parseWaEjeSelection("civita: o que é um congresso?");
    expect(r.eje).toBe(EjeOnda.CIVITA);
    expect(r.remainder.toLowerCase()).toMatch(/congresso/);
    expect(r.selectionOnly).toBe(false);
  });
});
