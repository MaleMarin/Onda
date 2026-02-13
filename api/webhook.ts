import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getOndaReply } from "../lib/ondaReply";
import { sendWhatsAppText } from "../lib/whatsapp";

// Función auxiliar para asegurarnos de que los valores del query sean strings
function asString(q: any) {
  return Array.isArray(q) ? q[0] : q;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log(`[ONDA] Webhook llamado: ${req.method} ${req.url || ""}`);
  // ✅ Verificación Webhook (GET)
  if (req.method === "GET") {
    const mode = asString(req.query["hub.mode"]);
    const token = asString(req.query["hub.verify_token"]);
    const challenge = asString(req.query["hub.challenge"]);

    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      console.log("✅ Webhook verificado");
      return res.status(200).send(challenge);
    }
    console.log("❌ Token incorrecto");
    return res.status(403).send("Forbidden");
  }

  // ✅ Recepción de mensajes (POST)
  if (req.method === "POST") {
    try {
      const payload =
        typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      console.log("[ONDA] POST recibido, entries:", payload?.entry?.length ?? 0);

      const entries = payload?.entry ?? [];

      for (const entry of entries) {
        for (const change of entry?.changes ?? []) {
          const messages = change?.value?.messages ?? [];
          for (const msg of messages) {
            const from = msg?.from;
            const text = msg?.text?.body;

            if (from && text) {
              console.log(`📩 ${from} dice: ${text}`);
              const response = await getOndaReply(text);
              await sendWhatsAppText(from, response);
            }
          }
        }
      }

      return res.status(200).json({ ok: true });
    } catch (e: any) {
      console.error("❌ Error en el webhook:", e.message || e);
      return res.status(200).json({ ok: true });
    }
  }

  return res.status(405).send("Method Not Allowed");
}