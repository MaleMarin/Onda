/**
 * Genera informes Markdown a partir de eventos ONDA Insights en KV (o memoria en el mismo proceso).
 * Uso: `npm run insights:report` con KV_REST_* configurado en el entorno (p. ej. `npx vercel env pull`).
 */

import "dotenv/config";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { buildInsightsSummary, fetchEventsBetween, type InsightsSummaryJson } from "../lib/insightsTelemetry";

function dayRange(days: number): { startDay: string; endDay: string } {
  const end = new Date();
  const endDay = end.toISOString().slice(0, 10);
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const startDay = start.toISOString().slice(0, 10);
  return { startDay, endDay };
}

function recommendations(s: InsightsSummaryJson): string[] {
  const out: string[] = [];
  if (s.top_errors.some((e) => e.count > 0)) {
    out.push("Revisar códigos de error frecuentes en logs del servidor y en `lib/auditStore` / proveedores de modelo.");
  }
  if (s.sources_requested_pct < 15 && s.total_events > 20) {
    out.push("Evaluar si el copy o el menú debe sugerir más explícitamente pedir fuentes cuando el tema lo amerite.");
  }
  if (s.friction_buckets.length > 0 && s.friction_buckets[0].fallback_or_error > 3) {
    out.push("Analizar días con picos de fallback/error: revisar timeouts de contexto (RAG/Tavily) y límites de audio.");
  }
  if (s.top_topics[0]?.tag?.includes("estafa")) {
    out.push("Priorizar kits y guías de estafa/phishing en contenidos y menú A Mano.");
  }
  if (s.avg_latency_ms != null && s.avg_latency_ms > 25_000) {
    out.push("Latencia alta: considerar caché de respuestas simples o reducir búsqueda web en consultas livianas.");
  }
  if (out.length === 0) {
    out.push(
      "Mantener monitoreo semanal: comparar top_intents con objetivos de AMI y ajustar prompts solo con evidencia."
    );
  }
  while (out.length < 3) {
    out.push("Documentar hipótesis de mejora y validar con evals antes de desplegar cambios de modelo.");
  }
  return out.slice(0, 7);
}

function renderReport(title: string, s: InsightsSummaryJson): string {
  const lines: string[] = [];
  lines.push(`# ${title}`);
  lines.push("");
  lines.push(`_Generado: ${new Date().toISOString()} · Rango: ${s.start_day} → ${s.end_day} · Eventos: ${s.total_events}_`);
  lines.push("");
  lines.push("## 1) Preguntas / temas dominantes (Top 10 tags)");
  lines.push("");
  if (s.top_topics.length === 0) lines.push("_Sin datos._");
  else {
    lines.push("| Tag | Conteo |");
    lines.push("|-----|--------|");
    for (const t of s.top_topics) lines.push(`| ${t.tag} | ${t.count} |`);
  }
  lines.push("");
  lines.push("## 2) Necesidades inferidas (Top intents)");
  lines.push("");
  if (s.top_intents.length === 0) lines.push("_Sin datos._");
  else {
    lines.push("| Intent | Conteo |");
    lines.push("|--------|--------|");
    for (const t of s.top_intents) lines.push(`| ${t.intent} | ${t.count} |`);
  }
  lines.push("");
  lines.push("## 3) Preferencias (formato, fuentes, longitud implícita)");
  lines.push("");
  lines.push(`- **% solicitudes con fuentes:** ${s.sources_requested_pct}`);
  lines.push(`- **Formatos (respuesta):** ${JSON.stringify(s.format_counts)}`);
  lines.push(`- **Distribución por eje:** ${JSON.stringify(s.eje_distribution)}`);
  lines.push("");
  lines.push("## 4) Riesgos y seguridad");
  lines.push("");
  lines.push(
    "Los eventos no guardan texto del usuario: revisar tags `emergencia`, `estafa_phishing`, `datos_sensibles_aviso` en `top_topics`."
  );
  lines.push("");
  lines.push("## 5) Fricciones (errores / fallback por día)");
  lines.push("");
  if (s.friction_buckets.length === 0) lines.push("_Sin picos registrados._");
  else {
    lines.push("| Día | Fallback/error |");
    lines.push("|-----|------------------|");
    for (const f of s.friction_buckets) lines.push(`| ${f.day} | ${f.fallback_or_error} |`);
  }
  lines.push("");
  lines.push("## 6) Errores más frecuentes (códigos agregados)");
  lines.push("");
  if (s.top_errors.length === 0) lines.push("_Sin códigos de error._");
  else {
    lines.push("| Código | Conteo |");
    lines.push("|--------|--------|");
    for (const e of s.top_errors) lines.push(`| ${e.code} | ${e.count} |`);
  }
  lines.push("");
  lines.push("## 7) Recomendaciones (reglas heurísticas)");
  lines.push("");
  for (const r of recommendations(s)) lines.push(`- ${r}`);
  lines.push("");
  lines.push("## 8) Métricas clave");
  lines.push("");
  lines.push("| Métrica | Valor |");
  lines.push("|--------|-------|");
  lines.push(`| Eventos totales (incl. start) | ${s.total_events} |`);
  lines.push(`| Latencia media (ms, turnos end) | ${s.avg_latency_ms ?? "—"} |`);
  lines.push("");
  return lines.join("\n");
}

async function main() {
  const docsDir = path.join(process.cwd(), "docs");
  mkdirSync(docsDir, { recursive: true });

  const w = dayRange(7);
  const ev7 = await fetchEventsBetween(w.startDay, w.endDay);
  const s7 = buildInsightsSummary(ev7, w.startDay, w.endDay);
  writeFileSync(path.join(docsDir, "INSIGHTS-WEEKLY.md"), renderReport("ONDA Insights — semana", s7), "utf8");

  const m = dayRange(30);
  const ev30 = await fetchEventsBetween(m.startDay, m.endDay);
  const s30 = buildInsightsSummary(ev30, m.startDay, m.endDay);
  writeFileSync(path.join(docsDir, "INSIGHTS-MONTHLY.md"), renderReport("ONDA Insights — 30 días", s30), "utf8");

  console.log("OK: docs/INSIGHTS-WEEKLY.md y docs/INSIGHTS-MONTHLY.md actualizados.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
