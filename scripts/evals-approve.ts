/**
 * Copia el último informe CI (`artifacts/evals/ci-smoke/latest.json`) a
 * `evals/baselines/approved.json` para usarlo como referencia en `EVALS_COMPARE_BASELINE`.
 * Solo ejecutar cuando el cambio de puntuaciones/casos sea intencional (nuevo baseline).
 */
import fs from "fs";
import path from "path";
import { ARTIFACTS_BASE } from "../evals/config";

const src = path.join(ARTIFACTS_BASE, "ci-smoke", "latest.json");
const dest = path.join(process.cwd(), "evals", "baselines", "approved.json");

function main() {
  if (!fs.existsSync(src)) {
    console.error(
      `[evals:approve] No existe ${src}. Corré antes: EVALS_MODE=deterministic EVALS_DATASET_MODE=ci EVALS_FIXTURE_REPLY=1 EVALS_COMPARE_BASELINE=0 npm run evals:ci`
    );
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.info(`[evals:approve] Baseline guardado en ${dest}`);
}

main();
