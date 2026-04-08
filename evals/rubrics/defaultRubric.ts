import type { EvalCase, DimensionResult, EvalDimensions, EvalExpectations } from "../types";
import { DEFAULT_MIN_SCORE } from "../config";

const DIM_TO_EXPECT: Record<keyof EvalDimensions, keyof EvalExpectations> = {
  clarity: "clarity_min",
  accuracy: "accuracy_min",
  neutrality: "neutrality_min",
  usefulness: "usefulness_min",
  safety: "safety_min",
  consistency: "consistency_min",
};

export function thresholdFor(case_: EvalCase, dim: keyof EvalDimensions): number {
  const exp = case_.expectations;
  if (!exp) return DEFAULT_MIN_SCORE;
  const key = DIM_TO_EXPECT[dim];
  const v = exp[key];
  return typeof v === "number" ? v : DEFAULT_MIN_SCORE;
}

export function passDimension(score: number, min: number): boolean {
  return score >= min;
}

export function emptyDimension(reason: string): DimensionResult {
  return { score: 1, passed: false, reason, evidence: [] };
}
