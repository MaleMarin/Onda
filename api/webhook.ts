import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
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
    return res.sendStatus(200);
  }

  res.setHeader("Allow", "GET, POST");
  return res.sendStatus(405);
}

