"use client";

import type { CSSProperties } from "react";

export type HealthBannerStatus = "ok" | "degraded" | "down" | "unknown";

export interface OfflineBannerProps {
  status: HealthBannerStatus;
}

const DEGRADED_MSG =
  "Estoy respondiendo más lento de lo normal. Tus consultas llegarán, puede tomar un momento más.";
const DOWN_MSG =
  "Estoy teniendo dificultades técnicas en este momento. El equipo de Precisar ya está trabajando en ello.";

const wrapStyle: CSSProperties = {
  width: "100%",
  flexShrink: 0,
  animation: "ondaOfflineBannerIn 0.3s ease forwards",
};

export function OfflineBanner({ status }: OfflineBannerProps) {
  if (status === "ok" || status === "unknown") return null;

  const isDown = status === "down";
  const bg = isDown ? "rgba(220, 80, 80, 0.22)" : "rgba(255, 214, 100, 0.35)";
  const border = isDown ? "rgba(180, 40, 40, 0.35)" : "rgba(200, 160, 0, 0.4)";
  const icon = isDown ? "🔴" : "⚠️";

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        ...wrapStyle,
        padding: "10px 14px",
        marginBottom: 8,
        borderRadius: 12,
        background: bg,
        border: `1px solid ${border}`,
        color: "#1a1a1a",
        fontSize: "0.875rem",
        lineHeight: 1.5,
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
      }}
    >
      <span aria-hidden="true" style={{ flexShrink: 0, fontSize: "1.125rem" }}>
        {icon}
      </span>
      <span>{isDown ? DOWN_MSG : DEGRADED_MSG}</span>
    </div>
  );
}
