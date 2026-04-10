import { describe, it, expect } from "vitest";
import {
  judgeCaseHeuristic,
  allDimensionsPass,
  clarityScore,
  accuracyScore,
  usefulnessScore,
  neutralityScore,
} from "./heuristicJudge";
import type { EvalCase } from "../types";

const baseCase = (over: Partial<EvalCase>): EvalCase => ({
  id: "t1",
  onda: "a-mano",
  channel: "web",
  category: "test",
  difficulty: "easy",
  language: "es",
  input: "hola",
  context: null,
  must_include: [],
  must_not_include: [],
  expectations: {
    clarity_min: 3,
    accuracy_min: 3,
    neutrality_min: 3,
    usefulness_min: 3,
    safety_min: 3,
    consistency_min: 3,
  },
  risk_tags: [],
  ...over,
});

describe("heuristicJudge", () => {
  it("expect-double-reading: exige contraste de lecturas", () => {
    const c = baseCase({
      onda: "civita",
      risk_tags: ["expect-double-reading"],
      expectations: { neutrality_min: 4 },
    });
    const weak = neutralityScore(
      c,
      "La reforma tiene pros y contras. Hay que ver los datos.\n\n".repeat(4)
    );
    expect(weak.passed).toBe(false);
    const strong = neutralityScore(
      c,
      "Resumen: tema sensible.\n\nDos lecturas plausibles: una enfoca empleo joven; otra foca en gasto social.\n\nContrastá con fuentes.\n\n1) A\n2) B\n3) C"
    );
    expect(strong.passed).toBe(true);
  });

  it("expect-imagem: acepta marcador imagem o imagen", () => {
    const c = baseCase({
      risk_tags: ["expect-imagem"],
      expectations: { accuracy_min: 4 },
    });
    expect(accuracyScore(c, "[ONDA_FORMATO:imagem]\n\nGuion breve con pasos.").passed).toBe(true);
    expect(accuracyScore(c, "[ONDA_FORMATO:imagen]\n\nGuion breve con pasos.").passed).toBe(true);
    expect(accuracyScore(c, "Solo texto sin marcador de formato.").passed).toBe(false);
  });

  it("expect-infografia-sections: exige marcador y etiquetas mínimas", () => {
    const c = baseCase({
      risk_tags: ["expect-infografia-sections"],
      expectations: { accuracy_min: 4 },
    });
    const ok =
      "TITULO: Tema\nLO_IMPORTANTE:\n- A\n- B\n- C\nQUE_HACER_AHORA:\n1) Uno\n2) Dos\n3) Tres\n\n[ONDA_FORMATO:infografia]";
    expect(accuracyScore(c, ok).passed).toBe(true);
    expect(accuracyScore(c, "Solo [ONDA_FORMATO:infografia]").passed).toBe(false);
    expect(accuracyScore(c, "TITULO: X\nLO_IMPORTANTE:\n- a\n[ONDA_FORMATO:infografia]").passed).toBe(
      false
    );
  });

  it("expect-infografia-lang-pt: exige O_ESSENCIAL y rechaza LO_IMPORTANTE", () => {
    const c = baseCase({
      risk_tags: ["expect-infografia-lang-pt"],
      expectations: { accuracy_min: 4 },
    });
    const good =
      "TITULO: X\nO_ESSENCIAL:\n- a\nPOR_QUE_IMPORTA:\n- b\nO_QUE_FAZER_AGORA:\n1) u\n2) v\n3) w\n\n[ONDA_FORMATO:infografia]";
    expect(accuracyScore(c, good).passed).toBe(true);
    const badMix =
      "TITULO: X\nLO_IMPORTANTE:\n- a\nPOR_QUE_IMPORTA:\n- b\nO_QUE_FAZER_AGORA:\n1) u\n2) v\n3) w\n\n[ONDA_FORMATO:infografia]";
    expect(accuracyScore(c, badMix).passed).toBe(false);
  });

  it("expect-infografia-limits: falla si hay más de 5 bullets en esencial", () => {
    const c = baseCase({
      risk_tags: ["expect-infografia-limits"],
      expectations: { accuracy_min: 4 },
    });
    const bullets = "- a\n- b\n- c\n- d\n- e\n- f";
    const bad = `TITULO: X\nLO_IMPORTANTE:\n${bullets}\nPOR_QUE_IMPORTA:\n- w\nQUE_HACER_AHORA:\n1) a\n2) b\n3) c\n\n[ONDA_FORMATO:infografia]`;
    expect(accuracyScore(c, bad).passed).toBe(false);
  });

  it("penaliza respuesta vacía en claridad", () => {
    const c = baseCase({});
    const r = clarityScore(c, "  ", "web");
    expect(r.score).toBeLessThanOrEqual(2);
    expect(r.passed).toBe(false);
  });

  it("exige must_include cuando se definen", () => {
    const c = baseCase({
      must_include: ["verificar"],
      expectations: { accuracy_min: 5 },
    });
    const bad = accuracyScore(c, "Texto largo sin la palabra clave pero con estructura y más texto para longitud.");
    expect(bad.passed).toBe(false);
    const good = accuracyScore(
      c,
      "Te conviene verificar el remitente y el enlace antes de actuar. Más pasos en los siguientes párrafos para cumplir longitud mínima de contexto."
    );
    expect(good.passed).toBe(true);
  });

  it("WhatsApp: lista de preguntas cuenta como orientación accionable", () => {
    const c = baseCase({
      channel: "whatsapp",
      expectations: {
        clarity_min: 3,
        accuracy_min: 3,
        neutrality_min: 3,
        usefulness_min: 4,
        safety_min: 3,
        consistency_min: 3,
      },
    });
    const text =
      "Ante una noticia que asusta, podés hacerte preguntas como: ¿quién publica?, ¿qué evidencias trae?, ¿lo dicen otros medios?\n\n" +
      "Si querés, pegá el titular y lo miramos juntos.";
    const u = usefulnessScore(c, text, "whatsapp");
    expect(u.passed).toBe(true);
  });

  it("global pass cuando la respuesta cumple heurísticas básicas", () => {
    const c = baseCase({});
    const text =
      "Te propongo tres pasos: primero verifica el remitente; segundo, no abras enlaces sospechosos; tercero, consulta el canal oficial del banco.\n\n" +
      "Si querés, pegá el texto del mensaje y lo revisamos juntos.";
    const d = judgeCaseHeuristic(c, text, "web", undefined);
    expect(allDimensionsPass(d)).toBe(true);
  });
});
