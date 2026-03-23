import sharp from "sharp";
import { describe, it, expect } from "vitest";
import {
  AUDIO_VALIDATION_TOO_LARGE,
  AUDIO_VALIDATION_TOO_LONG,
  MEDIA_LIMITS,
  bufferFromDataUrl,
  isAudioValidationErrorMessage,
  validateAudio,
  validateImage,
} from "@/lib/validateMedia";

describe("MEDIA_LIMITS", () => {
  it("imagen máximo 5MB", () => {
    expect(MEDIA_LIMITS.image.maxSizeBytes).toBe(5 * 1024 * 1024);
  });
  it("audio máximo 2 minutos", () => {
    expect(MEDIA_LIMITS.audio.maxDurationSeconds).toBe(120);
  });
  it("tipos de imagen permitidos incluyen jpeg y webp", () => {
    expect(MEDIA_LIMITS.image.allowedTypes).toContain("image/jpeg");
    expect(MEDIA_LIMITS.image.allowedTypes).toContain("image/webp");
  });
});

describe("bufferFromDataUrl", () => {
  it("extrae buffer de data URL válida", () => {
    const buf = Buffer.from("abc");
    const b64 = buf.toString("base64");
    const out = bufferFromDataUrl(`data:image/png;base64,${b64}`);
    expect(out).not.toBeNull();
    expect(out?.equals(buf)).toBe(true);
  });

  it("retorna null si no es data URL", () => {
    expect(bufferFromDataUrl("plain")).toBeNull();
  });
});

describe("isAudioValidationErrorMessage", () => {
  it("detecta mensajes de validación de audio", () => {
    expect(isAudioValidationErrorMessage(AUDIO_VALIDATION_TOO_LARGE)).toBe(true);
    expect(isAudioValidationErrorMessage(AUDIO_VALIDATION_TOO_LONG)).toBe(true);
    expect(isAudioValidationErrorMessage("otro")).toBe(false);
  });
});

describe("validateImage", () => {
  it("rechaza buffer vacío", async () => {
    const r = await validateImage(Buffer.alloc(0));
    expect(r.valid).toBe(false);
  });

  it("rechaza si supera tamaño máximo", async () => {
    const r = await validateImage(Buffer.alloc(MEDIA_LIMITS.image.maxSizeBytes + 1));
    expect(r.valid).toBe(false);
  });

  it("acepta JPEG válido pequeño", async () => {
    const jpeg = await sharp({
      create: { width: 2, height: 2, channels: 3, background: "#fff" },
    })
      .jpeg()
      .toBuffer();
    const r = await validateImage(jpeg);
    expect(r.valid).toBe(true);
  });
});

describe("validateAudio", () => {
  it("rechaza audio demasiado grande", async () => {
    const r = await validateAudio(Buffer.alloc(MEDIA_LIMITS.audio.maxSizeBytes + 1));
    expect(r.valid).toBe(false);
    expect(r.error).toBe(AUDIO_VALIDATION_TOO_LARGE);
  });

  it("acepta buffer pequeño si no se puede medir duración (fail-open)", async () => {
    const r = await validateAudio(Buffer.from("fake-audio-bytes"));
    expect(r.valid).toBe(true);
  });
});
