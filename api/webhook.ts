export default async function handler(req: any, res: any) {
  const base = `https://${req.headers?.host || "localhost"}`;
  const url = new URL(req.url || "", base);
  const method = (req.method || "GET").toUpperCase();

  // --- 1) VERIFICACION META (GET)
  if (method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

    if (mode === "subscribe" && token && VERIFY_TOKEN && token === VERIFY_TOKEN && challenge) {
      res.status(200).send(challenge);
      return;
    }
    res.status(403).send("Forbidden");
    return;
  }

  // --- 2) EVENTOS (POST)
  if (method === "POST") {
    try {
      const body = req.body;
      console.log("INBOUND:", JSON.stringify(body)?.slice(0, 2000));

      const msg = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      const from = msg?.from;
      const messageId = msg?.id;
      const type = msg?.type;

      // Siempre responder 200 a Meta aunque no haya msg (por seguridad)
      res.status(200).send("OK");

      if (!from || !messageId) return;

      const token = process.env.WHATSAPP_ACCESS_TOKEN;
      const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      const version = process.env.GRAPH_VERSION || "v24.0";
      if (!token || !phoneId) {
        console.log("ERROR: faltan env vars WHATSAPP_ACCESS_TOKEN o WHATSAPP_PHONE_NUMBER_ID");
        return;
      }

      // (A) marcar como leído
      await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", status: "read", message_id: messageId }),
      });

      // (B) responder texto (solo para revivir)
      const reply =
        type === "text"
          ? "✅ Te leí. (Texto recibido)"
          : type === "image"
          ? "✅ Recibí tu imagen. (Ahora falta activar que yo la lea automáticamente)"
          : type === "audio"
          ? "✅ Recibí tu audio. (Ahora falta activar transcripción)"
          : `✅ Recibí un ${type}.`;

      const sendRes = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: from,
          type: "text",
          text: { body: reply },
        }),
      });

      console.log("SEND STATUS:", sendRes.status, await sendRes.text());
      return;
    } catch (e: any) {
      console.log("WEBHOOK ERROR:", e?.message || e);
      res.status(200).send("OK");
      return;
    }
  }

  res.status(405).setHeader("Allow", "GET, POST").send("Method Not Allowed");
}

