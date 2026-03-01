import type { CSSProperties } from "react";

export type OndaMode = "light" | "dark";

export type OndaTheme = ReturnType<typeof createOndaTheme>;

/** Paleta Onda Bot: naranja de marca + grises */
const ONDA_PALETTE = {
  orange: "#FB5002",
  black: "#000000",
  white: "#FFFFFF",
  gray: "#646464",
  lightGray: "#A7A7A7",
  darkGray: "#333333",
  /** Gradiente marca: negro → naranja oscuro → naranja → naranja claro */
  gradientStart: "#000000",
  gradientMid: "#FC3D01",
  gradientBright: "#FF8001",
  gradientLight: "#F08C5A",
} as const;

/**
 * Liquid glass (material system):
 * - Outer shell: thickness cues (border, highlight band, inner stroke), controlled refraction.
 * - Inner stabilized plate: text/icon stability, consistent contrast.
 * - One light model: light from top → highlight always on top edge.
 * - Fallback: same layout/anatomy, no blur, more opaque surface so content stays stable.
 */
/** Más transparente, sin azul; sin blur para que el bot funcione siempre. */
const GLASS_LIGHT = {
  bg: "rgba(255, 255, 255, 0.12)",
  border: "rgba(255, 255, 255, 0.95)",
  borderSoft: "rgba(255, 255, 255, 0.8)",
  plate: "rgba(255, 255, 255, 0.28)",
} as const;

const GLASS_DARK = {
  bg: "rgba(255, 255, 255, 0.03)",
  border: "rgba(255, 255, 255, 0.42)",
  borderSoft: "rgba(255, 255, 255, 0.26)",
  plate: "rgba(255, 255, 255, 0.06)",
} as const;

/** Fallback when backdrop-filter is unavailable: same edges, no blur, stable content. */
const GLASS_FALLBACK_LIGHT = {
  bg: "rgba(255, 255, 255, 0.92)",
  border: "rgba(255, 255, 255, 0.9)",
  borderSoft: "rgba(255, 255, 255, 0.75)",
  plate: "rgba(255, 255, 255, 0.88)",
} as const;

const GLASS_FALLBACK_DARK = {
  bg: "rgba(28, 28, 28, 0.95)",
  border: "rgba(255, 255, 255, 0.2)",
  borderSoft: "rgba(255, 255, 255, 0.15)",
  plate: "rgba(40, 40, 40, 0.95)",
} as const;

export type OndaThemeOptions = { useFallback?: boolean };

export function createOndaTheme(mode: OndaMode, options?: OndaThemeOptions) {
  const isDark = mode === "dark";
  const useFallback = options?.useFallback ?? false;
  const glass = useFallback
    ? (isDark ? GLASS_FALLBACK_DARK : GLASS_FALLBACK_LIGHT)
    : (isDark ? GLASS_DARK : GLASS_LIGHT);

  const c = {
    bg0: isDark ? ONDA_PALETTE.darkGray : "#f8f8f8",
    bg1: isDark ? "#1a1a1a" : "#f0f0f0",
    surface: isDark ? "rgba(51, 51, 51, 0.6)" : glass.bg,
    surface2: isDark ? "rgba(255,255,255,.08)" : "rgba(255,255,255,0.4)",
    border: isDark ? glass.borderSoft : glass.border,
    borderSoft: glass.borderSoft,
    ink: isDark ? ONDA_PALETTE.white : ONDA_PALETTE.black,
    muted: isDark ? ONDA_PALETTE.lightGray : ONDA_PALETTE.gray,
    muted2: isDark ? ONDA_PALETTE.lightGray : ONDA_PALETTE.lightGray,
    brand: ONDA_PALETTE.orange,
    naranja: ONDA_PALETTE.orange,
    orange: ONDA_PALETTE.orange,
    black: ONDA_PALETTE.black,
    white: ONDA_PALETTE.white,
    gray: ONDA_PALETTE.gray,
    lightGray: ONDA_PALETTE.lightGray,
    darkGray: ONDA_PALETTE.darkGray,
    ring: "rgba(251, 80, 2, 0.35)",
    focus: "rgba(251, 80, 2, 0.25)",
    danger: "#ea3546",
    warnBg: "rgba(234, 53, 70, 0.1)",
    warnBorder: "rgba(234, 53, 70, 0.3)",
    warnText: "#c41e3a",
  } as const;

  /** Borde superior = luz sobre el cristal. Banda gruesa y muy brillante = 1000% vidrio. */
  const highlightTop = isDark
    ? "inset 0 3px 0 rgba(255,255,255,0.28)"
    : "inset 0 3px 0 rgba(255,255,255,1)";
  const highlightTopStrong = isDark
    ? "inset 0 4px 0 rgba(255,255,255,0.35)"
    : "inset 0 4px 0 rgba(255,255,255,1)";
  const elevation = isDark
    ? "0 4px 12px rgba(0,0,0,0.2), 0 16px 40px rgba(0,0,0,0.15)"
    : "0 2px 4px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.06), 0 32px 64px rgba(0,0,0,0.05)";

  const shadow = isDark
    ? {
        s1: "0 20px 50px rgba(0,0,0,0.25)",
        s2: "0 12px 32px rgba(0,0,0,0.2)",
        s3: "0 6px 20px rgba(0,0,0,0.15)",
        glassInset: highlightTop,
        glassInsetStrong: highlightTopStrong,
        elevation,
      }
    : {
        s1: `0 2px 4px rgba(0,0,0,0.04), 0 12px 28px rgba(0,0,0,0.06), 0 40px 80px rgba(0,0,0,0.06)`,
        s2: "0 2px 4px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.05)",
        s3: "0 2px 8px rgba(0,0,0,0.04), 0 12px 28px rgba(0,0,0,0.05)",
        glassInset: highlightTop,
        glassInsetStrong: highlightTopStrong,
        elevation,
      };

  const r = { lg: 24, md: 18, sm: 14, pill: 999 } as const;

  const font = {
    ui: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"`,
    mono: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`,
  } as const;

  const pageBg = isDark
    ? `linear-gradient(165deg, ${ONDA_PALETTE.black} 0%, ${ONDA_PALETTE.darkGray} 50%, ${ONDA_PALETTE.black} 100%)`
    : "linear-gradient(165deg, #e2e2e2 0%, #d2d2d2 50%, #c4c4c4 100%)";

  const grad = {
    pageBg,
    header: isDark ? "rgba(51,51,51,0.8)" : "rgba(255,255,255,0.5)",
    userBubble: `linear-gradient(135deg, ${ONDA_PALETTE.gradientMid} 0%, ${ONDA_PALETTE.orange} 50%, ${ONDA_PALETTE.gradientLight} 100%)`,
    activeTab: isDark ? "rgba(251,80,2,0.18)" : "rgba(255,255,255,0.5)",
    badge: ONDA_PALETTE.orange,
    card: isDark ? "rgba(51,51,51,0.6)" : "rgba(255,255,255,0.5)",
    cardBorder: isDark ? "rgba(251,80,2,0.3)" : "rgba(255,255,255,0.9)",
  } as const;

  const blur = useFallback ? "none" : "blur(52px) saturate(220%)";
  /** Sin blur en ningún elemento para que los clics funcionen siempre en todos los navegadores. */
  const backdropNone = { backdropFilter: "none" as const, WebkitBackdropFilter: "none" as const };

  /** Reflejo suave arriba. */
  const glassOverlay = isDark
    ? "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 22%)"
    : "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 28%)";

  const fx = {
    /** Cristal: fondo muy transparente + reflejo arriba + borde brillante + elevación */
    glass: {
      background: `${glassOverlay}, ${glass.bg}`,
      ...backdropNone,
      border: `1px solid ${glass.border}`,
      boxShadow: `${shadow.glassInset}, ${shadow.elevation}`,
    } satisfies CSSProperties,
    glassSoft: {
      background: isDark ? (useFallback ? "rgba(30,30,30,0.95)" : "rgba(255,255,255,0.02)") : (useFallback ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.06)"),
      ...backdropNone,
      border: `1px solid ${glass.borderSoft}`,
      boxShadow: shadow.glassInset,
    } satisfies CSSProperties,
    crystal: {
      background: `${glassOverlay}, ${glass.bg}`,
      ...backdropNone,
      border: `1px solid ${glass.border}`,
      boxShadow: `${shadow.glassInsetStrong}, ${shadow.elevation}`,
    } satisfies CSSProperties,
    /** Placa estable bajo texto: algo más opaca para legibilidad, mismo reflejo. */
    plate: {
      background: `${glassOverlay}, ${glass.plate}`,
      ...backdropNone,
      border: `1px solid ${glass.border}`,
      boxShadow: `${shadow.glassInset}, ${shadow.elevation}`,
    } satisfies CSSProperties,
  } as const;

  return { mode, isDark, c, shadow, r, font, grad, fx, palette: ONDA_PALETTE, glass, blur, useFallback } as const;
}
