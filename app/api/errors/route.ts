import { NextResponse } from "next/server";
import { recordError } from "../../../lib/auditStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST { source, error?, sessionId?, requestId? }
 * No persiste texto de usuario en producción.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const source = body?.source === "chat" || body?.source === "whatsapp" ? body.source : null;
    if (!source) {
      return NextResponse.json({ error: "source debe ser 'chat' o 'whatsapp'" }, { status: 400 });
    }
    const userMessage = typeof body?.userMessage === "string" ? body.userMessage : undefined;
    const botResponse = typeof body?.botResponse === "string" ? body.botResponse : undefined;
    const error = typeof body?.error === "string" ? body.error : undefined;
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId : undefined;
    const requestId = typeof body?.requestId === "string" ? body.requestId : undefined;
    await recordError({
      source,
      error,
      sessionId,
      requestId,
      route: "/api/errors",
      userMessageLen: userMessage?.length,
      botResponseLen: botResponse?.length,
      userMessage,
      botResponse,
    });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
