import { describe, it, expect } from "vitest";
import {
  judgeCaseHeuristic,
  allDimensionsPass,
  clarityScore,
  accuracyScore,
  usefulnessScore,
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
