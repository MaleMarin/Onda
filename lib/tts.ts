import OpenAI from "openai";

/** Máximo de caracteres para TTS: menos texto = respuesta más rápida. */
const MAX_TEXT_LENGTH = 2048;

/** Voces OpenAI TTS admitidas (si OPENAI_TTS_VOICE no coincide, se usa nova). */
const TTS_VOICES = new Set([
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "fable",
  "onyx",
  "nova",
  "sage",
  "shimmer",
]);

function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is required for TTS.");
  return new OpenAI({ apiKey: key });
}

function resolveTtsVoice(): OpenAI.Audio.SpeechCreateParams["voice"] {
  const raw = (process.env.OPENAI_TTS_VOICE || "nova").trim().toLowerCase();
  return (TTS_VOICES.has(raw) ? raw : "nova") as OpenAI.Audio.SpeechCreateParams["voice"];
}

function resolveTtsModel(): "tts-1" | "tts-1-hd" {
  const m = (process.env.OPENAI_TTS_MODEL || "tts-1").trim().toLowerCase();
  return m === "tts-1-hd" ? "tts-1-hd" : "tts-1";
}

/**
 * Genera audio (MP3) a partir de texto. Reutilizable en web (/api/tts) y en WhatsApp.
 * Por defecto: voz **nova** (mujer, mejor para español neutro que alloy) y modelo **tts-1** (rápido).
 * Para más naturalidad: `OPENAI_TTS_MODEL=tts-1-hd`. Otra voz femenina: `OPENAI_TTS_VOICE=shimmer`.
 */
export async function generateSpeech(text: string): Promise<Buffer> {
  const toSpeak = text.trim().slice(0, MAX_TEXT_LENGTH);
  if (!toSpeak) throw new Error("Text is required for TTS.");
  const openai = getOpenAI();
  const speech = await openai.audio.speech.create({
    model: resolveTtsModel(),
    voice: resolveTtsVoice(),
    input: toSpeak,
  });
  return Buffer.from(await speech.arrayBuffer());
}
