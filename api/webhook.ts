// pages/api/webhook.ts
import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

const GRAPH_VERSION = process.env.GRAPH_VERSION || "v21.0";
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_TOKEN =
  process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN;

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

function ok(res: NextApiResponse, text = "OK") {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain");
  res.end(text);
}

async function sendText(to: string, body: string) {
  if (!PHONE_NUMBER_ID) throw new Error("Falta WHATSAPP_PHONE_NUMBER_ID");
  if (!WHATSAPP_TOKEN) throw new Error("Falta WHATSAPP_ACCESS_TOKEN");

  const r = await fetch(`${GRAPH}/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });

  const t = await r.text();
  console.log("SEND status:", r.status, t);
}

async function getMediaUrl(mediaId: string) {
  const r = await fetch(`${GRAPH}/${mediaId}`, {
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
  });
  const j = await r.json(); // { url, mime_type, ... }
  return { url: j.url as string, mime: (j.mime_type as string) || "image/jpeg" };
}

async function downloadMedia(url: string) {
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
  });
  const mime = r.headers.get("content-type") || "application/octet-stream";
  const buf = await r.arrayBuffer();
  return { buf, mime };
}

async function extractHeadlineFromImage(buf: ArrayBuffer, mime: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Falta OPENAI_API_KEY");

  const openai = new OpenAI({ apiKey: key });

  const base64Image = Buffer.from(buf).toString("base64");
  const dataUrl = `data:${mime};base64,${base64Image}`;

  // Usamos Responses API con input_image (forma recomendada en docs)
  const response = await openai.responses.create({
    model: process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text:
              "Lee el TITULAR principal de esta noticia. Devuélveme SOLO el titular en una línea. " +
              "Si hay subtítulo, ignóralo.",
          },
          { type: "input_image", image_url: dataUrl },
        ],
      },
    ],
  });

  return (response.output_text || "").trim();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // --- 1) Verificación webhook (GET) ---
  if ((req.method || "GET").toUpperCase() === "GET") {
    const mode = (req.query["hub.mode"] as string) || "";
    const token = (req.query["hub.verify_token"] as string) || "";
    const challenge = (req.query["hub.challenge"] as string) || "";

    if (mode === "subscribe" && token && VERIFY_TOKEN && token === VERIFY_TOKEN && challenge) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/plain");
      return res.end(challenge);
    }

    res.statusCode = 403;
    return res.end("Forbidden");
  }

  // --- 2) Recepción de eventos (POST) ---
  if ((req.method || "POST").toUpperCase() === "POST") {
    // Siempre responde 200 a Meta (para que no reintente), pero procesamos igual
    try {
      const body: any = req.body;
      console.log("INBOUND:", JSON.stringify(body)?.slice(0, 1200));

      const msg =
        body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

      // Si no hay mensaje (a veces llegan statuses), igual OK
      if (!msg) return ok(res);

      const from = msg.from as string;
      const type = msg.type as string;

      // Texto normal
      if (type === "text") {
        const text = msg.text?.body || "";
        await sendText(from, `Recibido ✅\n\nDijiste: ${text}`);
        return ok(res);
      }

      // Imagen: descargar + visión + responder titular
      if (type === "image") {
        if (process.env.ENABLE_VISION !== "true") {
          await sendText(from, "Puedo recibir tu imagen ✅, pero aún no tengo visión activada. (ENABLE_VISION debe ser true)");
          return ok(res);
        }

        const mediaId = msg.image?.id as string;
        if (!mediaId) {
          await sendText(from, "Recibí una imagen, pero no vino el media.id (raro). Intenta reenviarla.");
          return ok(res);
        }

        await sendText(from, "Estoy leyendo la imagen 👀… dame 5 segundos.");

        const { url } = await getMediaUrl(mediaId);
        const { buf, mime } = await downloadMedia(url);

        const headline = await extractHeadlineFromImage(buf, mime);

        await sendText(
          from,
          headline
            ? `Titular detectado:\n${headline}`
            : "Pude abrir la imagen, pero no pude leer bien el titular. ¿Puedes mandar una captura más nítida o el link?"
        );

        return ok(res);
      }

      // Otros tipos (audio/video/doc) – por ahora responde algo claro
      await sendText(from, `Recibí un ${type} ✅. Aún no lo estoy procesando automáticamente.`);
      return ok(res);

    } catch (e: any) {
      console.log("ERROR:", e?.message || e);
      // Igual responde 200 a Meta para evitar reintentos infinitos
      return ok(res);
    }
  }

  res.statusCode = 405;
  res.setHeader("Allow", "GET, POST");
  return res.end("Method Not Allowed");
}

