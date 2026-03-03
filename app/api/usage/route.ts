import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Eventos permitidos para métricas de uso (anónimas). */
const ALLOWED_EVENTS = ["eje_select", "message_sent", "session_start"] as const;

/**
 * POST { "event": "eje_select" | "message_sent" | "session_start", "eje"?: "A_MANO" | "CIVITA" | "PROFES" }
 * Registra uso anónimo para métricas. No guarda PII ni requiere login.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const event = typeof body?.event === "string" && ALLOWED_EVENTS.includes(body.event as (typeof ALLOWED_EVENTS)[number])
      ? body.event
      : null;
    if (!event) {
      return NextResponse.json({ error: "event inválido" }, { status: 400 });
    }
    const eje = typeof body?.eje === "string" ? body.eje : undefined;
    // Aquí se puede enviar a analytics, log agregado, etc. Por ahora solo 204.
    if (process.env.NODE_ENV !== "test") {
      console.info("[usage]", { event, eje, ts: new Date().toISOString() });
    }
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
