import OpenAI from "openai";

const MAX_TEXT_LENGTH = 4096;

function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is required for TTS.");
  return new OpenAI({ apiKey: key });
}

/**
 * Genera audio (MP3) a partir de texto. Reutilizable en web (/api/tts) y en WhatsApp.
 */
export async function generateSpeech(text: string): Promise<Buffer> {
  const toSpeak = text.trim().slice(0, MAX_TEXT_LENGTH);
  if (!toSpeak) throw new Error("Text is required for TTS.");
  const openai = getOpenAI();
  const speech = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    input: toSpeak,
  });
  return Buffer.from(await speech.arrayBuffer());
}
