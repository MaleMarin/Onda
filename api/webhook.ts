export default async function handler(req: any, res: any) {
  const base = `https://${req.headers?.host || "localhost"}`;
  const url = new URL(req.url || "", base);
  const method = (req.method || "GET").toUpperCase();

  // === 1) Verificación del webhook (GET) ===
  if (method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

    if (mode === "subscribe" && token && VERIFY_TOKEN && token === VERIFY_TOKEN && challenge) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/plain");
      return res.end(challenge);
    }

    res.statusCode = 403;
    return res.end("Forbidden");
  }

  // === 2) Eventos (POST) ===
  if (method === "POST") {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    console.log("INBOUND:", JSON.stringify(body).slice(0, 2000));

    const msg = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const from = msg?.from;           // número del usuario (quien te escribió)
    const messageId = msg?.id;        // id del mensaje (para marcar leído)
    const type = msg?.type;

    // A veces llegan "statuses" u otros eventos. Si no hay mensaje, OK y listo.
    if (!from || !type) {
      res.statusCode = 200;
      return res.end("OK");
    }

    const token = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const version = process.env.GRAPH_VERSION || "v21.0";

    if (!token || !phoneId) {
      console.log("Missing env vars: WHATSAPP_ACCESS_TOKEN/WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID");
      res.statusCode = 200;
      return res.end("OK");
    }

    // (A) Marcar como leído -> esto es lo que hace que se pongan azules
    if (messageId) {
      const readRes = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          status: "read",
          message_id: messageId,
        }),
      });
      console.log("MARK_READ:", readRes.status);
    }

    // (B) Respuesta mínima (eco)
    let reply = "";
    if (type === "text") reply = `Recibido ✅: ${msg?.text?.body || ""}`;
    else if (type === "image") reply = "Recibí una imagen ✅ (siguiente paso: leer titular automáticamente).";
    else if (type === "audio") reply = "Recibí un audio ✅ (siguiente paso: transcribir automáticamente).";
    else reply = `Recibí un ${type} ✅`;

    const sendRes = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: from,
        type: "text",
        text: { body: reply },
      }),
    });

    const sendText = await sendRes.text();
    console.log("SEND:", sendRes.status, sendText.slice(0, 800));

    res.statusCode = 200;
    return res.end("OK");
  }

  res.statusCode = 405;
  res.setHeader("Allow", "GET, POST");
  return res.end("Method Not Allowed");
}
