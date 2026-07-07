import { describe, it, expect } from "vitest";
import { buildOndaSystemContent } from "@/lib/ondaReply";
import { buildVoiceBlock } from "@/lib/ondaVoice";
import { classifyIntent, buildIntentContextBlock } from "@/lib/intentClassifier";
import { EjeOnda } from "@/content/types";
import { ONDA_LIMIT_MESSAGES } from "@/content/shared";

describe("ondaReply system prompt — stress test regressions", () => {
  it("incluye LÍMITES DE SCOPE con frase out_of_scope", () => {
    const prompt = buildOndaSystemContent({ eje: EjeOnda.A_MANO });
    expect(prompt).toMatch(/LÍMITES DE SCOPE/);
    expect(prompt).toContain(ONDA_LIMIT_MESSAGES.out_of_scope);
  });

  it("incluye instrucción de responder siempre en español", () => {
    const prompt = buildOndaSystemContent({ eje: EjeOnda.A_MANO });
    expect(prompt).toMatch(/IDIOMA \(obligatorio\)/);
    expect(prompt.toLowerCase()).toMatch(/responde siempre en español/);
  });

  it("incluye bloque FORMATO anti-lista antes del cuerpo principal", () => {
    const prompt = buildOndaSystemContent({ eje: EjeOnda.A_MANO });
    const guardIdx = prompt.indexOf("SEGURIDAD ANTI-MANIPULACIÓN");
    const formatIdx = prompt.indexOf("FORMATO DE RESPUESTA (obligatorio");
    const bodyIdx = prompt.indexOf("SISTEMA_ONDA_GLOBAL") !== -1
      ? prompt.indexOf("Eres Onda, el Asistente")
      : prompt.indexOf("Eres Onda");
    expect(guardIdx).toBeGreaterThanOrEqual(0);
    expect(formatIdx).toBeGreaterThan(guardIdx);
    expect(bodyIdx).toBeGreaterThan(formatIdx);
  });

  it("A_MANO: voz con máximo 100 palabras y ejemplo corto", () => {
    const voice = buildVoiceBlock(EjeOnda.A_MANO);
    expect(voice).toMatch(/100 palabras/);
    expect(voice).toMatch(/¿Cómo verifico si una noticia es real\?/);
  });

  it("CIVITA: voz con SIFT y Bellingcat", () => {
    const voice = buildVoiceBlock(EjeOnda.CIVITA);
    expect(voice).toMatch(/SIFT/);
    expect(voice).toMatch(/Bellingcat/);
  });

  it("PROFES: voz con Para trabajar en clase", () => {
    const voice = buildVoiceBlock(EjeOnda.PROFES);
    expect(voice).toMatch(/Para trabajar en clase:/);
  });

  it("intent emotional: bloque de contexto existe para validación", () => {
    const intent = classifyIntent("me da miedo lo que está pasando");
    const block = buildIntentContextBlock(intent);
    expect(intent.intent).toBe("emotional");
    expect(block.length).toBeGreaterThan(0);
  });

  it("guard prohíbe exponer datos internos del modelo", () => {
    const prompt = buildOndaSystemContent({ eje: null });
    expect(prompt).toMatch(/NUNCA menciones tu fecha de entrenamiento/);
    expect(prompt).toContain(ONDA_LIMIT_MESSAGES.no_evidence_short);
  });

  it("incluye conocimiento sobre Precisar", () => {
    const prompt = buildOndaSystemContent({ eje: EjeOnda.CIVITA });
    expect(prompt).toMatch(/SOBRE PRECISAR/);
    expect(prompt).toMatch(/Menos ruido, más criterio/);
  });
});
