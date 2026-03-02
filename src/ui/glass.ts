// src/ui/glass.ts
import type { CSSProperties } from "react";

export type GlassMode = "mano" | "civita" | "profes";

export type GlassPalette = {
  // neutrals
  ink: string;
  muted: string;
  bg0: string;
  bg1: string;

  // glass surfaces
  surface: string;   // rgba
  surface2: string;  // rgba
  border: string;    // rgba

  // global accents
  brand: string;
  brand2: string;
  accent: string;
  pink: string;

  // per-mode
  mode: GlassMode;
  modePrimary: string;
  modeGlow: string; // rgba
};

export function getModeColors(mode: GlassMode) {
  if (mode === "mano") {
    return {
      modePrimary: "#FFB020",
      modeGlow: "rgba(255,176,32,.28)",
    };
  }
  if (mode === "civita") {
    return {
      modePrimary: "#11C5B6",
      modeGlow: "rgba(17,197,182,.26)",
    };
  }
  return {
    modePrimary: "#5A3DFF",
    modeGlow: "rgba(90,61,255,.26)",
  };
}

export function makePalette(mode: GlassMode, isDark: boolean): GlassPalette {
  const base = {
    ink: isDark ? "#e9f0ff" : "#22314A",
    muted: isDark ? "#b6c3dd" : "#60708A",
    bg0: isDark ? "#0b1222" : "#f7f9ff",
    bg1: isDark ? "#0e1730" : "#eef3ff",
    surface: isDark ? "rgba(20, 30, 55, .70)" : "rgba(255,255,255,.78)",
    surface2: isDark ? "rgba(20, 30, 55, .86)" : "rgba(255,255,255,.90)",
    border: isDark ? "rgba(130,150,210,.18)" : "rgba(90,120,170,.18)",
    brand: "#2B63FF",
    brand2: "#5A3DFF",
    accent: "#11C5B6",
    pink: "#FF4D8D",
  };

  const mc = getModeColors(mode);
  return { ...base, mode, ...mc };
}

export const motion = {
  ease: "cubic-bezier(.2,.8,.2,1)",
  t: "180ms cubic-bezier(.2,.8,.2,1)",
};

export const radii = {
  xl: 28,
  lg: 22,
  md: 16,
  sm: 12,
};

export const shadows = {
  soft1: "0 12px 34px rgba(30, 60, 120, .12)",
  soft2: "0 8px 22px rgba(30, 60, 120, .14)",
  soft3: "0 3px 10px rgba(30, 60, 120, .12)",
  dark1: "0 16px 44px rgba(0,0,0,.40)",
  dark2: "0 10px 26px rgba(0,0,0,.38)",
  dark3: "0 4px 12px rgba(0,0,0,.28)",
};

export function pageAurora(p: GlassPalette): string {
  // fondo aurora suave sin negro puro
  return `radial-gradient(900px 600px at 15% 0%, rgba(43,99,255,.16), transparent 60%),
          radial-gradient(760px 560px at 85% 10%, rgba(17,197,182,.14), transparent 62%),
          radial-gradient(840px 640px at 50% 110%, rgba(255,176,32,.11), transparent 62%),
          radial-gradient(760px 560px at 70% 80%, rgba(255,77,141,.10), transparent 62%),
          linear-gradient(180deg, ${p.bg0}, ${p.bg1})`;
}

export function iridescentBorderGradient(p: GlassPalette): string {
  // borde iridiscente (muy sutil)
  return `linear-gradient(135deg,
    rgba(43,99,255,.55),
    rgba(17,197,182,.45),
    rgba(255,77,141,.40),
    rgba(90,61,255,.50)
  )`;
}

export function glassPanelStyle(p: GlassPalette, opts?: {
  radius?: number;
  blurPx?: number;
  borderOpacity?: number;   // 0..1
  tintOpacity?: number;     // 0..1
  elevated?: boolean;
}): CSSProperties {
  const radius = opts?.radius ?? radii.xl;
  const blurPx = opts?.blurPx ?? 18;
  const borderOpacity = opts?.borderOpacity ?? 0.22;
  const elevated = opts?.elevated ?? true;

  const shadow = elevated
    ? (p.bg0 === "#0b1222" ? shadows.dark1 : shadows.soft1)
    : (p.bg0 === "#0b1222" ? shadows.dark3 : shadows.soft3);

  // Trick: multi-background para simular borde iridiscente + fill
  // 1) backgroundClip/paddingBox con fill
  // 2) backgroundClip/borderBox con iridescent
  return {
    borderRadius: radius,
    border: "1px solid transparent",
    backgroundImage: `
      linear-gradient(${p.surface2}, ${p.surface2}),
      ${iridescentBorderGradient(p)}
    `,
    backgroundOrigin: "border-box",
    backgroundClip: "padding-box, border-box",
    boxShadow: shadow,
    backdropFilter: `blur(${blurPx}px)`,
    WebkitBackdropFilter: `blur(${blurPx}px)`,
    position: "relative",
    overflow: "hidden",
    transform: "translateZ(0)",
  };
}

export function modeGlowStyle(p: GlassPalette, opts?: { intensity?: number }): CSSProperties {
  const k = Math.max(0.6, Math.min(1.4, opts?.intensity ?? 1));
  // halo suave alrededor del panel (por modo)
  return {
    boxShadow: `
      0 0 0 1px rgba(255,255,255,.05) inset,
      0 18px 44px rgba(30, 60, 120, .10),
      0 0 46px ${p.modeGlow.replace(")", `)`)} 
    `,
    filter: `saturate(${1.02 * k})`,
  };
}

export function highlightsOverlayStyle(p: GlassPalette): CSSProperties {
  // brillos especulares + refracción suave
  return {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    backgroundImage: `
      radial-gradient(1200px 520px at 10% 0%, rgba(255,255,255,.38), transparent 60%),
      radial-gradient(900px 420px at 90% 12%, rgba(255,255,255,.18), transparent 62%),
      radial-gradient(520px 320px at 22% 18%, rgba(43,99,255,.18), transparent 60%),
      radial-gradient(520px 320px at 78% 22%, rgba(17,197,182,.14), transparent 60%),
      linear-gradient(180deg, rgba(255,255,255,.12), transparent 38%, rgba(0,0,0,.06))
    `,
    mixBlendMode: "screen",
    opacity: p.bg0 === "#0b1222" ? 0.55 : 0.75,
  };
}

// Grain overlay: SVG noise data-uri (ligero, sin assets)
export function grainOverlayStyle(p: GlassPalette): CSSProperties {
  const svg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="180" height="180">
      <filter id="n">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/>
        <feColorMatrix type="saturate" values="0"/>
      </filter>
      <rect width="180" height="180" filter="url(#n)" opacity="0.35"/>
    </svg>
  `);

  return {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    backgroundImage: `url("data:image/svg+xml,${svg}")`,
    opacity: p.bg0 === "#0b1222" ? 0.09 : 0.06,
    mixBlendMode: "overlay",
  };
}

export function interactiveLift(base: CSSProperties, isHover: boolean): CSSProperties {
  if (!isHover) return base;
  return {
    ...base,
    transform: "translateY(-1px)",
    transition: `transform ${motion.t}, box-shadow ${motion.t}, filter ${motion.t}`,
  };
}
