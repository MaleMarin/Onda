import { describe, it, expect } from "vitest";
import {
  buildDelightMoment,
  buildEmotionalValidation,
  buildVoiceBlock,
  detectEmotionalLoad,
  getVoiceProfile,
} from "@/lib/ondaVoice";
import { EjeOnda } from "@/content/types";

describe("detectEmotionalLoad", () => {
  it("detecta anxiety", () => {
    expect(detectEmotionalLoad("me da miedo lo que está pasando")).toBe("anxiety");
  });
  it("detecta overwhelm", () => {
    expect(detectEmotionalLoad("estoy saturado de tanta información")).toBe("overwhelm");
  });
  it("detecta distrust", () => {
    expect(detectEmotionalLoad("ya no sé en qué confiar")).toBe("distrust");
  });
  it("detecta anger", () => {
    expect(detectEmotionalLoad("son todos mentirosos, es una vergüenza")).toBe("anger");
  });
  it("retorna none para mensaje neutro", () => {
    expect(detectEmotionalLoad("¿cómo funcionan los algoritmos?")).toBe("none");
  });
});

describe("buildVoiceBlock", () => {
  it("A_MANO menciona WhatsApp, cotidiano o foco en mensajes/noticias", () => {
    const block = buildVoiceBlock(EjeOnda.A_MANO);
    expect(block.toLowerCase()).toMatch(/whatsapp|cotidian|familiar|sencill|noticia|mensaj/);
  });
  it("CIVITA menciona rigor cívico o institucional", () => {
    const block = buildVoiceBlock(EjeOnda.CIVITA);
    expect(block.toLowerCase()).toMatch(/institucional|rigor|cívic|neutralidad|datos/);
  });
  it("PROFES menciona aula o docente", () => {
    const block = buildVoiceBlock(EjeOnda.PROFES);
    expect(block.toLowerCase()).toMatch(/aula|docente|estudiante|clase/);
  });
  it("incluye puente de escucha (experiencia propia, sin popularidad)", () => {
    const block = buildVoiceBlock(EjeOnda.A_MANO, "es-LATAM");
    expect(block.toLowerCase()).toMatch(/puente de escucha|experiencia real/);
    expect(block.toLowerCase()).not.toMatch(/talleres de alfabetización|mucha gente tiene la misma duda/);
  });
  it("los tres bloques son distintos entre sí", () => {
    const a = buildVoiceBlock(EjeOnda.A_MANO);
    const b = buildVoiceBlock(EjeOnda.CIVITA);
    const c = buildVoiceBlock(EjeOnda.PROFES);
    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
  });
});

describe("getVoiceProfile", () => {
  it("resuelve los tres ejes", () => {
    expect(getVoiceProfile(EjeOnda.A_MANO).eje).toBe(EjeOnda.A_MANO);
    expect(getVoiceProfile(EjeOnda.CIVITA).eje).toBe(EjeOnda.CIVITA);
    expect(getVoiceProfile(EjeOnda.PROFES).eje).toBe(EjeOnda.PROFES);
    expect(getVoiceProfile(null).eje).toBe(EjeOnda.A_MANO);
  });
});

describe("buildEmotionalValidation — más ejes y cargas", () => {
  it("CIVITA + anger", () => {
    const t = buildEmotionalValidation("anger", EjeOnda.CIVITA);
    expect(t.length).toBeGreaterThan(20);
  });
  it("PROFES + overwhelm", () => {
    const t = buildEmotionalValidation("overwhelm", EjeOnda.PROFES);
    expect(t.length).toBeGreaterThan(20);
  });
  it("A_MANO + anger", () => {
    const t = buildEmotionalValidation("anger", EjeOnda.A_MANO);
    expect(t.length).toBeGreaterThan(20);
  });
  it("none retorna vacío", () => {
    expect(buildEmotionalValidation("none", EjeOnda.A_MANO)).toBe("");
  });
});

describe("buildDelightMoment", () => {
  it("retorna vacío para canal WhatsApp", () => {
    expect(buildDelightMoment("fact_check", "whatsapp")).toBe("");
  });
  it("retorna vacío para intent emotional", () => {
    expect(buildDelightMoment("emotional", "web")).toBe("");
  });
  it("retorna vacío para intent disinformation", () => {
    expect(buildDelightMoment("disinformation", "web")).toBe("");
  });
  it("retorna contenido para fact_check en web", () => {
    expect(buildDelightMoment("fact_check", "web").length).toBeGreaterThan(0);
  });

  it("pt-BR: cierre en portugués para explanation (sin talleres ni multitud)", () => {
    const d = buildDelightMoment("explanation", "web", "low", "pt-BR");
    expect(d.length).toBeGreaterThan(0);
    expect(d.toLowerCase()).toMatch(/letramento|explicações|duas/);
    expect(d.toLowerCase()).not.toMatch(/oficinas|muita gente/);
    expect(d).not.toMatch(/¿sabías|hiciste/i);
  });

  it("explanation y action en web añaden cierre (independiente de confidence)", () => {
    expect(buildDelightMoment("explanation", "web", "high").length).toBeGreaterThan(0);
    expect(buildDelightMoment("action", "web", "low").length).toBeGreaterThan(0);
  });
});

describe("buildEmotionalValidation", () => {
  it("comienza con validación, no con datos", () => {
    const text = buildEmotionalValidation("anxiety", EjeOnda.A_MANO);
    expect(text).not.toMatch(/^[0-9]/);
    expect(text).not.toMatch(/^-/);
    expect(text.length).toBeGreaterThan(20);
  });
});
