"use client";

import type { ListeningInviteStreamPayload } from "@/lib/onda/contributions/types";
import type { OndaTheme } from "@/lib/ondaTheme";

type Props = {
  invite: ListeningInviteStreamPayload;
  theme: OndaTheme;
};

/**
 * Invitación breve a escucha estructurada (sin formulario largo).
 * El aporte se envía con el siguiente mensaje del usuario en el flujo normal del chat.
 */
export function ContributionPrompt({ invite, theme: t }: Props) {
  return (
    <div
      style={{
        marginTop: 12,
        paddingTop: 10,
        borderTop: `1px solid ${t.c.border}`,
      }}
    >
      <p style={{ fontSize: "0.875rem", color: t.c.muted, lineHeight: 1.45, margin: "0 0 6px" }}>{invite.prompt}</p>
      <p style={{ fontSize: "0.8125rem", color: t.c.muted2, margin: 0, fontStyle: "italic" }}>
        Si respondes abajo con una línea o dos, puede registrarse como aporte opcional para el equipo (no es obligatorio).
      </p>
    </div>
  );
}
