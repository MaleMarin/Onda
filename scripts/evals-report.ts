import fs from "fs";
import path from "path";
import { ARTIFACTS_BASE } from "../evals/config";
import { evalRunToMarkdown } from "../evals/formatters/toMarkdown";
import type { EvalRunOutput } from "../evals/types";

/** Informe completo (75 casos); no usar carpeta `ci-smoke`. */
const latestJson = path.join(ARTIFACTS_BASE, "latest.json");
const latestMd = path.join(ARTIFACTS_BASE, "latest.md");

function main() {
  if (!fs.existsSync(latestJson)) {
    console.error(`No existe ${latestJson}. Corré primero npm run evals.`);
    process.exit(1);
  }
  const raw = fs.readFileSync(latestJson, "utf8");
  const out = JSON.parse(raw) as EvalRunOutput;
  fs.mkdirSync(ARTIFACTS_BASE, { recursive: true });
  fs.writeFileSync(latestMd, evalRunToMarkdown(out), "utf8");
  console.info(`[evals:report] actualizado ${latestMd}`);
}

main();
