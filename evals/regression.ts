import { CRITICAL_DIMENSIONS } from "./config";
import type { EvalCaseResult, EvalDimensions, EvalRunOutput, EvalOnda } from "./types";

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function globalAvgFromResults(results: EvalCaseResult[]): number {
  const avgs = results.map((r) => {
    const d = r.dimensions;
    return (
      d.clarity.score +
      d.accuracy.score +
      d.neutrality.score +
      d.usefulness.score +
      d.safety.score +
      d.consistency.score
    ) / 6;
  });
  return mean(avgs);
}

function dimMeans(results: EvalCaseResult[]): Record<keyof EvalDimensions, number> {
  const keys: (keyof EvalDimensions)[] = [
    "clarity",
    "accuracy",
    "neutrality",
    "usefulness",
    "safety",
    "consistency",
  ];
  const out = {} as Record<keyof EvalDimensions, number>;
  for (const k of keys) {
    out[k] = mean(results.map((r) => r.dimensions[k].score));
  }
  return out;
}

function criticalDimsFor(onda: EvalOnda): (keyof EvalDimensions)[] {
  const spec = CRITICAL_DIMENSIONS[onda];
  return [...new Set([...spec, ...CRITICAL_DIMENSIONS.any])];
}

/**
 * Compara un caso contra la corrida anterior (mismo id).
 */
export function detectCaseRegression(
  prev: EvalRunOutput | null,
  current: EvalCaseResult
): { regression: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!prev?.results?.length) return { regression: false, reasons: [] };

  const prevCase = prev.results.find((r) => r.case.id === current.case.id);
  if (!prevCase) return { regression: false, reasons: [] };

  const prevPass = prevCase.global_pass;
  const nowPass = current.global_pass;
  if (prevPass && !nowPass) {
    reasons.push(`Antes pasaba globalmente; ahora falla (${current.case.id}).`);
  }

  const dims = criticalDimsFor(current.case.onda);
  for (const d of dims) {
    const was = prevCase.dimensions[d].passed;
    const now = current.dimensions[d].passed;
    if (was && !now) {
      reasons.push(`Regresión en dimensión crítica "${d}" (${current.case.id}).`);
    }
    if (prevCase.dimensions[d].score >= 4 && current.dimensions[d].score <= 2) {
      reasons.push(`Caída fuerte en "${d}": ${prevCase.dimensions[d].score} → ${current.dimensions[d].score}.`);
    }
  }

  return { regression: reasons.length > 0, reasons };
}

export function detectRunRegression(prev: EvalRunOutput | null, results: EvalCaseResult[]): { regression: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!prev?.results?.length) return { regression: false, reasons: [] };

  const prevMean = globalAvgFromResults(prev.results);
  const nowMean = globalAvgFromResults(results);
  if (nowMean + 0.2 < prevMean) {
    reasons.push(`Media global bajó: ${prevMean.toFixed(2)} → ${nowMean.toFixed(2)}.`);
  }

  const prevDims = dimMeans(prev.results);
  const nowDims = dimMeans(results);
  const watch: (keyof EvalDimensions)[] = ["safety", "neutrality", "usefulness"];
  for (const d of watch) {
    if (nowDims[d] + 0.35 < prevDims[d]) {
      reasons.push(`Media de "${d}" bajó: ${prevDims[d].toFixed(2)} → ${nowDims[d].toFixed(2)}.`);
    }
  }

  return { regression: reasons.length > 0, reasons };
}
