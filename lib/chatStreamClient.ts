/**
 * Consumo del stream NDJSON de POST /api/chat/stream (cliente).
 */

import type { ListeningInviteStreamPayload } from "./communityContributionTypes";
import { STORAGE_KEY_ONDA_ULTIMO_TEMA } from "./userPreferences";

export type ChatStreamMeta = {
  fullContent: string;
  receivedAnyText: boolean;
  /** Definido por el servidor cuando envía la línea `playAudio` (contrato de producto). */
  serverPlayAudio?: boolean;
  serverPlayAudioReason?: string;
  /** Escucha estructurada: invitación opcional al final del turno. */
  listeningInvite?: ListeningInviteStreamPayload;
};

/**
 * Lee el cuerpo del stream línea a línea; opcionalmente notifica cada chunk de texto del asistente.
 */
export async function consumeChatNdjsonStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onTextChunk?: (chunk: string) => void,
  onStreamError?: (message: string) => void
): Promise<ChatStreamMeta> {
  const decoder = new TextDecoder();
  let acc = "";
  let fullContent = "";
  let receivedAnyText = false;
  let serverPlayAudio: boolean | undefined;
  let serverPlayAudioReason: string | undefined;
  let listeningInvite: ListeningInviteStreamPayload | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const lines = (acc + decoder.decode(value, { stream: true })).split("\n");
    acc = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line) as Record<string, unknown>;
        if (obj.done) break;
        if (typeof obj.text === "string") {
          receivedAnyText = true;
          fullContent += obj.text;
          onTextChunk?.(obj.text);
        }
        if (obj.error) {
          receivedAnyText = true;
          fullContent = String(obj.error);
          onStreamError?.(fullContent);
          break;
        }
        if (typeof obj.tema === "string" && obj.tema.trim() && typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY_ONDA_ULTIMO_TEMA, obj.tema.trim());
        }
        if (typeof obj.playAudio === "boolean") {
          serverPlayAudio = obj.playAudio;
        }
        if (typeof obj.playAudioReason === "string") {
          serverPlayAudioReason = obj.playAudioReason;
        }
        if (obj.listeningInvite && typeof obj.listeningInvite === "object") {
          const li = obj.listeningInvite as Record<string, unknown>;
          if (li.show === true && typeof li.prompt === "string" && typeof li.turnToken === "string") {
            listeningInvite = {
              show: true,
              prompt: li.prompt,
              turnToken: li.turnToken,
              userEcho: typeof li.userEcho === "string" ? li.userEcho : "",
              assistantSummary: typeof li.assistantSummary === "string" ? li.assistantSummary : "",
              topicHint: typeof li.topicHint === "string" ? li.topicHint : "comunidad",
              locale: typeof li.locale === "string" ? li.locale : "es-LATAM",
            };
          }
        }
      } catch {
        /* ignore malformed line */
      }
    }
  }

  return {
    fullContent,
    receivedAnyText,
    serverPlayAudio,
    serverPlayAudioReason,
    listeningInvite,
  };
}
