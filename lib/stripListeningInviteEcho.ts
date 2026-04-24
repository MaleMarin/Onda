import type { ListeningInviteStreamPayload } from "@/lib/onda/contributions/types";

const LEGACY_INLINE_HINT_ES =
  "Si respondes abajo con una línea o dos, puede registrarse como aporte opcional para el equipo (no es obligatorio).";

const LEGACY_INLINE_HINT_PT =
  "Se você responder abaixo com uma linha ou duas, pode ser registrado como contribuição opcional para a equipe (não é obrigatório).";

/**
 * Quita del texto del asistente el eco de la invitación a escucha cuando el modelo
 * la repitió en markdown; la invitación canónica va por NDJSON + burbuja aparte.
 */
export function stripListeningInviteEchoFromText(
  text: string,
  invite?: ListeningInviteStreamPayload | null
): string {
  let out = (text ?? "").replace(/\r\n/g, "\n");
  const p = invite?.prompt?.trim();
  if (p && out.includes(p)) {
    out = out.split(p).join("");
  }
  if (out.includes(LEGACY_INLINE_HINT_ES)) {
    out = out.split(LEGACY_INLINE_HINT_ES).join("");
  }
  if (out.includes(LEGACY_INLINE_HINT_PT)) {
    out = out.split(LEGACY_INLINE_HINT_PT).join("");
  }
  const LEGACY_INLINE_HINT_PT_TYPO =
    "Se responder abaixo com uma linha ou duas, pode ser registrado como contribuição opcional para a equipe (não é obrigatório).";
  if (out.includes(LEGACY_INLINE_HINT_PT_TYPO)) {
    out = out.split(LEGACY_INLINE_HINT_PT_TYPO).join("");
  }
  return out.replace(/\n{3,}/g, "\n\n").trim();
}
