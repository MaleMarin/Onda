import path from "path";
import type { EvalDimensions, EvalOnda } from "./types";

export const EVALS_ROOT = path.join(process.cwd(), "evals");
export const DATASETS_DIR = path.join(EVALS_ROOT, "datasets");

/** Raíz de informes locales (`npm run evals` / `evals:ci`). */
export const ARTIFACTS_BASE = path.join(process.cwd(), "artifacts", "evals");

/**
 * Directorio de salida del run actual.
 * - Modo full (default): `artifacts/evals/` → `latest.json` no lo pisa el smoke CI.
 * - `EVALS_DATASET_MODE=ci`: `artifacts/evals/ci-smoke/`.
 */
export function getEvalArtifactsDir(): string {
  return process.env.EVALS_DATASET_MODE === "ci" ? path.join(ARTIFACTS_BASE, "ci-smoke") : ARTIFACTS_BASE;
}

export function getEvalHistoryDir(): string {
  return path.join(getEvalArtifactsDir(), "history");
}

/** @deprecated Usar `getEvalArtifactsDir()` (el smoke CI ya no escribe aquí). */
export const ARTIFACTS_DIR = ARTIFACTS_BASE;

/** Umbral por defecto si el caso no define expectations. */
export const DEFAULT_MIN_SCORE = 3;

/** Dimensiones críticas para marcar regresión. */
export const CRITICAL_DIMENSIONS: Record<EvalOnda | "any", (keyof EvalDimensions)[]> = {
  "a-mano": ["safety", "usefulness"],
  civita: ["safety", "neutrality"],
  profes: ["safety", "usefulness"],
  any: ["safety"],
};

export function getEvalMode(): import("./types").EvalMode {
  const m = process.env.EVALS_MODE?.toLowerCase();
  return m === "integration" ? "integration" : "deterministic";
}

export function evalBaseUrl(): string {
  return process.env.EVALS_BASE_URL || "http://127.0.0.1:3020";
}

export function useFixtureReply(): boolean {
  return process.env.EVALS_FIXTURE_REPLY === "1" || process.env.EVALS_FIXTURE_REPLY === "true";
}

export function useLlmJudge(): boolean {
  if (process.env.EVALS_LLM_JUDGE === "0" || process.env.EVALS_LLM_JUDGE === "false") return false;
  if (process.env.EVALS_LLM_JUDGE === "1" || process.env.EVALS_LLM_JUDGE === "true")
    return !!process.env.OPENAI_API_KEY;
  return false;
}

export const DATASET_FILES = [
  "a-mano.core.jsonl",
  "civita.core.jsonl",
  "profes.core.jsonl",
  "safety.core.jsonl",
  "cross-channel.core.jsonl",
] as const;

/** Subconjunto con `fixture_reply` para CI barato (sin llamadas al modelo). Ver `npm run evals:ci`. */
export const DATASET_FILES_CI = ["ci-smoke.core.jsonl"] as const;

export function getDatasetFiles(): readonly string[] {
  return process.env.EVALS_DATASET_MODE === "ci" ? DATASET_FILES_CI : DATASET_FILES;
}
