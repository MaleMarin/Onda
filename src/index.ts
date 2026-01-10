import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Tipo de los datos que esperaremos desde Botpress / cliente
interface OndaRequestBody {
  message: string;
  eje?: 'mano' | 'civita' | 'profes';
  userId?: string;
  canal?: 'whatsapp' | 'web' | 'otro';
}

// Endpoint principal
app.post('/onda', async (req: Request, res: Response) => {
  const body = req.body as OndaRequestBody;

  if (!body.message) {
    return res.status(400).json({ error: 'message es obligatorio' });
  }

  const eje = body.eje ?? 'general';

  const replyText =
    `👋 Soy Onda (${eje}). Recibí tu mensaje: “${body.message}”. ` +
    `Por ahora esta es una respuesta de prueba desde el backend.`;

  return res.json({
    replyText,
    meta: {
      eje,
      canal: body.canal ?? 'desconocido',
      userId: body.userId ?? null
    }
  });
});

// Arrancar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Onda backend escuchando en http://localhost:${PORT}`);
});
