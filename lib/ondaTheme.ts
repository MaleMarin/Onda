import type { CSSProperties } from "react";

export type OndaMode = "light" | "dark";

export type OndaTheme = ReturnType<typeof createOndaTheme>;

/** Naranja del botón Enviar (neumórfico): desde env o naranja oscuro por defecto. Siempre sólido, 100% neumorphism. */
const DEFAULT_ORANGE = "#C43E00";
function getSendOrange(): string {
  if (typeof process === "undefined") return DEFAULT_ORANGE;
  const v = process.env.NEXT_PUBLIC_ONDA_ORANGE;
  return (v && /^#[0-9A-Fa-f]{6}$/.test(v)) ? v : DEFAULT_ORANGE;
}

/** Paleta Onda Bot + colores neumórficos de referencia (amarillo, rojo, teal, púrpura, azul oscuro). */
function getOndaPalette() {
  return {
    orange: getSendOrange(),
    black: "#000000",
    white: "#FFFFFF",
    gray: "#646464",
    lightGray: "#A7A7A7",
    darkGray: "#333333",
    gradientStart: "#000000",
    gradientMid: "#FC3D01",
    gradientBright: "#FF8001",
    gradientLight: "#F08C5A",
  } as const;
}

/** Colores un poco más oscuros: verde/teal más oscuro, resto más saturado y profundo. */
export const NEU_COLORS = {
  yellow: "#D4B82A",
  red: "#C93C30",
  teal: "#1A8F72",
  purple: "#6B3D7A",
  darkBlue: "#152A45",
} as const;

/** Neumorphism 100%. Fondo gris claro; no oscurecer la página. */
const NEU_LIGHT = {
  bg: "#d2d6dc",
  surface: "#e0e5ec",
  shadowDark: "rgba(100, 105, 115, 0.8)",
  shadowLight: "rgba(255, 255, 255, 0.99)",
  insetDark: "rgba(100, 105, 115, 0.75)",
  insetLight: "rgba(255, 255, 255, 0.9)",
  border: "rgba(0,0,0,0.12)",
  borderSoft: "rgba(0,0,0,0.08)",
} as const;

const NEU_DARK = {
  bg: "#2d2d2d",
  surface: "#363636",
  shadowDark: "rgba(0, 0, 0, 0.4)",
  shadowLight: "rgba(255, 255, 255, 0.03)",
  insetDark: "rgba(0, 0, 0, 0.5)",
  insetLight: "rgba(255, 255, 255, 0.04)",
  border: "rgba(255,255,255,0.06)",
  borderSoft: "rgba(255,255,255,0.04)",
} as const;

export type OndaThemeOptions = { useFallback?: boolean };

export function createOndaTheme(mode: OndaMode, options?: OndaThemeOptions) {
  const isDark = mode === "dark";
  const neu = isDark ? NEU_DARK : NEU_LIGHT;
  const palette = getOndaPalette();

  const c = {
    bg0: neu.bg,
    bg1: neu.surface,
    surface: neu.surface,
    surface2: neu.surface,
    border: neu.border,
    borderSoft: neu.borderSoft,
    ink: isDark ? "#f0f0f0" : "#2d2d2d",
    muted: isDark ? "#a0a0a0" : palette.gray,
    muted2: isDark ? "#888" : palette.lightGray,
    brand: palette.orange,
    naranja: palette.orange,
    orange: palette.orange,
    black: palette.black,
    white: palette.white,
    gray: palette.gray,
    lightGray: palette.lightGray,
    darkGray: palette.darkGray,
    ring: "rgba(201, 60, 48, 0.5)",
    focus: "rgba(201, 60, 48, 0.35)",
    danger: "#ea3546",
    warnBg: "rgba(234, 53, 70, 0.1)",
    warnBorder: "rgba(234, 53, 70, 0.3)",
    warnText: "#c41e3a",
  } as const;

  /** Neumorphism muy marcado: botones, áreas, bordes con relieve claro. */
  const neuRaised = isDark
    ? `14px 14px 28px ${neu.shadowDark}, -14px -14px 28px ${neu.shadowLight}`
    : `14px 14px 28px ${neu.shadowDark}, -14px -14px 28px ${neu.shadowLight}`;
  const neuRaisedStrong = isDark
    ? `18px 18px 36px ${neu.shadowDark}, -18px -18px 36px ${neu.shadowLight}`
    : `18px 18px 36px ${neu.shadowDark}, -18px -18px 36px ${neu.shadowLight}`;
  const neuRaisedExtra = isDark
    ? `22px 22px 44px ${neu.shadowDark}, -22px -22px 44px ${neu.shadowLight}`
    : `22px 22px 44px ${neu.shadowDark}, -22px -22px 44px ${neu.shadowLight}`;
  /** Hundido profundo (input, área contenido). */
  const neuInset = isDark
    ? `inset 12px 12px 24px ${neu.insetDark}, inset -12px -12px 24px ${neu.insetLight}`
    : `inset 12px 12px 24px ${neu.insetDark}, inset -12px -12px 24px ${neu.insetLight}`;
  const neuInsetSoft = isDark
    ? `inset 8px 8px 16px ${neu.insetDark}, inset -8px -8px 16px ${neu.insetLight}`
    : `inset 8px 8px 16px ${neu.insetDark}, inset -8px -8px 16px ${neu.insetLight}`;

  const hexToRgba = (hex: string, a: number) => {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  };
  /** Botones Onda: triple sombra = relieve + highlight interior (convexo neumórfico). */
  const neuRaisedColored = (hex: string) =>
    `14px 14px 28px ${hexToRgba(hex, 0.6)}, -14px -14px 28px rgba(255,255,255,0.94), inset 3px 3px 6px rgba(255,255,255,0.35)`;
  const neuRaisedColoredHover = (hex: string) =>
    `18px 18px 36px ${hexToRgba(hex, 0.65)}, -18px -18px 36px rgba(255,255,255,0.98), inset 3px 3px 6px rgba(255,255,255,0.4)`;
  /** Sólido 100%: solo sombra exterior (sin inset), color plano neumórfico. */
  const neuRaisedColoredSolid = (hex: string) =>
    `14px 14px 28px ${hexToRgba(hex, 0.5)}, -14px -14px 28px rgba(255,255,255,0.9)`;
  const neuRaisedColoredSolidHover = (hex: string) =>
    `18px 18px 36px ${hexToRgba(hex, 0.55)}, -18px -18px 36px rgba(255,255,255,0.95)`;
  /** Estado pulsado (botón Onda): hundido. */
  const neuPressedColored = (hex: string) =>
    `inset 8px 8px 16px ${hexToRgba(hex, 0.5)}, inset -8px -8px 16px rgba(0,0,0,0.15)`;

  const shadow = {
    s1: neuRaisedStrong,
    s2: neuRaised,
    s3: isDark ? `4px 4px 8px ${neu.shadowDark}, -4px -4px 8px ${neu.shadowLight}` : `4px 4px 8px ${neu.shadowDark}, -4px -4px 8px ${neu.shadowLight}`,
    glassInset: neuInsetSoft,
    glassInsetStrong: neuInset,
    spectralEdge: "none",
    elevation: neuRaised,
    neuRaised,
    neuRaisedStrong,
    neuRaisedExtra,
    neuInset,
    neuInsetSoft,
    neuRaisedColored,
    neuRaisedColoredHover,
    neuRaisedColoredSolid,
    neuRaisedColoredSolidHover,
    neuPressedColored,
  } as const;

  const r = { lg: 24, md: 18, sm: 14, pill: 999 } as const;

  const font = {
    ui: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"`,
    mono: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`,
  } as const;

  const pageBg = neu.bg;

  const grad = {
    pageBg,
    header: neu.surface,
    userBubble: NEU_COLORS.red,
    activeTab: neu.surface,
    badge: palette.orange,
    card: neu.surface,
    cardBorder: neu.border,
  } as const;

  const glass = {
    bg: neu.surface,
    border: neu.border,
    borderSoft: neu.borderSoft,
    plate: neu.surface,
  } as const;

  const fx = {
    /** Panel/card elevado (neumorphism). */
    glass: {
      background: neu.surface,
      border: `1px solid ${neu.border}`,
      boxShadow: neuRaised,
    } satisfies CSSProperties,
    glassSoft: {
      background: neu.surface,
      border: `1px solid ${neu.borderSoft}`,
      boxShadow: neuRaised,
    } satisfies CSSProperties,
    /** Botón/card elevado más marcado. */
    crystal: {
      background: neu.surface,
      border: `1px solid ${neu.border}`,
      boxShadow: neuRaisedStrong,
    } satisfies CSSProperties,
    /** Input/campo hundido. */
    plate: {
      background: neu.surface,
      border: `1px solid ${neu.border}`,
      boxShadow: neuInsetSoft,
    } satisfies CSSProperties,
    /** Hundido (pressed state). */
    pressed: {
      background: neu.surface,
      border: `1px solid ${neu.border}`,
      boxShadow: neuInset,
    } satisfies CSSProperties,
  } as const;

  return {
    mode,
    isDark,
    c,
    shadow,
    r,
    font,
    grad,
    fx,
    palette,
    neuColors: NEU_COLORS,
    glass,
    blur: "none",
    useFallback: false,
    neu,
  } as const;
}
