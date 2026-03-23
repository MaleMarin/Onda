// src/index.ts
import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json({ type: "*/*" })); // acepta JSON aunque venga con content-type raro

// Health check (para verificar que el backend está vivo)
app.get("/health", (_req: Request, res: Response) => {
  return res.status(200).json({ ok: true });
});

// --- Handlers reutilizables ---

function verifyWebhook(req: Request, res: Response) {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("[VERIFY] query:", req.query);

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log("✅ Webhook verificado");
    return res.status(200).type("text/plain").send(String(challenge ?? ""));
  }

  console.log("❌ Webhook no autorizado");
  return res.sendStatus(403);
}

function receiveWebhook(req: Request, res: Response) {
  console.log("📩 Webhook recibido:");
  console.dir(req.body, { depth: null });

  // Extrae mensaje (Cloud API)
  const entry = req.body?.entry?.[0];
  const changes = entry?.changes?.[0];
  const message = changes?.value?.messages?.[0];
  const text = message?.text?.body;

  if (text) console.log("💬 Mensaje recibido:", text);

  // Responder rápido (Meta requiere 200)
  return res.status(200).json({ ok: true });
}

// --- Rutas (ambas válidas) ---
// Puedes apuntar Meta a /webhook o a /api/whatsapp
app.get("/webhook", verifyWebhook);
app.post("/webhook", receiveWebhook);

app.get("/api/whatsapp", verifyWebhook);
app.post("/api/whatsapp", receiveWebhook);

// Start
const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
