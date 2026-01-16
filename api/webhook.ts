export default function handler(req: any, res: any) {
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

    if (
      mode === "subscribe" &&
      token === VERIFY_TOKEN &&
      typeof challenge === "string"
    ) {
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  }

  if (req.method === "POST") {
    // WhatsApp enviará eventos aquí. Por ahora respondemos OK para que no falle.
    return res.sendStatus(200);
  }

  res.setHeader("Allow", "GET, POST");
  return res.sendStatus(405);
}
