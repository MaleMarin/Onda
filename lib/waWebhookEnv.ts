/**
 * Diagnóstico de variables de entorno para el webhook de WhatsApp (Meta).
 * Separa lo que exige el **repo** para recibir POST firmados vs lo que hace falta para **enviar** mensajes.
 */

export type WhatsAppEnvReport = {
  /** POST /api/webhook puede verificar firma y parsear JSON. */
  canAcceptSignedWebhook: boolean;
  /** El bot puede llamar a la API de Meta para enviar texto/imagen/audio. */
  canSendMessages: boolean;
  /** GET /api/webhook puede completar el challenge de verificación de Meta. */
  canMetaSubscribe: boolean;
  missingForWebhookPost: string[];
  missingForSending: string[];
  /** Qué depende de Meta (fuera del repo). */
  metaDependencyNotes: string[];
  /** Qué configurar en el repositorio / hosting. */
  repoSetupNotes: string[];
};

function truthy(v: string | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * Informe para healthchecks y respuestas de error legibles.
 */
export function getWhatsAppEnvReport(): WhatsAppEnvReport {
  const webhookSecret = truthy(process.env.WHATSAPP_WEBHOOK_SECRET);
  const verifyToken = truthy(process.env.WHATSAPP_VERIFY_TOKEN);
  const accessToken = truthy(process.env.WHATSAPP_ACCESS_TOKEN);
  const phoneId = truthy(process.env.WHATSAPP_PHONE_NUMBER_ID);
  const appSecret = truthy(process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET);

  const missingForWebhookPost: string[] = [];
  if (!webhookSecret) missingForWebhookPost.push("WHATSAPP_WEBHOOK_SECRET");

  const missingForSending: string[] = [];
  if (!accessToken) missingForSending.push("WHATSAPP_ACCESS_TOKEN");
  if (!phoneId) missingForSending.push("WHATSAPP_PHONE_NUMBER_ID");

  const missingForSubscribe: string[] = [];
  if (!verifyToken) missingForSubscribe.push("WHATSAPP_VERIFY_TOKEN");

  const canAcceptSignedWebhook = webhookSecret;
  const canSendMessages = accessToken && phoneId;
  const canMetaSubscribe = verifyToken;

  return {
    canAcceptSignedWebhook,
    canSendMessages,
    canMetaSubscribe,
    missingForWebhookPost,
    missingForSending,
    metaDependencyNotes: [
      "Meta debe tener el webhook apuntando a esta URL pública con el mismo WHATSAPP_VERIFY_TOKEN y suscrito a eventos de mensajes.",
      "El número de WhatsApp Business debe estar asociado a la app y aprobado según las políticas de Meta (plantillas fuera de ventana de 24 h).",
      "La firma x-hub-signature-256 usa el valor de WHATSAPP_WEBHOOK_SECRET (configurable en el panel de la app de Meta como App Secret o el secreto del webhook según tu configuración).",
    ],
    repoSetupNotes: [
      "Definí WHATSAPP_WEBHOOK_SECRET antes de aceptar POST; sin eso el servidor rechaza el cuerpo (evita procesar payloads no firmados).",
      "Para enviar respuestas: WHATSAPP_ACCESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID.",
      "Para la verificación inicial GET: WHATSAPP_VERIFY_TOKEN debe coincidir con el token configurado en Meta.",
      "Recomendado en producción: WHATSAPP_APP_SECRET o META_APP_SECRET para otras comprobaciones Meta (p. ej. intercambio de tokens); no sustituye WHATSAPP_WEBHOOK_SECRET en POST.",
    ],
  };
}

export function formatWebhookPostBlockedMessage(report: WhatsAppEnvReport): string {
  if (report.canAcceptSignedWebhook) return "";
  return (
    "Falta configuración para aceptar el webhook de WhatsApp.\n\n" +
    `Variables ausentes: ${report.missingForWebhookPost.join(", ") || "(desconocido)"}.\n\n` +
    "Qué hacer: creá WHATSAPP_WEBHOOK_SECRET en tu entorno (.env.local / Vercel) con el mismo secreto que usa Meta para firmar el cuerpo (header x-hub-signature-256).\n\n" +
    "Salud del canal: GET /api/wa/health (JSON con el detalle).\n\n" +
    "Checklist paso a paso (repo): docs/META-WHATSAPP-CHECKLIST.md"
  );
}
