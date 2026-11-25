import { describe, it, expect } from "vitest";
import { buildDelightMoment, buildEmotionalValidation, buildVoiceBlock, detectEmotionalLoad, getVoiceProfile } from "@/lib/ondaVoice";
import { EjeOnda } from "@/content/types";

describe("voces editoriales diferenciadas", () => {
  it("A Mano abre espacio a intereses amplios", () => {
    const block = buildVoiceBlock(EjeOnda.A_MANO);
    expect(block).toMatch(/música|cine|deporte/i);
    expect(block).toMatch(/no reduzcas la conversaci[oó]n a alfabetizaci[oó]n medi[aá]tica/i);
  });
  it("Cívita no presupone experticia y contempla Brasil", () => {
    const block = buildVoiceBlock(EjeOnda.CIVITA);
    expect(block).toContain("cualquier persona");
    expect(block).toContain("Brasil");
    expect(block).toContain("neutralidad partidaria");
  });
  it("Profes pregunta, comprende y co-diseña", () => {
    const block = buildVoiceBlock(EjeOnda.PROFES);
    expect(block).toContain("UNA sola pregunta importante");
    expect(block).toContain("diseña");
    expect(block).toContain("docente");
  });
  it("las tres voces son distintas y el perfil coincide con el eje", () => {
    const voices = [EjeOnda.A_MANO, EjeOnda.CIVITA, EjeOnda.PROFES].map((eje) => buildVoiceBlock(eje));
    expect(new Set(voices).size).toBe(3);
    for (const eje of [EjeOnda.A_MANO, EjeOnda.CIVITA, EjeOnda.PROFES]) {
      expect(getVoiceProfile(eje).eje).toBe(eje);
    }
  });
});

describe("funciones de acompañamiento existentes", () => {
  it("detecta carga emocional y mantiene respuesta empática", () => {
    expect(detectEmotionalLoad("me da miedo lo que está pasando")).toBe("anxiety");
    expect(buildEmotionalValidation("anxiety", EjeOnda.A_MANO).length).toBeGreaterThan(20);
  });
  it("no añade cierres automáticos que desvíen la conversación", () => {
    for (const canal of ["web", "whatsapp"] as const) {
      for (const intent of ["fact_check", "explanation", "action", "emotional", "disinformation"] as const) {
        expect(buildDelightMoment(intent, canal)).toBe("");
      }
    }
  });
});
