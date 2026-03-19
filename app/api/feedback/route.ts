import { NextResponse } from "next/server";
import { recordFeedback } from "../../../lib/auditStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST { "messageId": string, "vote": "up" | "down", "conversationId"?: string }
 * Registra feedback anónimo (👍/👎) para métricas de satisfacción.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const messageId = typeof body?.messageId === "string" ? body.messageId.trim() : null;
    const vote = body?.vote === "up" || body?.vote === "down" ? body.vote : null;
    if (!messageId || !vote) {
      return NextResponse.json({ error: "Faltan messageId o vote (up/down)" }, { status: 400 });
    }
    const conversationId = typeof body?.conversationId === "string" ? body.conversationId : undefined;
    await recordFeedback({ messageId, vote, conversationId });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
