import { describe, it, expect } from "vitest";
import { computeWebPlayAudioDecision } from "./playAudioContract";

describe("computeWebPlayAudioDecision", () => {
  it("audio: siempre reproduce aunque el modelo no marque formato", () => {
    const r = computeWebPlayAudioDecision({
      outputMode: "audio",
      userMessage: "hola",
      parsed: { sendAudio: false },
    });
    expect(r.play).toBe(true);
    expect(r.reason).toBe("preference_audio");
  });

  it("texto: solo si el modelo marcó audio", () => {
    const off = computeWebPlayAudioDecision({
      outputMode: "text",
      userMessage: "hola",
      parsed: { sendAudio: false },
    });
    expect(off.play).toBe(false);
    const on = computeWebPlayAudioDecision({
      outputMode: "text",
      userMessage: "hola",
      parsed: { sendAudio: true },
    });
    expect(on.play).toBe(true);
    expect(on.reason).toBe("model_marker");
  });

  it("auto: reproduce si el usuario pidió voz en el mensaje", () => {
    const r = computeWebPlayAudioDecision({
      outputMode: "auto",
      userMessage: "Respondeme con voz por favor",
      parsed: { sendAudio: false },
    });
    expect(r.play).toBe(true);
    expect(r.reason).toBe("auto_user_asked_audio");
  });
});
