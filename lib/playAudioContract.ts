/**
 * Contrato de salida por audio (web): decide si se dispara TTS tras un stream,
 * sin depender solo de que el modelo emita [ONDA_FORMATO:audio].
 */

import type { OutputMode } from "./userPreferences";
import type { ParsedResponse } from "./responseFormat";
import { wantsAudio } from "./responseFormat";

export type PlayAudioReason =
  | "preference_audio"
  | "auto_user_asked_audio"
  | "model_marker"
  | "none";

export function computeWebPlayAudioDecision(params: {
  outputMode: OutputMode;
  userMessage: string;
  parsed: Pick<ParsedResponse, "sendAudio">;
}): { play: boolean; reason: PlayAudioReason } {
  if (params.outputMode === "audio") {
    return { play: true, reason: "preference_audio" };
  }
  if (params.parsed.sendAudio) {
    return { play: true, reason: "model_marker" };
  }
  if (params.outputMode === "auto" && wantsAudio(params.userMessage)) {
    return { play: true, reason: "auto_user_asked_audio" };
  }
  return { play: false, reason: "none" };
}
