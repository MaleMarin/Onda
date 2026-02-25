import type { CSSProperties } from "react";

export type OndaMode = "light" | "dark";

export type OndaTheme = ReturnType<typeof createOndaTheme>;

export function createOndaTheme(mode: OndaMode) {
  const isDark = mode === "dark";

  const c = {
    bg0: isDark ? "#0b1222" : "#f7f9ff",
    bg1: isDark ? "#0e1730" : "#eef3ff",

    surface: isDark ? "rgba(20, 30, 55, .70)" : "rgba(255,255,255,.84)",
    surface2: isDark ? "rgba(20, 30, 55, .86)" : "rgba(255,255,255,.92)",
    border: isDark ? "rgba(100,130,200,.16)" : "rgba(90,120,170,.18)",

    ink: isDark ? "#e9f0ff" : "#22314a",
    muted: isDark ? "#b6c3dd" : "#60708a",
    muted2: isDark ? "#91a3c6" : "#7f8ea8",

    brand: "#2b63ff",
    brand2: "#5a3dff",
    accent: "#11c5b6",
    pink: "#ff4d8d",

    ring: isDark ? "rgba(43,99,255,.22)" : "rgba(43,99,255,.16)",
    focus: "rgba(43,99,255,.35)",

    danger: "#ef4444",
    warnBg: isDark ? "rgba(43,99,255,.10)" : "rgba(43,99,255,.07)",
    warnBorder: isDark ? "rgba(43,99,255,.24)" : "rgba(43,99,255,.18)",
    warnText: isDark ? "#a8c4ff" : "#2b4a8a",
  } as const;

  const shadow = {
    s1: isDark ? "0 14px 40px rgba(0,0,0,.40)" : "0 10px 30px rgba(30, 60, 120, .10)",
    s2: isDark ? "0 10px 24px rgba(0,0,0,.38)" : "0 6px 18px rgba(30, 60, 120, .12)",
    s3: isDark ? "0 4px 12px rgba(0,0,0,.28)" : "0 2px 8px rgba(30, 60, 120, .10)",
  } as const;

  const r = { lg: 22, md: 16, sm: 12 } as const;

  const font = {
    ui: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"`,
    mono: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`,
  } as const;

  const grad = {
    pageBg: [
      `radial-gradient(900px 600px at 15% 0%, rgba(43,99,255,.14), transparent 60%)`,
      `radial-gradient(700px 520px at 85% 15%, rgba(17,197,182,.12), transparent 60%)`,
      `radial-gradient(780px 620px at 50% 110%, rgba(90,61,255,.08), transparent 60%)`,
      `linear-gradient(180deg, ${c.bg0}, ${c.bg1})`,
    ].join(", "),
    header: `linear-gradient(90deg, rgba(43,99,255,.10), rgba(90,61,255,.08), rgba(17,197,182,.08))`,
    userBubble: `radial-gradient(160px 80px at 20% 0%, rgba(255,255,255,.18), transparent 60%), linear-gradient(135deg, ${c.brand}, ${c.brand2})`,
    activeTab: [
      `radial-gradient(120px 60px at 20% 0%, rgba(43,99,255,.18), transparent 70%)`,
      `radial-gradient(120px 60px at 80% 0%, rgba(17,197,182,.14), transparent 70%)`,
    ].join(", "),
    badge: `linear-gradient(135deg, ${c.brand}, ${c.brand2})`,
  } as const;

  const fx = {
    glass: {
      background: c.surface,
      backdropFilter: "blur(14px)",
      WebkitBackdropFilter: "blur(14px)",
      border: `1px solid ${c.border}`,
      boxShadow: shadow.s1,
    } satisfies CSSProperties,
  } as const;

  return { mode, isDark, c, shadow, r, font, grad, fx } as const;
}
