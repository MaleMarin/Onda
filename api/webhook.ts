import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getOndaReply } from "../lib/ondaReply";
import { sendWhatsAppText } from "../lib/whatsapp";

// Función auxiliar para asegurarnos de que los valores del query sean strings
function asString(q: any) {
  return Array.isArray(q) ? q[0] : q;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log(`[ONDA] Webhook llamado: ${req.method}`);
  
  // ✅ VERIFICACIÓN WEBHOOK (GET) - Esto es lo que Meta usa para validar la URL
  if (req.method === "GET") {
    const mode = asString(req.query["hub.mode"]);
    const token = asString(req.query["hub.verify_token"]);
    const challenge = asString(req.query["hub.challenge"]);

    // Ajustado para usar el nombre exacto que tienes en Vercel
    const verifyToken = process.env.TOKEN_DE_VERIFICACIÓN_DE_WHATSAPP;

    if (mode === "subscribe" && token === verifyToken) {
      console.log("✅ Webhook verificado correctamente");
      return res.status(200).send(challenge);
    }
    
    console.error("❌ Falló la verificación: Token incorrecto");
    return res.status(403).send("Forbidden");
  }

  // ✅ RECEPCIÓN DE MENSAJES (POST)
  if (req.method === "POST") {
    try {
      const payload = req.body;
      const entries = payload?.entry ?? [];

      for (const entry of entries) {
        for (const change of entry?.changes ?? []) {
          const messages = change?.value?.messages ?? [];
          for (const msg of messages) {
            const from = msg?.from;
            const text = msg?.text?.body;

            if (from && text) {
              console.log(`📩 Mensaje de ${from}: ${text}`);
              
              // Aquí tu lógica de Onda a Mano, Cívita o Profes
              const response = await getOndaReply(text);
              
              // Envío de la respuesta usando lib/whatsapp.ts
              await sendWhatsAppText(from, response);
            }
          }
        }
      }

      return res.status(200).json({ ok: true });
    } catch (e: any) {
      console.error("❌ Error procesando mensaje:", e.message);
      return res.status(200).json({ ok: true }); // Siempre responder 200 a Meta
    }
  }

  return res.status(405).send("Method Not Allowed");
}