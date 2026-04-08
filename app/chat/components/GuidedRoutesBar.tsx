"use client";

import type { CSSProperties } from "react";
import { EjeOnda } from "@/content/types";
import type { OndaTheme } from "@/lib/ondaTheme";

export type GuidedRouteItem = {
  id: string;
  eje: EjeOnda;
  label: string;
  prompt: string;
};

type Props = {
  title: string;
  routes: GuidedRouteItem[];
  orgTitle: string;
  orgRoutes: {
    id: string;
    label: string;
    eje: EjeOnda;
    audience: "teacher" | "community_mediator";
    prompt: string;
  }[];
  onRoute: (eje: EjeOnda, prompt: string) => void;
  onOrgRoute: (eje: EjeOnda, audience: "teacher" | "community_mediator", prompt: string) => void;
  disabled: boolean;
  theme: OndaTheme;
  lowBandwidth: boolean;
};

export function GuidedRoutesBar({
  title,
  routes,
  orgTitle,
  orgRoutes,
  onRoute,
  onOrgRoute,
  disabled,
  theme: t,
  lowBandwidth,
}: Props) {
  const btn: CSSProperties = {
    flex: "0 0 auto",
    padding: "10px 14px",
    borderRadius: 14,
    border: `2px solid ${t.glass.border}`,
    background: t.glass.bg,
    color: t.c.ink,
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
    minHeight: 44,
    textAlign: "left",
    maxWidth: 260,
    boxShadow: lowBandwidth ? "none" : t.shadow.neuRaised,
  };

  const row: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 10,
  };

  const scroll: CSSProperties = {
    display: "flex",
    gap: 8,
    overflowX: "auto",
    paddingBottom: 4,
    WebkitOverflowScrolling: "touch",
  };

  return (
    <div role="region" aria-label={title} style={row}>
      <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: t.c.muted, letterSpacing: "0.04em" }}>{title}</div>
      <div style={scroll}>
        {routes.map((r) => (
          <button
            key={r.id}
            type="button"
            disabled={disabled}
            onClick={() => onRoute(r.eje, r.prompt)}
            style={btn}
          >
            {r.label}
          </button>
        ))}
      </div>
      {!lowBandwidth && (
        <>
          <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: t.c.muted, letterSpacing: "0.04em", marginTop: 4 }}>
            {orgTitle}
          </div>
          <div style={scroll}>
            {orgRoutes.map((r) => (
              <button
                key={r.id}
                type="button"
                disabled={disabled}
                onClick={() => onOrgRoute(r.eje, r.audience, r.prompt)}
                style={btn}
              >
                {r.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
