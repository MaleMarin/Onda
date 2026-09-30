import type { ReactNode } from "react";

/**
 * El root layout bloquea scroll en html/body (chat a pantalla completa).
 * Esta ruta necesita scroll vertical de documento.
 */
export default function PrivacidadLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="onda-privacidad-scroll"
      style={{
        height: "100%",
        maxHeight: "100dvh",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}
