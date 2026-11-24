import { describe, it, expect } from "vitest";
import { buildOndaSystemContent, buildFallbackRouteOrder, getOrchestratorRoute, ONDA_PRIORIDADES_CRITICAS } from "@/lib/ondaReply";
import { buildVoiceBlock } from "@/lib/ondaVoice";
import { EjeOnda } from "@/content/types";

describe("acuerdos editoriales Onda: regresiones", () => {
  it("mantiene la protección ante inyección y los derechos humanos", () => {
    const prompt = buildOndaSystemContent({ eje: EjeOnda.A_MANO });
    expect(prompt).toContain("SEGURIDAD ANTI-MANIPULACIÓN");
    expect(prompt).toMatch(/Derechos Humanos|direitos humanos/i);
  });
  it("la prioridad editorial se coloca al FINAL del prompt", () => {
    const prompt = buildOndaSystemContent({ eje: EjeOnda.A_MANO });
    expect(prompt.endsWith(ONDA_PRIORIDADES_CRITICAS)).toBe(true);
  });
  it("A Mano incluye cultura y deportes como intereses legítimos", () => {
    const prompt = buildOndaSystemContent({ eje: EjeOnda.A_MANO });
    expect(prompt).toContain("música, cine, cultura, deportes");
    expect(prompt).toContain("A MANO");
    expect(buildVoiceBlock(EjeOnda.A_MANO)).toMatch(/deportes|música|cine/);
  });
  it("Cívita incluye Brasil y neutralidad para cualquier persona", () => {
    const prompt = buildOndaSystemContent({ eje: EjeOnda.CIVITA });
    expect(prompt).toContain("Brasil");
    expect(prompt).toContain("América Latina");
    expect(buildVoiceBlock(EjeOnda.CIVITA)).toContain("cualquier persona");
  });
  it("Profes hace preguntas pertinentes antes de diseñar", () => {
    const prompt = buildOndaSystemContent({ eje: EjeOnda.PROFES });
    expect(prompt).toContain("pregunta una o dos cosas relevantes");
    expect(buildVoiceBlock(EjeOnda.PROFES)).toContain("Antes de diseñar");
  });
  it("no trata directorios como fuentes consultadas", () => {
    const prompt = buildOndaSystemContent({ eje: EjeOnda.CIVITA, includeSourcesList: true });
    expect(prompt).toContain("NO evidencia consultada");
    expect(prompt).toContain("Solo atribuye hechos a documentos realmente recuperados");
  });
  it("las tres experiencias hacen una pregunta útil cuando falta contexto, sin cierres genéricos", () => {
    for (const eje of [EjeOnda.A_MANO, EjeOnda.CIVITA, EjeOnda.PROFES]) {
      const prompt = buildOndaSystemContent({ eje });
      expect(prompt).toContain("UNA sola pregunta");
      expect(prompt).toContain("no con un cierre genérico");
      expect(prompt).toContain("No uses a la vez una pregunta directa y botones");
    }
  });
  it("mantiene Desinformación 360 intacto", () => {
    expect(ONDA_PRIORIDADES_CRITICAS).toContain("nueve secciones de DESINFORMACIÓN 360");
  });
  it("respeta español latinoamericano y portugués brasileño", () => {
    expect(ONDA_PRIORIDADES_CRITICAS).toContain("portugués de Brasil");
  });
});

describe("selección de modelo de IA", () => {
  it("las consultas simples comienzan con mini y tienen respaldo", () => {
    expect(getOrchestratorRoute("simple")).toBe("gpt-mini");
    expect(buildFallbackRouteOrder("simple")).toEqual(["gpt-mini", "gpt-4o"]);
  });
  it("las consultas profundas usan primero el modelo avanzado", () => {
    expect(getOrchestratorRoute("deep")).toBe("gpt-4o");
    expect(buildFallbackRouteOrder("deep")[0]).toBe("gpt-4o");
    expect(buildFallbackRouteOrder("docs")[0]).toBe("gpt-4o");
  });
});
