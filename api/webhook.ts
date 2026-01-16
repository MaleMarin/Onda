export default function handler(req: any, res: any) {
  // Parse seguro de query (sin depender de req.query)
  const base = `https://${req.headers?.host || "localhost"}`;
  const url = new URL(req.url || "", base);

  const method = (req.method || "GET").toUpperCase();

  // 1) Verificación (Meta llama con GET + hub.challenge)
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

  // 2) Recepción de eventos (Meta manda POST)
  if (method === "POST") {
    res.statusCode = 200;
    return res.end("OK");
  }

  res.statusCode = 405;
  res.setHeader("Allow", "GET, POST");
  return res.end("Method Not Allowed");
}
