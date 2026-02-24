import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is required for transcription.");
  return new OpenAI({ apiKey: key });
}

/**
 * Transcribe audio from base64 (data URL or raw base64) using OpenAI Whisper.
 * Supported formats: webm, mp3, mp4, mpeg, mpga, m4a, wav.
 * Returns the transcribed text or throws.
 */
export async function transcribeAudio(audioBase64: string): Promise<string> {
  const openai = getOpenAI();

  let buffer: Buffer;
  let ext = "webm";

  if (audioBase64.startsWith("data:")) {
    const [header, data] = audioBase64.split(",");
    buffer = Buffer.from(data ?? "", "base64");
    const mime = header?.split(";")[0].split(":")[1]?.trim() ?? "";
    if (mime.includes("webm")) ext = "webm";
    else if (mime.includes("mp3")) ext = "mp3";
    else if (mime.includes("m4a") || mime.includes("mp4")) ext = "m4a";
    else if (mime.includes("wav")) ext = "wav";
  } else {
    buffer = Buffer.from(audioBase64, "base64");
  }

  const tmpDir = path.join(process.cwd(), "tmp");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const tmpPath = path.join(tmpDir, `whisper-${randomUUID()}.${ext}`);

  try {
    fs.writeFileSync(tmpPath, buffer);
    const stream = fs.createReadStream(tmpPath);

    const transcription = await openai.audio.transcriptions.create({
      file: stream,
      model: "whisper-1",
      language: "es",
    });

    return (transcription as { text?: string }).text?.trim() ?? "";
  } finally {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch {
      // ignore
    }
  }
}
