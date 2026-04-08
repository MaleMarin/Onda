/**
 * Tipos compartidos de la capa de evaluación Onda.
 * No acoplados al runtime de Next.
 */

export type EvalChannel = "web" | "whatsapp";
export type EvalOnda = "a-mano" | "civita" | "profes";
export type EvalDifficulty = "easy" | "medium" | "hard";
export type EvalMode = "deterministic" | "integration";

export type EvalExpectations = {
  clarity_min?: number;
  accuracy_min?: number;
  neutrality_min?: number;
  usefulness_min?: number;
  safety_min?: number;
  consistency_min?: number;
  /** Mínimo de palabras (heurística de utilidad en web). */
  min_words_web?: number;
  /** Máximo de caracteres razonable en WhatsApp (heurística brevedad). */
  max_chars_whatsapp?: number;
};

/**
 * Caso de evaluación (JSONL).
 */
export type EvalCase = {
  id: string;
  onda: EvalOnda;
  channel: EvalChannel;
  category: string;
  difficulty: EvalDifficulty;
  language?: string;
  input: string;
  /** Contexto inyectado como extraContext (simula web+RAG congelado). */
  context?: string | null;
  /** Simula extractArticle cuando hay URL en el input o se fuerza. */
  simulate_article?: {
    text?: string;
    thin?: boolean;
    host?: string;
    url?: string;
    meta?: { title: string; description: string };
  } | null;
  /** Frases o términos que la heurística espera en la respuesta. */
  must_include?: string[];
  must_not_include?: string[];
  expectations?: EvalExpectations;
  /** Etiquetas para reglas especiales del juez heurístico. */
  risk_tags?: string[];
  /** Para cross-channel: mismo id de pareja en web y whatsapp. */
  pair_id?: string;
  /** Si EVALS_FIXTURE_REPLY=1, usar esta respuesta y no llamar al LLM. */
  fixture_reply?: string;
  notes?: string;
};

export type DimensionResult = {
  score: number;
  passed: boolean;
  reason: string;
  evidence?: string[];
};

export type EvalDimensions = {
  clarity: DimensionResult;
  accuracy: DimensionResult;
  neutrality: DimensionResult;
  usefulness: DimensionResult;
  safety: DimensionResult;
  consistency: DimensionResult;
};

export type EvalCaseResult = {
  case: EvalCase;
  response: string;
  response_ms: number;
  dimensions: EvalDimensions;
  global_pass: boolean;
  regression: boolean;
  regression_reasons: string[];
  judge: "heuristic" | "llm" | "heuristic+llm";
  error?: string;
};

export type EvalRunSummary = {
  total: number;
  passed: number;
  failed: number;
  regression: boolean;
  mean_scores: Record<string, number>;
  by_onda: Record<string, { n: number; pass: number; mean_global: number }>;
  by_channel: Record<string, { n: number; pass: number; mean_global: number }>;
  by_category: Record<string, { n: number; pass: number }>;
  top_failures: { id: string; reason: string }[];
  timestamp_iso: string;
  commit: string | null;
  mode: EvalMode;
};

export type EvalRunOutput = {
  summary: EvalRunSummary;
  results: EvalCaseResult[];
  previous?: { mean_scores: Record<string, number>; case_pass: Record<string, boolean> } | null;
  /** Caídas agregadas (media global / dimensión) respecto a la corrida anterior. */
  run_regression_hints?: string[];
};

export type InvokeOndaParams = {
  message: string;
  onda: EvalOnda | null;
  channel: EvalChannel;
  history?: { role: "user" | "model"; content: string }[];
  /** `false` desactiva el snippet simulado; `string` sustituye el texto; `undefined` usa el default en modo determinista. */
  mockWeb?: string | false;
  mockRag?: string | false;
  mockExtract?: EvalCase["simulate_article"];
  mode: EvalMode;
  /** Texto extra congelado (prioridad sobre mockWeb/mockRag si se pasa explícito). */
  frozenContext?: string | null;
};
