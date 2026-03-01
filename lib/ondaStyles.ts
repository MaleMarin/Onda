import type { CSSProperties } from "react";
import type { OndaTheme } from "./ondaTheme";

const EASE = "cubic-bezier(.25,.75,.2,1)";
const TR = "180ms ease";

type Ev = { currentTarget: HTMLElement };
type LiftBind = { onMouseEnter: (e: Ev) => void; onMouseLeave: (e: Ev) => void };

function liftHandlers(baseShadow: string, hoverShadow: string): LiftBind {
  return {
    onMouseEnter: (e) => {
      e.currentTarget.style.transform = "translateY(-1px)";
      e.currentTarget.style.boxShadow = hoverShadow;
    },
    onMouseLeave: (e) => {
      e.currentTarget.style.transform = "";
      e.currentTarget.style.boxShadow = baseShadow;
    },
  };
}

export function ondaStyles(t: OndaTheme) {
  const glassBg = t.glass.bg;
  const glassBorder = t.glass.border;
  const glassBorderSoft = t.glass.borderSoft;
  const crystal = t.fx.crystal;
  const insetStrong = t.shadow.glassInsetStrong;
  const insetSoft = t.shadow.glassInset;

  const S = {
    page: {
      height: "100dvh",
      minHeight: "100vh",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      padding: "24px 20px 24px 20px",
      fontFamily: t.font.ui,
      color: t.c.ink,
      background: t.grad.pageBg,
      transition: "background 0.3s ease",
      position: "relative",
    } satisfies CSSProperties,

    /** Panel principal: bloque de vidrio flotando, sombra profunda = 1000% cristal. */
    shell: {
      ...crystal,
      width: "100%",
      maxWidth: "min(720px, 92vw)",
      flex: 1,
      minHeight: 0,
      borderRadius: 40,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      boxShadow: `${t.shadow.glassInsetStrong}, ${t.shadow.elevation}, 0 56px 100px rgba(0,0,0,0.1), 0 24px 48px rgba(0,0,0,0.06)`,
      transition: "box-shadow 0.18s ease, transform 0.18s ease",
      position: "relative",
      zIndex: 1,
      pointerEvents: "auto",
    } satisfies CSSProperties,

    /** Tarjetas información: border-radius 24px, degradado cian → azul profundo (Slim) */
    glassCard: {
      ...t.fx.glass,
      borderRadius: 24,
      boxShadow: `${insetSoft}, ${t.shadow.elevation}`,
    } satisfies CSSProperties,

    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "20px 24px",
      ...t.fx.glass,
      borderBottom: `1px solid ${glassBorderSoft}`,
      boxShadow: insetSoft,
      flexShrink: 0,
      transition: "background 0.2s ease, border-color 0.2s ease",
      pointerEvents: "auto",
    } satisfies CSSProperties,

    titleWrap: { display: "flex", alignItems: "center", gap: 10 } satisfies CSSProperties,

    titleBadge: {
      width: 12,
      height: 12,
      borderRadius: 999,
      background: t.grad.badge,
      boxShadow: `0 0 0 4px ${t.c.orange}30`,
    } satisfies CSSProperties,

    subtitle: { fontSize: 13, color: t.c.muted } satisfies CSSProperties,

    tabs: {
      display: "flex",
      gap: 10,
      padding: "12px 14px",
      borderBottom: `1px solid ${t.c.border}`,
      ...t.fx.glassSoft,
    } satisfies CSSProperties,

    /** Tab: edge cue (highlight) on both active and inactive so surface always reads as glass. */
    tab: (active: boolean): CSSProperties => ({
      flex: 1,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: "10px 14px",
      borderRadius: 14,
      border: `1px solid ${glassBorder}`,
      color: active ? t.c.ink : t.c.muted,
      background: active ? t.grad.activeTab : glassBg,
      boxShadow: active ? `${insetStrong}, 0 4px 12px rgba(0,0,0,0.06)` : `${insetSoft}, 0 1px 3px rgba(0,0,0,0.03)`,
      cursor: "pointer",
      userSelect: "none",
      transition: `transform ${TR}, box-shadow ${TR}, border-color ${TR}, background ${TR}, color ${TR}`,
    }),

    chat: {
      display: "flex",
      flexDirection: "column",
      flex: 1,
      minHeight: 0,
      pointerEvents: "auto",
    } satisfies CSSProperties,

    /** Área de mensajes: tinte mínimo, sin blur, para que botones y clics funcionen siempre. */
    messages: {
      flex: 1,
      padding: 24,
      overflow: "auto",
      scrollBehavior: "smooth",
      background: t.isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.03)",
      pointerEvents: "auto",
    } satisfies CSSProperties,

    row: (isUser: boolean): CSSProperties => ({
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      gap: 10,
      alignItems: "flex-end",
      margin: "6px 0",
    }),

    avatar: {
      width: 34,
      height: 34,
      borderRadius: 999,
      background: `linear-gradient(135deg, rgba(251,80,2,0.9) 0%, ${t.c.orange} 100%)`,
      border: `1px solid rgba(255,255,255,0.5)`,
      boxShadow: `${insetSoft}, 0 8px 20px ${t.c.orange}40`,
      flex: "0 0 auto",
    } satisfies CSSProperties,

    bubble: (isUser: boolean): CSSProperties => ({
      maxWidth: "min(72ch, 86%)",
      padding: "12px 14px",
      borderRadius: 22,
      lineHeight: 1.45,
      fontSize: 15,
      letterSpacing: ".02em",
      ...(isUser
        ? {}
        : {
            ...t.fx.plate,
            boxShadow: `${insetSoft}, 0 2px 4px rgba(0,0,0,0.04), 0 12px 28px rgba(0,0,0,0.06)`,
          }),
      boxShadow: isUser ? t.shadow.s3 : undefined,
      border: isUser ? "0" : `1px solid ${glassBorder}`,
      color: isUser ? "#fff" : t.c.ink,
      ...(isUser ? { background: t.grad.userBubble } : {}),
      ...(isUser ? { borderTopRightRadius: 22 } : { borderRadius: "0 22px 22px 22px" }),
      transition: "box-shadow 0.18s ease, background 0.18s ease",
    }),

    meta: {
      fontSize: 12,
      color: t.c.muted2,
      marginTop: 6,
      padding: "0 6px",
    } satisfies CSSProperties,

    chipsWrap: {
      display: "flex",
      flexWrap: "wrap",
      gap: 10,
      padding: "10px 14px 14px",
      borderTop: `1px solid ${t.c.border}`,
      ...t.fx.glassSoft,
      pointerEvents: "auto",
    } satisfies CSSProperties,

    chip: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "10px 16px",
      borderRadius: 14,
      border: `1px solid ${glassBorder}`,
      background: glassBg,
      color: t.c.ink,
      fontSize: 13,
      cursor: "pointer",
      boxShadow: `${insetSoft}, ${t.shadow.elevation}`,
      transition: "transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease",
    } satisfies CSSProperties,

    composer: {
      ...t.fx.glass,
      padding: "20px 24px 24px",
      borderTop: `1px solid ${glassBorderSoft}`,
      boxShadow: insetSoft,
      flexShrink: 0,
      transition: "background 0.2s ease",
      pointerEvents: "auto",
    } satisfies CSSProperties,

    composerRow: {
      display: "grid",
      gridTemplateColumns: "auto 1fr auto",
      gap: 10,
      alignItems: "center",
    } satisfies CSSProperties,

    iconBtn: {
      width: 44,
      height: 44,
      borderRadius: 14,
      ...crystal,
      display: "grid",
      placeItems: "center",
      cursor: "pointer",
      transition: "transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease",
    } satisfies CSSProperties,

    input: {
      height: 46,
      width: "100%",
      padding: "0 20px",
      borderRadius: 14,
      border: `1px solid ${glassBorder}`,
      background: t.glass.plate,
      color: t.c.ink,
      boxShadow: `${insetSoft}, 0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.05)`,
      transition: "border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease",
      outline: "none",
    } satisfies CSSProperties,

    /** Focus: crisp ring above the stack, independent of background (state stress). */
    inputFocusRing: {
      boxShadow: `0 0 0 4px ${t.c.ring}`,
      borderColor: t.c.orange,
    } satisfies CSSProperties,

    /** Enviar: gradiente naranja + borde/highlight tipo vidrio para coherencia 100% vidrio. */
    send: {
      height: 46,
      padding: "0 24px",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.65)",
      color: "#fff",
      fontWeight: 600,
      letterSpacing: ".03em",
      cursor: "pointer",
      background: `linear-gradient(180deg, ${t.palette.gradientBright} 0%, ${t.c.naranja} 50%, ${t.palette.gradientMid} 100%)`,
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.4), inset 0 0 0 1px rgba(255,255,255,0.15), 0 2px 8px rgba(251,80,2,0.2), 0 12px 28px rgba(251,80,2,0.35)`,
      transition: "transform 0.18s ease, box-shadow 0.18s ease",
    } satisfies CSSProperties,
  };

  const pickerBaseShadow = `${insetSoft}, 0 2px 8px rgba(0,0,0,0.04), 0 16px 40px rgba(0,0,0,0.06)`;
  const pickerHoverShadow = `${insetStrong}, 0 4px 12px rgba(0,0,0,0.05), 0 20px 44px rgba(0,0,0,0.07)`;

  const lift = {
    icon: liftHandlers(t.shadow.s3, t.shadow.s2),
    chip: liftHandlers("none", t.shadow.s3),
    menu: liftHandlers("none", t.shadow.s3),
    picker: {
      onMouseEnter: (e: Ev) => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = pickerHoverShadow;
      },
      onMouseLeave: (e: Ev) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = pickerBaseShadow;
      },
    },
    send: {
      onMouseEnter: (e: Ev) => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.35), 0 4px 12px rgba(251,80,2,0.25), 0 16px 36px rgba(251,80,2,0.4)";
      },
      onMouseLeave: (e: Ev) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 8px rgba(251,80,2,0.2), 0 12px 28px rgba(251,80,2,0.35)";
      },
    },
    tab: (active: boolean): LiftBind =>
      liftHandlers(
        active ? t.shadow.s2 : `${insetSoft}, 0 1px 3px rgba(0,0,0,0.03)`,
        t.shadow.s2
      ),
    tts: liftHandlers("none", t.shadow.s3),
  };

  return { ...S, lift };
}
