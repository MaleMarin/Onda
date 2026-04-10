import fs from "fs";
import path from "path";
import { DATASETS_DIR, getDatasetFiles } from "./config";
import type { EvalCase } from "./types";

function normalizeCase(raw: unknown): EvalCase {
  if (typeof raw !== "object" || raw === null) throw new Error("Caso inválido: no es objeto");
  const c = raw as Record<string, unknown>;
  const id = typeof c.id === "string" ? c.id : "";
  if (!id) throw new Error("Caso sin id");
  return {
    id,
    onda: c.onda as EvalCase["onda"],
    channel: c.channel as EvalCase["channel"],
    category: typeof c.category === "string" ? c.category : "uncategorized",
    difficulty: (c.difficulty as EvalCase["difficulty"]) || "medium",
    language: typeof c.language === "string" ? c.language : "es",
    input: typeof c.input === "string" ? c.input : "",
    context: c.context === undefined ? null : (c.context as string | null),
    simulate_article: (c.simulate_article as EvalCase["simulate_article"]) ?? null,
    must_include: Array.isArray(c.must_include) ? (c.must_include as string[]) : [],
    must_not_include: Array.isArray(c.must_not_include) ? (c.must_not_include as string[]) : [],
    expectations: (c.expectations as EvalCase["expectations"]) ?? undefined,
    risk_tags: Array.isArray(c.risk_tags) ? (c.risk_tags as string[]) : [],
    pair_id: typeof c.pair_id === "string" ? c.pair_id : undefined,
    history: Array.isArray(c.history)
      ? (c.history as { role: "user" | "model"; content: string }[]).filter(
          (h) =>
            h &&
            (h.role === "user" || h.role === "model") &&
            typeof h.content === "string"
        )
      : undefined,
    fixture_reply: typeof c.fixture_reply === "string" ? c.fixture_reply : undefined,
    notes: typeof c.notes === "string" ? c.notes : undefined,
    wa_contract:
      c.wa_contract && typeof c.wa_contract === "object"
        ? (c.wa_contract as EvalCase["wa_contract"])
        : undefined,
  };
}

export function loadAllCases(): EvalCase[] {
  const out: EvalCase[] = [];
  for (const file of getDatasetFiles()) {
    const fp = path.join(DATASETS_DIR, file);
    if (!fs.existsSync(fp)) {
      console.warn(`[evals] Falta dataset: ${fp}`);
      continue;
    }
    const text = fs.readFileSync(fp, "utf8");
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
      try {
        const row = JSON.parse(lines[i]) as unknown;
        out.push(normalizeCase(row));
      } catch (e) {
        throw new Error(`${file}:${i + 1} ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
  return out;
}
