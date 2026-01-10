// api/onda.ts

// Tipos que usas desde Botpress / WhatsApp
interface OndaRequestBody {
    message: string;
    eje?: 'mano' | 'civita' | 'profes';
    userId?: string;
    canal?: 'whatsapp' | 'web' | 'otro';
  }
  
  // Esta función se ejecuta en Vercel cuando llamen a /api/onda
  export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Solo acepto POST' });
    }
  
    const body = req.body as OndaRequestBody;
  
    if (!body?.message) {
      return res.status(400).json({ error: 'message es obligatorio' });
    }
  
    const eje = body.eje ?? 'general';
  
    const replyText =
      `👋 Soy Onda (${eje}). Recibí tu mensaje: “${body.message}”. ` +
      `Por ahora esta es una respuesta de prueba desde el backend en Vercel.`;
  
    return res.status(200).json({
      replyText,
      meta: {
        eje,
        canal: body.canal ?? 'desconocido',
        userId: body.userId ?? null
      }
    });
  }
  