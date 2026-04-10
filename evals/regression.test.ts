import { describe, it, expect } from "vitest";
import { detectCaseRegression, detectRunRegression } from "./regression";
import type { EvalCaseResult, EvalDimensions, EvalRunOutput } from "./types";

function dim(score: number, passed: boolean, reason = ""): import("./types").DimensionResult {
  return { score, passed, reason, evidence: [] };
}

function baseDims(over: Partial<Record<keyof EvalDimensions, { score: number; passed: boolean }>>): EvalDimensions {
  const d = (k: keyof EvalDimensions, s: number, p: boolean) =>
    dim(over[k]?.score ?? s, over[k]?.passed ?? p);
  return {
    clarity: d("clarity", 4, true),
    accuracy: d("accuracy", 4, true),
    neutrality: d("neutrality", 4, true),
    usefulness: d("usefulness", 4, true),
    safety: d("safety", 5, true),
    consistency: d("consistency", 5, true),
  };
}

function makeResult(
  id: string,
  onda: EvalCaseResult["case"]["onda"],
  global_pass: boolean,
  dimensions: EvalDimensions
): EvalCaseResult {
  return {
    case: {
      id,
      onda,
      channel: "web",
      category: "t",
      difficulty: "easy",
      input: "x",
    },
    response: "y",
    response_ms: 1,
    dimensions,
    global_pass,
    regression: false,
    regression_reasons: [],
    judge: "heuristic",
  };
}

describe("detectCaseRegression", () => {
  it("detecta cuando un caso pasaba y ahora falla", () => {
    const prev: EvalRunOutput = {
      summary: {} as EvalRunOutput["summary"],
      results: [
        makeResult("c1", "a-mano", true, baseDims({})),
      ],
    };
    const now = makeResult("c1", "a-mano", false, baseDims({ clarity: { score: 1, passed: false } }));
    const { regression, reasons } = detectCaseRegression(prev, now);
    expect(regression).toBe(true);
    expect(reasons.some((r) => r.includes("c1"))).toBe(true);
  });

  it("no marca regresión sin corrida previa", () => {
    const now = makeResult("c1", "civita", true, baseDims({}));
    expect(detectCaseRegression(null, now).regression).toBe(false);
  });
});

describe("detectRunRegression", () => {
  it("detecta caída fuerte de media global", () => {
    const prev: EvalRunOutput = {
      summary: {} as EvalRunOutput["summary"],
      results: Array.from({ length: 10 }, (_, i) =>
        makeResult(`p${i}`, "a-mano", true, baseDims({}))
      ),
    };
    const allLow = {
      clarity: { score: 1, passed: false },
      accuracy: { score: 1, passed: false },
      neutrality: { score: 1, passed: false },
      usefulness: { score: 1, passed: false },
      safety: { score: 1, passed: false },
      consistency: { score: 1, passed: false },
    } as const;
    const bad = makeResult("n0", "a-mano", false, baseDims(allLow));
    const current = [...prev.results.slice(0, 9), bad];
    const { regression, reasons } = detectRunRegression(prev, current);
    expect(regression).toBe(true);
    expect(reasons.some((r) => r.includes("Media global"))).toBe(true);
  });
});
