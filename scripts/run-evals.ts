import "dotenv/config";
import fs from "fs";
import path from "path";
import {
  getEvalArtifactsDir,
  getEvalHistoryDir,
  getDatasetFiles,
  getEvalMode,
  BASELINE_APPROVED_PATH,
} from "../evals/config";
import { evalRunToJson } from "../evals/formatters/toJson";
import { evalRunToMarkdown } from "../evals/formatters/toMarkdown";
import type { EvalRunOutput } from "../evals/types";
import { runAllEvals } from "../evals/runners/runAllEvals";

function artifactPaths() {
  const dir = getEvalArtifactsDir();
  return {
    dir,
    latestJson: path.join(dir, "latest.json"),
    latestMd: path.join(dir, "latest.md"),
    historyDir: getEvalHistoryDir(),
  };
}

function readPreviousRun(latestJson: string): EvalRunOutput | null {
  try {
    const raw = fs.readFileSync(latestJson, "utf8");
    return JSON.parse(raw) as EvalRunOutput;
  } catch {
    return null;
  }
}

function readBaselineApproved(): EvalRunOutput | null {
  try {
    const raw = fs.readFileSync(BASELINE_APPROVED_PATH, "utf8");
    return JSON.parse(raw) as EvalRunOutput;
  } catch {
    return null;
  }
}

async function main() {
  const mode = getEvalMode();
  const { dir: outDir, latestJson, latestMd, historyDir } = artifactPaths();
  fs.mkdirSync(historyDir, { recursive: true });

  const useBaseline = process.env.EVALS_COMPARE_BASELINE === "1" || process.env.EVALS_COMPARE_BASELINE === "true";
  const previous = useBaseline ? readBaselineApproved() : readPreviousRun(latestJson);
  const ds = getDatasetFiles();
  const prevLabel = useBaseline ? `baseline=${BASELINE_APPROVED_PATH}` : `latest=${latestJson}`;
  console.info(
    `[evals] modo=${mode} outDir=${outDir} datasets=${ds.join(",")} comparar=${prevLabel} casos_prev=${previous ? previous.results.length : 0}`
  );
  if (useBaseline && !previous) {
    console.warn(
      `[evals] No se encontró baseline en ${BASELINE_APPROVED_PATH}; regresión desactivada. Generá uno con: npm run evals:approve (tras una corrida local exitosa).`
    );
  }

  const output = await runAllEvals({ mode, previousRun: previous });

  const stamp = output.summary.timestamp_iso.replace(/[:.]/g, "-");
  const histPath = path.join(historyDir, `run-${stamp}.json`);
  fs.writeFileSync(histPath, evalRunToJson(output), "utf8");

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(latestJson, evalRunToJson(output), "utf8");
  fs.writeFileSync(latestMd, evalRunToMarkdown(output), "utf8");

  console.info(`[evals] guardado ${latestJson}, ${latestMd}`);
  console.info(`[evals] historial ${histPath}`);
  console.info(
    `[evals] resumen pasaron ${output.summary.passed}/${output.summary.total} regresión_informe=${output.summary.regression}`
  );

  const failOnReg =
    process.env.EVALS_FAIL_ON_REGRESSION === "1" || process.env.EVALS_FAIL_ON_REGRESSION === "true";
  if (failOnReg && output.summary.regression) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
