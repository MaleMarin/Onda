import type { CSSProperties } from "react";
import { motion } from "@/ui/glass";
import type { GlassPalette } from "@/ui/glass";

export function headerStyle(p: GlassPalette): CSSProperties {
  return {
    padding: "16px 16px",
    borderBottom: `1px solid ${p.border}`,
    background: `linear-gradient(90deg, rgba(43,99,255,.10), rgba(90,61,255,.08), rgba(17,197,182,.08))`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  };
}

export function tabWrapStyle(p: GlassPalette): CSSProperties {
  return {
    display: "flex",
    gap: 10,
    padding: "10px 12px",
    borderBottom: `1px solid ${p.border}`,
    background: p.surface,
  };
}

export function tabStyle(p: GlassPalette, active: boolean): CSSProperties {
  return {
    flex: 1,
    borderRadius: 999,
    padding: "10px 12px",
    cursor: "pointer",
    border: "1px solid transparent",
    backgroundImage: active
      ? `linear-gradient(${p.surface2}, ${p.surface2}), linear-gradient(135deg, ${p.modePrimary}, rgba(17,197,182,.55), rgba(255,77,141,.35), rgba(90,61,255,.55))`
      : `linear-gradient(${p.surface2}, ${p.surface2}), linear-gradient(135deg, rgba(255,255,255,.18), rgba(255,255,255,0))`,
    backgroundOrigin: "border-box",
    backgroundClip: "padding-box, border-box",
    color: active ? p.ink : p.muted,
    boxShadow: active ? `0 10px 24px rgba(30,60,120,.14), 0 0 28px ${p.modeGlow}` : `0 3px 10px rgba(30,60,120,.10)`,
    transition: `transform ${motion.t}, box-shadow ${motion.t}, filter ${motion.t}`,
  };
}

export function chipStyle(p: GlassPalette): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "9px 12px",
    borderRadius: 999,
    border: "1px solid transparent",
    backgroundImage: `
      linear-gradient(${p.surface2}, ${p.surface2}),
      linear-gradient(135deg, rgba(43,99,255,.35), rgba(17,197,182,.28), rgba(255,77,141,.22), rgba(90,61,255,.30))
    `,
    backgroundOrigin: "border-box",
    backgroundClip: "padding-box, border-box",
    color: p.ink,
    boxShadow: `0 3px 10px rgba(30,60,120,.10)`,
    cursor: "pointer",
    transition: `transform ${motion.t}, box-shadow ${motion.t}, filter ${motion.t}`,
  };
}

export function composerStyle(p: GlassPalette): CSSProperties {
  return {
    padding: 14,
    borderTop: `1px solid ${p.border}`,
    background: p.surface,
  };
}

export function inputStyle(p: GlassPalette, focused: boolean): CSSProperties {
  return {
    height: 46,
    width: "100%",
    padding: "0 14px",
    borderRadius: 18,
    border: `1px solid ${focused ? "rgba(43,99,255,.35)" : "rgba(90,120,170,.18)"}`,
    background: p.surface2,
    color: p.ink,
    outline: "none",
    boxShadow: focused
      ? `0 0 0 6px ${p.modeGlow}, inset 0 1px 0 rgba(255,255,255,.35)`
      : `inset 0 1px 0 rgba(255,255,255,.28)`,
    transition: `box-shadow ${motion.t}, border-color ${motion.t}, transform ${motion.t}`,
  };
}

export function sendStyle(p: GlassPalette): CSSProperties {
  return {
    height: 46,
    padding: "0 18px",
    borderRadius: 18,
    border: 0,
    cursor: "pointer",
    color: "#fff",
    fontWeight: 800,
    letterSpacing: ".2px",
    background: `radial-gradient(140px 70px at 20% 0%, rgba(255,255,255,.18), transparent 65%),
                linear-gradient(135deg, ${p.brand}, ${p.brand2})`,
    boxShadow: `0 14px 28px rgba(43,99,255,.22), 0 0 22px ${p.modeGlow}`,
    transition: `transform ${motion.t}, box-shadow ${motion.t}, filter ${motion.t}`,
  };
}
