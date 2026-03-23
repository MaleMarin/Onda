import { NextResponse } from "next/server";
import { recordUsage, getMetrics, type UsageEvent } from "../../../lib/auditStore";
import { recordSpending, sendSpendingAlert } from "../../../lib/spendingAlert";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_EVENTS: UsageEvent[] = ["eje_select", "message_sent", "session_start"];

/**
 * POST { "event", "eje"?, "sessionId"?, "responseTimeMs"? }
 * Persiste en Vercel KV (si está configurado) para métricas.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const event = typeof body?.event === "string" && ALLOWED_EVENTS.includes(body.event as UsageEvent)
      ? (body.event as UsageEvent)
      : null;
    if (!event) {
      return NextResponse.json({ error: "event inválido" }, { status: 400 });
    }
    const eje = typeof body?.eje === "string" ? body.eje : undefined;
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId : undefined;
    const responseTimeMs = typeof body?.responseTimeMs === "number" && body.responseTimeMs >= 0 ? body.responseTimeMs : undefined;

    await recordUsage({ event, eje, sessionId, responseTimeMs });

    const model = typeof body?.model === "string" ? body.model : undefined;
    const hasPrompt =
      (typeof body?.inputTokens === "number" && body.inputTokens > 0) ||
      (typeof body?.promptTokens === "number" && body.promptTokens > 0);
    if (model && hasPrompt) {
      const inputTokens =
        typeof body.inputTokens === "number" ? body.inputTokens : (body.promptTokens as number) ?? 0;
      const outputTokens =
        typeof body.outputTokens === "number"
          ? body.outputTokens
          : typeof body.completionTokens === "number"
            ? body.completionTokens
            : 0;

      void recordSpending(model, inputTokens, outputTokens)
        .then(async (status) => {
          if (status.criticalTriggered) {
            await sendSpendingAlert("critical", status);
          } else if (status.alertTriggered) {
            await sendSpendingAlert("warning", status);
          }
        })
        .catch((err) => console.warn("spending alert error:", err));
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

/**
 * GET: métricas agregadas (promedio mensajes por sesión, tiempo de respuesta promedio, etc.)
 * Solo devuelve datos si Vercel KV está configurado.
 */
export async function GET() {
  try {
    const metrics = await getMetrics();
    if (!metrics) {
      return NextResponse.json(
        { message: "Métricas no disponibles (configura KV_REST_API_URL y KV_REST_API_TOKEN para persistir uso).", metrics: null },
        { status: 200 }
      );
    }
    return NextResponse.json(metrics);
  } catch {
    return NextResponse.json({ error: "Error al calcular métricas" }, { status: 500 });
  }
}
