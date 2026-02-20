import { getOndaReply } from "../../../lib/ondaReply";
import { sendWhatsAppText } from "../../../lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook de WhatsApp - Versión limpia y simple
 * 
 * GET: Verificación del webhook (Meta requiere esto para suscribirse)
 * POST: Recibe mensajes de WhatsApp y responde usando ONDA
 */

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  // Meta envía estos parámetros para verificar el webhook
  if (mode === "subscribe" && token && challenge && verifyToken && token === verifyToken) {
    console.log("✅ Webhook verificado correctamente");
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // Si no es una verificación, mostrar diagnóstico
  if (!mode && !token) {
    return new Response(
      JSON.stringify(
        {
          status: "ONDA WhatsApp Bot",
          message: "Webhook funcionando correctamente",
          url: "Usa esta URL en Meta: " + new URL(req.url).origin + "/api/webhook",
          env_check: {
            WHATSAPP_VERIFY_TOKEN: !!process.env.WHATSAPP_VERIFY_TOKEN,
            WHATSAPP_ACCESS_TOKEN: !!process.env.WHATSAPP_ACCESS_TOKEN,
            WHATSAPP_PHONE_NUMBER_ID: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
            OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
          },
        },
        null,
        2
      ),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  console.error("❌ Verificación fallida");
  return new Response("Forbidden", { status: 403 });
}

export async function POST(req: Request) {
  try {
    // Parsear el body
    let payload: any;
    try {
      payload = await req.json();
    } catch {
      // Si no es JSON válido, responder OK (Meta a veces envía confirmaciones)
      return new Response("OK", { status: 200 });
    }

    console.log("📩 Webhook recibido:", JSON.stringify(payload, null, 2));

    // Extraer mensajes del payload de WhatsApp
    const entries = payload?.entry || [];
    
    for (const entry of entries) {
      const changes = entry?.changes || [];
      
      for (const change of changes) {
        const value = change?.value;
        
        // Ignorar status updates (confirmaciones de entrega, lectura, etc.)
        if (value?.statuses && Array.isArray(value.statuses) && value.statuses.length > 0) {
          console.log("ℹ️ Status update ignorado");
          continue;
        }

        // Procesar mensajes entrantes
        const messages = value?.messages || [];
        
        for (const msg of messages) {
          const from = msg?.from;
          const text = msg?.text?.body;
          const type = msg?.type;
          const direction = msg?.direction;

          // Solo procesar mensajes de texto entrantes
          if (from && text && type === "text" && direction !== "outbound") {
            console.log(`💬 Mensaje recibido de ${from}: ${text}`);
            
            try {
              // Obtener respuesta de ONDA
              const response = await getOndaReply(text);
              console.log(`🤖 Respuesta generada: ${response.substring(0, 100)}...`);
              
              // Enviar respuesta por WhatsApp
              const result = await sendWhatsAppText(from, response);
              
              if (result.ok) {
                console.log("✅ Respuesta enviada correctamente");
              } else {
                console.error("❌ Error al enviar:", result.error);
              }
            } catch (error) {
              console.error("❌ Error procesando mensaje:", error);
            }
          } else {
            console.log("⏭️ Mensaje ignorado (no es texto entrante)", { from, type, direction });
          }
        }
      }
    }

    // Siempre responder 200 para evitar reintentos de Meta
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("❌ Error en webhook:", error);
    return new Response("OK", { status: 200 });
  }
}
