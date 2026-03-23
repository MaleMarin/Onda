import OpenAI from "openai";
import fs from "fs";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/** Códigos en `error.message` para mapear respuestas HTTP en el route. */
export const TRANSCRIBE_ERROR = {
  AUDIO_TOO_SMALL: "audio_too_small",
  FFMPEG_MISSING: "ffmpeg_missing",
  FFMPEG_CONVERT_FAILED: "ffmpeg_convert_failed",
  WHISPER_FAILED: "whisper_failed",
} as const;

const isDev = process.env.NODE_ENV === "development";

function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is required for transcription.");
  return new OpenAI({ apiKey: key });
}

/** Mínimo de bytes en transcribe (alineado con validación del route). */
const MIN_AUDIO_BYTES = 12_000;

/** webm/ogg/opus: siempre pasar por ffmpeg → WAV 16k mono antes de Whisper. */
const NEEDS_CONVERT_MIME = /audio\/(webm|ogg|x-opus)/i;

type AudioInput = string | Buffer | Uint8Array;

function toBuffer(input: AudioInput): { buffer: Buffer; mime: string; ext: string } {
  let buffer: Buffer;
  let mime = "";
  let ext = "webm";

  if (Buffer.isBuffer(input)) {
    buffer = input;
    ext = "webm";
  } else if (input instanceof Uint8Array) {
    buffer = Buffer.from(input);
    ext = "webm";
  } else {
    const s = String(input);
    if (s.startsWith("data:")) {
      const commaIdx = s.indexOf(",");
      if (commaIdx === -1) throw new Error("Formato de audio inválido.");
      const header = s.slice(0, commaIdx);
      mime = header.split(";")[0].replace("data:", "").trim().toLowerCase();
      buffer = Buffer.from(s.slice(commaIdx + 1), "base64");
      if (mime.includes("webm")) ext = "webm";
      else if (mime.includes("ogg")) ext = "ogg";
      else if (mime.includes("mp3") || mime.includes("mpeg")) ext = "mp3";
      else if (mime.includes("m4a") || mime.includes("mp4")) ext = "m4a";
      else if (mime.includes("wav")) ext = "wav";
    } else {
      buffer = Buffer.from(s, "base64");
    }
  }

  if (buffer.length < MIN_AUDIO_BYTES) {
    throw new Error(TRANSCRIBE_ERROR.AUDIO_TOO_SMALL);
  }

  return { buffer, mime, ext };
}

/**
 * Convierte un archivo de audio a WAV 16kHz mono usando ffmpeg-static.
 */
async function convertToWav16kMono(
  inputPath: string,
  outputPath: string,
  ffmpegPath: string
): Promise<void> {
  await execFileAsync(
    ffmpegPath,
    ["-y", "-i", inputPath, "-ar", "16000", "-ac", "1", "-f", "wav", outputPath],
    { timeout: 120_000 }
  );
}

function resolveFfmpegPath(): string | null {
  try {
    const fp = require("ffmpeg-static") as string | undefined | null;
    if (typeof fp === "string" && fp.length > 0) return fp;
  } catch {
    // no instalado
  }
  return null;
}

function needsFfmpegConversion(mime: string, ext: string): boolean {
  return NEEDS_CONVERT_MIME.test(mime) || ext === "webm" || ext === "ogg";
}

/**
 * Transcribe audio desde data URL (base64), Buffer o Uint8Array.
 * webm/ogg: conversión obligatoria a WAV 16k mono con ffmpeg-static (sin fallback a webm crudo).
 */
export async function transcribeAudio(audioInput: AudioInput): Promise<string> {
  const openai = getOpenAI();
  const { buffer, mime, ext } = toBuffer(audioInput);

  if (isDev) {
    console.log("[transcribe] dev", { mime, ext, bufferLength: buffer.length });
  }

  const tmpDir = path.join(os.tmpdir(), "onda-whisper");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const id = randomUUID();
  const inputPath = path.join(tmpDir, `audio-${id}.${ext}`);
  const wavPath = path.join(tmpDir, `audio-${id}.wav`);
  let pathToSend = inputPath;

  try {
    fs.writeFileSync(inputPath, buffer);

    const mustConvert = needsFfmpegConversion(mime, ext);

    if (mustConvert) {
      const ffmpegPath = resolveFfmpegPath();
      if (!ffmpegPath) {
        throw new Error(TRANSCRIBE_ERROR.FFMPEG_MISSING);
      }
      try {
        await convertToWav16kMono(inputPath, wavPath, ffmpegPath);
      } catch (convErr) {
        console.error("[transcribe] ffmpeg convert failed", convErr);
        throw new Error(TRANSCRIBE_ERROR.FFMPEG_CONVERT_FAILED);
      }
      if (!fs.existsSync(wavPath) || fs.statSync(wavPath).size < 100) {
        console.error("[transcribe] ffmpeg produced missing or tiny wav");
        throw new Error(TRANSCRIBE_ERROR.FFMPEG_CONVERT_FAILED);
      }
      pathToSend = wavPath;
    }

    const stream = fs.createReadStream(pathToSend) as fs.ReadStream & { path?: string };
    stream.path = pathToSend;

    try {
      const transcription = await openai.audio.transcriptions.create({
        file: stream,
        model: "whisper-1",
        language: "es",
      });
      return (transcription as { text?: string }).text?.trim() ?? "";
    } catch (whisperErr) {
      console.error("[transcribe] whisper failed", whisperErr);
      throw new Error(TRANSCRIBE_ERROR.WHISPER_FAILED);
    }
  } catch (err) {
    if (err instanceof Error) {
      const known = Object.values(TRANSCRIBE_ERROR) as string[];
      if (known.includes(err.message)) throw err;
    }
    console.error("[transcribe] unexpected", err);
    throw new Error(TRANSCRIBE_ERROR.WHISPER_FAILED);
  } finally {
    for (const p of [inputPath, wavPath]) {
      try {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } catch {
        // ignore
      }
    }
  }
}
