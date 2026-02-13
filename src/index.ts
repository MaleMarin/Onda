import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json()); // 👈 Esto es importante para que Express pueda leer JSON

// ✅ VERIFICACIÓN WEBHOOK (GET)
app.get('/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('✅ Webhook verificado');
    res.status(200).send(challenge);
  } else {
    console.log('❌ Webhook no autorizado');
    res.sendStatus(403);
  }
});

// ✅ RECEPCIÓN DE MENSAJES (POST)
app.post('/webhook', (req: Request, res: Response) => {
  console.log('📩 Webhook recibido:');
  console.dir(req.body, { depth: null });

  // Podés procesar el mensaje si querés, por ejemplo:
  const entry = req.body.entry?.[0];
  const changes = entry?.changes?.[0];
  const message = changes?.value?.messages?.[0];
  const text = message?.text?.body;

  if (text) {
    console.log('💬 Mensaje recibido:', text);
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});