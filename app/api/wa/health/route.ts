import { getWhatsAppEnvReport } from "../../../../lib/waWebhookEnv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Salud operativa del canal WhatsApp (variables de entorno y capacidades del repo).
 * No llama a Meta; solo inspecciona configuración local.
 */
export async function GET() {
  const report = getWhatsAppEnvReport();
  const status =
    report.canAcceptSignedWebhook && report.canSendMessages
      ? "ok"
      : report.canAcceptSignedWebhook
        ? "degraded"
        : "blocked";

  return Response.json(
    {
      status,
      whatsapp: report,
      endpoints: {
        webhook: "/api/webhook",
        note: "POST requiere WHATSAPP_WEBHOOK_SECRET y firma x-hub-signature-256 válida.",
      },
      documentation: {
        checklist: "docs/META-WHATSAPP-CHECKLIST.md",
        operacion: "docs/WHATSAPP-OPERACION.md",
      },
    },
    { status: 200 }
  );
}
