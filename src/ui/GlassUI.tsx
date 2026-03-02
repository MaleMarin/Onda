// src/ui/GlassUI.tsx — componentes capas glass
"use client";

import React, { useMemo } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  type GlassMode,
  type GlassPalette,
  makePalette,
  pageAurora,
  glassPanelStyle,
  highlightsOverlayStyle,
  grainOverlayStyle,
  modeGlowStyle,
  radii,
  motion,
} from "./glass";

export function GlassPage(props: {
  mode: GlassMode;
  isDark: boolean;
  children: ReactNode;
}) {
  const p = useMemo(() => makePalette(props.mode, props.isDark), [props.mode, props.isDark]);

  const style: CSSProperties = {
    height: "100vh",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "16px",
    background: pageAurora(p),
    color: p.ink,
    fontFamily:
      `ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"`,
  };

  return <div style={style}>{props.children}</div>;
}

export function GlassShell(props: {
  palette: GlassPalette;
  width?: number;
  children: ReactNode;
}) {
  const { palette: p } = props;
  const shell: CSSProperties = {
    width: "100%",
    maxWidth: props.width ?? 980,
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    ...glassPanelStyle(p, { radius: radii.xl, blurPx: 20, elevated: true }),
    ...modeGlowStyle(p, { intensity: 1.0 }),
  };

  return (
    <div style={shell}>
      <div style={highlightsOverlayStyle(p)} />
      <div style={grainOverlayStyle(p)} />
      <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {props.children}
      </div>
    </div>
  );
}

export function GlassCard(props: {
  palette: GlassPalette;
  children: ReactNode;
  padding?: number;
  radius?: number;
}) {
  const { palette: p } = props;
  const card: CSSProperties = {
    ...glassPanelStyle(p, { radius: props.radius ?? radii.lg, blurPx: 16, elevated: false }),
    backgroundImage: `
      linear-gradient(${p.surface}, ${p.surface}),
      linear-gradient(135deg, rgba(255,255,255,.22), rgba(255,255,255,0))
    `,
  };

  return (
    <div style={card}>
      <div style={highlightsOverlayStyle(p)} />
      <div style={grainOverlayStyle(p)} />
      <div style={{ position: "relative", padding: props.padding ?? 14 }}>
        {props.children}
      </div>
    </div>
  );
}

export function GlassPillButton(props: {
  palette: GlassPalette;
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
}) {
  const { palette: p } = props;
  const base: CSSProperties = {
    borderRadius: 999,
    border: "1px solid transparent",
    backgroundImage: `
      linear-gradient(${p.surface2}, ${p.surface2}),
      linear-gradient(135deg, rgba(43,99,255,.45), rgba(17,197,182,.35), rgba(255,77,141,.28), rgba(90,61,255,.40))
    `,
    backgroundOrigin: "border-box",
    backgroundClip: "padding-box, border-box",
    padding: "10px 12px",
    cursor: "pointer",
    userSelect: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    color: p.ink,
    transition: `transform ${motion.t}, box-shadow ${motion.t}, filter ${motion.t}`,
    boxShadow: props.active
      ? `0 10px 24px rgba(30,60,120,.14), 0 0 26px ${p.modeGlow}`
      : `0 3px 10px rgba(30,60,120,.10)`,
    filter: props.active ? "saturate(1.06)" : "saturate(1.0)",
    ...(props.style ?? {}),
  };

  return (
    <button type="button" onClick={props.onClick} style={base}>
      {props.children}
    </button>
  );
}
