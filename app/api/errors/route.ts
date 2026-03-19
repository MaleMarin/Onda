import { NextResponse } from "next/server";
import { recordError } from "../../../lib/auditStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST { "source": "chat" | "whatsapp", "userMessage"?, "botResponse"?, "error"? }
 * Registra fallos para auditoría: cuando el bot falla o el usuario califica negativamente.
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
    await recordError({ source, userMessage, botResponse, error });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
