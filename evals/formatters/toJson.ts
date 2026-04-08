import type { EvalRunOutput } from "../types";

export function evalRunToJson(output: EvalRunOutput, pretty = true): string {
  return JSON.stringify(output, null, pretty ? 2 : undefined);
}
