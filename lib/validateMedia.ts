import { execFile } from "child_process";
import { randomUUID } from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";
import sharp from "sharp";

const execFileAsync = promisify(execFile);

export const MEDIA_LIMITS = {
  image: {
    maxSizeBytes: 5 * 1024 * 1024,
    allowedTypes: ["image/jpeg", "image/png", "image/webp"] as const,
  },
  audio: {
    maxSizeBytes: 10 * 1024 * 1024,
    maxDurationSeconds: 120,
  },
} as const;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/** Mensajes que `transcribeAudio` re-lanza para que los routes respondan 400. */
export const AUDIO_VALIDATION_TOO_LARGE =
  "El archivo de audio es demasiado grande. El máximo es 10 MB.";
export const AUDIO_VALIDATION_TOO_LONG =
  "El audio es demasiado largo. El máximo es 2 minutos.";

export function isAudioValidationErrorMessage(msg: string): boolean {
  return msg === AUDIO_VALIDATION_TOO_LARGE || msg === AUDIO_VALIDATION_TOO_LONG;
}

const IMAGE_USER_ERROR =
  "La imagen no es válida. Probá con un archivo JPG, PNG o WebP de menos de 5MB.";

export function bufferFromDataUrl(dataUrl: string): Buffer | null {
  const comma = dataUrl.indexOf(",");
  if (comma === -1 || !dataUrl.startsWith("data:")) return null;
  try {
    return Buffer.from(dataUrl.slice(comma + 1), "base64");
  } catch {
    return null;
  }
}

function resolveFfmpegPath(): string | null {
  try {
    const fp = require("ffmpeg-static") as string | undefined | null;
    if (typeof fp === "string" && fp.length > 0) return fp;
  } catch {
    /* ignore */
  }
  return null;
}

function resolveFfprobePath(ffmpegPath: string): string | null {
  const dir = path.dirname(ffmpegPath);
  const candidate = path.join(dir, process.platform === "win32" ? "ffprobe.exe" : "ffprobe");
  try {
    if (fs.existsSync(candidate)) return candidate;
  } catch {
    /* ignore */
  }
  return null;
}

function parseDurationFromFfmpegStderr(stderr: string): number | null {
  const m = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const sec = parseFloat(m[3]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || !Number.isFinite(sec)) return null;
  return h * 3600 + min * 60 + sec;
}

/**
 * Duración en segundos, o null si no se pudo medir (fail-open para el caller).
 */
async function probeAudioDurationSeconds(filePath: string): Promise<number | null> {
  const ffmpegPath = resolveFfmpegPath();
  if (!ffmpegPath) {
    console.warn("[validateMedia] ffmpeg-static no disponible; no se valida duración.");
    return null;
  }

  const ffprobePath = resolveFfprobePath(ffmpegPath);
  if (ffprobePath) {
    try {
      const { stdout } = await execFileAsync(
        ffprobePath,
        ["-v", "quiet", "-print_format", "json", "-show_format", filePath],
        { maxBuffer: 2 * 1024 * 1024, timeout: 60_000 }
      );
      const j = JSON.parse(String(stdout)) as { format?: { duration?: string } };
      const d = parseFloat(j?.format?.duration ?? "");
      if (Number.isFinite(d)) return d;
    } catch (e) {
      console.warn("[validateMedia] ffprobe falló, se intentará con ffmpeg:", e);
    }
  }

  try {
    const { stderr } = await execFileAsync(
      ffmpegPath,
      ["-hide_banner", "-i", filePath, "-f", "null", "-"],
      { maxBuffer: 10 * 1024 * 1024, timeout: 120_000 }
    );
    const ok = parseDurationFromFfmpegStderr(String(stderr ?? ""));
    if (ok !== null) return ok;
  } catch (err: unknown) {
    const stderr =
      err && typeof err === "object" && "stderr" in err
        ? String((err as { stderr?: Buffer }).stderr ?? "")
        : "";
    const parsed = parseDurationFromFfmpegStderr(stderr);
    if (parsed !== null) return parsed;
    console.warn("[validateMedia] No se pudo obtener duración con ffmpeg (fail-open):", err);
  }
  return null;
}

export async function validateImage(buffer: Buffer): Promise<ValidationResult> {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return { valid: false, error: IMAGE_USER_ERROR };
  }
  if (buffer.length > MEDIA_LIMITS.image.maxSizeBytes) {
    return { valid: false, error: IMAGE_USER_ERROR };
  }
  try {
    const meta = await sharp(buffer).metadata();
    const fmt = meta.format;
    if (fmt !== "jpeg" && fmt !== "png" && fmt !== "webp") {
      return { valid: false, error: IMAGE_USER_ERROR };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: IMAGE_USER_ERROR };
  }
}

export async function validateAudio(buffer: Buffer, filePath?: string): Promise<ValidationResult> {
  if (buffer.length > MEDIA_LIMITS.audio.maxSizeBytes) {
    return { valid: false, error: AUDIO_VALIDATION_TOO_LARGE };
  }

  let tempPath: string | null = null;
  const probeTarget = filePath ?? null;

  try {
    let pathForProbe = probeTarget;
    if (!pathForProbe) {
      const tmpDir = path.join(os.tmpdir(), "onda-validate-audio");
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
      tempPath = path.join(tmpDir, `probe-${randomUUID()}.audio`);
      fs.writeFileSync(tempPath, buffer);
      pathForProbe = tempPath;
    }

    const duration = await probeAudioDurationSeconds(pathForProbe);
    if (duration === null) {
      console.warn(
        "[validateMedia] No se pudo medir la duración del audio; se omite el tope de 2 min (fail-open)."
      );
      return { valid: true };
    }
    if (duration > MEDIA_LIMITS.audio.maxDurationSeconds) {
      return { valid: false, error: AUDIO_VALIDATION_TOO_LONG };
    }
    return { valid: true };
  } finally {
    if (tempPath) {
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch {
        /* ignore */
      }
    }
  }
}
