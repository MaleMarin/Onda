export default async function handler(req, res) {
  // PARTE A: Verificación (El saludo de Meta)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Verificamos que la contraseña coincida con la que pusiste en Vercel
    if (mode === 'subscribe' && token === 'onda_verify_precisar_2026') {
      return res.status(200).send(challenge);
    } else {
      return res.status(403).send('Token incorrecto');
    }
  }

  // PARTE B: Recepción de mensajes (Para que el bot lea)
  if (req.method === 'POST') {
    return res.status(200).send('EVENT_RECEIVED');
  }
}