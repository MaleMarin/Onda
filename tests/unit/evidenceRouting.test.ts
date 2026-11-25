import { describe, it, expect } from "vitest";
import { EjeOnda } from "@/content/types";
import { needsExternalEvidence, missingEvidenceContext } from "@/lib/evidenceRouting";

describe("activación de evidencia de Onda", () => {
  it("no busca por rutina en las tres experiencias", () => {
    expect(needsExternalEvidence("Recomiéndame una película que me sorprenda", EjeOnda.A_MANO)).toBe(false);
    expect(needsExternalEvidence("Quiero diseñar una actividad de 45 minutos sobre escritura", EjeOnda.PROFES)).toBe(false);
    expect(needsExternalEvidence("¿Qué es un algoritmo?", EjeOnda.A_MANO)).toBe(false);
  });
  it("busca cuando se piden fuentes explícitas", () => {
    expect(needsExternalEvidence("¿Qué es un algoritmo?", EjeOnda.A_MANO, true)).toBe(true);
  });
  it("detecta legislación y hechos públicos por país", () => {
    expect(needsExternalEvidence("¿Qué dice la ley de protección de datos de Brasil?", EjeOnda.CIVITA)).toBe(true);
    expect(needsExternalEvidence("¿Cuál es la inflación actual en Chile?", EjeOnda.CIVITA)).toBe(true);
    expect(needsExternalEvidence("¿Ya aprobaron la reforma educativa?", EjeOnda.CIVITA)).toBe(true);
  });
  it("busca marcos curriculares específicos", () => {
    expect(needsExternalEvidence("¿Qué exige la BNCC de Brasil?", EjeOnda.PROFES)).toBe(true);
  });
  it("la falta de búsqueda no se presenta como verificación", () => {
    expect(missingEvidenceContext(false, "es-LATAM")).toContain("No afirmes");
    expect(missingEvidenceContext(false, "pt-BR")).toContain("Não afirme");
  });
});
