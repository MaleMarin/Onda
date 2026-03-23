import { readFileSync } from "fs";
import { join } from "path";
import { checkKvConnectivity, getDailyStats } from "@/lib/telemetry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readPackageVersion(): string {
  try {
    const p = join(process.cwd(), "package.json");
    const j = JSON.parse(readFileSync(p, "utf8")) as { version?: string };
    return typeof j.version === "string" ? j.version : "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Health público: sin datos sensibles. Útil para cold start / KV / tasas del día.
 */
export async function GET() {
  const timestamp = new Date().toISOString();
  const version = readPackageVersion();

  const [kvStatus, stats] = await Promise.all([checkKvConnectivity(), getDailyStats()]);

  const firebaseOk =
    Boolean(process.env.FIREBASE_PROJECT_ID?.trim()) ||
    Boolean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim());

  const totalRequests = stats?.totalRequests ?? 0;
  const successRate = stats?.successRate ?? 1;
  const avgLatencyMs = stats?.avgLatencyMs ?? 0;
  const p95LatencyMs = stats?.p95LatencyMs ?? 0;

  const models: Record<string, { avgMs: number; errors: number }> = {};
  if (stats?.byModel) {
    for (const [name, v] of Object.entries(stats.byModel)) {
      models[name] = { avgMs: Math.round(v.avgMs), errors: v.errors };
    }
  }

  let status: "ok" | "degraded" | "down" = "ok";
  if (totalRequests === 0) {
    status = "ok";
  } else if (successRate < 0.8) {
    status = "down";
  } else if (successRate <= 0.95 || kvStatus === "error") {
    status = "degraded";
  }

  return Response.json(
    {
      status,
      timestamp,
      version,
      uptime: "serverless",
      today: {
        requests: totalRequests,
        successRate,
        avgLatencyMs: Math.round(avgLatencyMs),
        p95LatencyMs: Math.round(p95LatencyMs),
      },
      models,
      checks: {
        kv: kvStatus,
        firebase: firebaseOk ? "ok" : "unknown",
      },
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
