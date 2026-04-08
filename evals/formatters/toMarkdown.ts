import type { EvalRunOutput } from "../types";

export function evalRunToMarkdown(out: EvalRunOutput): string {
  const { summary, results, run_regression_hints } = out;
  const lines: string[] = [];
  lines.push(`# Evaluación Onda`);
  lines.push("");
  lines.push(`- **Modo:** ${summary.mode}`);
  lines.push(`- **Timestamp:** ${summary.timestamp_iso}`);
  lines.push(`- **Commit:** ${summary.commit ?? "(no git)"}`);
  lines.push(`- **Total:** ${summary.total} · **Pasaron:** ${summary.passed} · **Fallaron:** ${summary.failed}`);
  lines.push(`- **Regresión (informe):** ${summary.regression ? "sí" : "no"}`);
  lines.push("");

  if (run_regression_hints?.length) {
    lines.push(`## Regresión agregada (vs corrida anterior)`);
    for (const h of run_regression_hints) lines.push(`- ${h}`);
    lines.push("");
  }

  lines.push(`## Medias por dimensión`);
  for (const [k, v] of Object.entries(summary.mean_scores)) {
    lines.push(`- **${k}:** ${v.toFixed(2)}`);
  }
  lines.push("");

  lines.push(`## Por Onda`);
  for (const [k, v] of Object.entries(summary.by_onda)) {
    lines.push(`- **${k}:** n=${v.n}, pass=${v.pass}, media_global≈${v.mean_global.toFixed(2)}`);
  }
  lines.push("");

  lines.push(`## Por canal`);
  for (const [k, v] of Object.entries(summary.by_channel)) {
    lines.push(`- **${k}:** n=${v.n}, pass=${v.pass}, media_global≈${v.mean_global.toFixed(2)}`);
  }
  lines.push("");

  lines.push(`## Por categoría`);
  for (const [k, v] of Object.entries(summary.by_category)) {
    lines.push(`- **${k}:** n=${v.n}, pass=${v.pass}`);
  }
  lines.push("");

  lines.push(`## Top fallos`);
  if (!summary.top_failures.length) lines.push(`_(ninguno)_`);
  else {
    for (const f of summary.top_failures) {
      lines.push(`- \`${f.id}\`: ${f.reason}`);
    }
  }
  lines.push("");

  lines.push(`## Casos con regresión (vs anterior)`);
  const reg = results.filter((r) => r.regression);
  if (!reg.length) lines.push(`_(ninguna o sin historial)_`);
  else {
    for (const r of reg) {
      lines.push(`- \`${r.case.id}\`: ${r.regression_reasons.join("; ") || "(marcado)"}`);
    }
  }
  lines.push("");

  lines.push(`## Detalle (extracto)`);
  for (const r of results) {
    const avg =
      (r.dimensions.clarity.score +
        r.dimensions.accuracy.score +
        r.dimensions.neutrality.score +
        r.dimensions.usefulness.score +
        r.dimensions.safety.score +
        r.dimensions.consistency.score) /
      6;
    lines.push(
      `### ${r.case.id} · ${r.case.onda} · ${r.case.channel} · ${r.global_pass ? "OK" : "FAIL"} · media≈${avg.toFixed(2)}`
    );
    if (r.error) lines.push(`_Error:_ ${r.error}`);
    lines.push(`_Respuesta (recorte):_ ${r.response.slice(0, 280).replace(/\n/g, " ")}…`);
    lines.push("");
  }

  return lines.join("\n");
}
