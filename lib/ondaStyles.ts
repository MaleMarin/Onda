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
  const neuRaised = t.shadow.neuRaised;
  const neuRaisedStrong = t.shadow.neuRaisedStrong;
  const neuInset = t.shadow.neuInset;
  const neuInsetSoft = t.shadow.neuInsetSoft;
  const glassBorder = t.glass.border;
  const glassBorderSoft = t.glass.borderSoft;

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

    /** Panel principal: tarjeta blanca/clara sobre fondo gris (como diseño de referencia). */
    shell: {
      ...t.fx.crystal,
      background: "#ffffff",
      width: "100%",
      maxWidth: "min(720px, 92vw)",
      flex: 1,
      minHeight: 0,
      borderRadius: 28,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      border: "none",
      boxShadow: t.shadow.neuRaisedExtra,
      transition: "box-shadow 0.18s ease, transform 0.18s ease",
      position: "relative",
      zIndex: 1,
      pointerEvents: "auto",
    } satisfies CSSProperties,

    /** Tarjetas / botones Onda: relieve neumórfico muy marcado. */
    glassCard: {
      ...t.fx.glass,
      borderRadius: 22,
      boxShadow: neuRaisedStrong,
    } satisfies CSSProperties,

    /** Parte superior: misma tarjeta blanca, borde sutil. */
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "20px 24px",
      background: "#ffffff",
      border: "none",
      borderBottom: `1px solid ${glassBorderSoft}`,
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      flexShrink: 0,
      transition: "background 0.2s ease, box-shadow 0.2s ease",
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
      borderBottom: `1px solid ${t.glass.borderSoft}`,
      ...t.fx.glassSoft,
    } satisfies CSSProperties,

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
      background: t.glass.bg,
      boxShadow: active ? neuInsetSoft : neuRaised,
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

    /** Área de contenido: fondo claro como la tarjeta (igual que diseño de referencia). */
    messages: {
      flex: 1,
      padding: 24,
      overflow: "auto",
      scrollBehavior: "smooth",
      background: "#f8f9fa",
      boxShadow: "none",
      margin: 16,
      borderRadius: 24,
      border: "none",
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
      boxShadow: t.shadow.s3,
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
            ...t.fx.glass,
            boxShadow: neuRaisedStrong,
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
      borderTop: `1px solid ${t.glass.borderSoft}`,
      ...t.fx.glassSoft,
      pointerEvents: "auto",
    } satisfies CSSProperties,

    chip: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "10px 16px",
      borderRadius: 16,
      border: `2px solid ${glassBorder}`,
      background: t.glass.bg,
      color: t.c.ink,
      fontSize: "1rem",
      cursor: "pointer",
      boxShadow: neuRaisedStrong,
      transition: "transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease",
    } satisfies CSSProperties,

    /** Píldoras de intuición: elementos extruidos del fondo (luz arriba-izquierda, sombra abajo-derecha). */
    pildoraIntuicion: {
      display: "inline-flex",
      alignItems: "center",
      padding: "10px 16px",
      borderRadius: 18,
      border: `1px solid ${glassBorderSoft}`,
      background: t.glass.bg,
      color: t.c.ink,
      fontSize: "0.9375rem",
      fontWeight: 600,
      cursor: "pointer",
      boxShadow: t.shadow.extruded,
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
    } satisfies CSSProperties,

    /** Área inferior (composer): neumorphism, sin franja gris debajo del input. */
    composer: {
      background: "#ffffff",
      padding: "22px 24px 12px",
      border: "none",
      borderTop: `1px solid ${glassBorderSoft}`,
      borderRadius: "24px 24px 0 0",
      boxShadow: "0 -2px 12px rgba(0,0,0,0.04)",
      flexShrink: 0,
      transition: "background 0.2s ease, box-shadow 0.2s ease",
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
      borderRadius: 16,
      ...t.fx.crystal,
      boxShadow: neuRaisedStrong,
      display: "grid",
      placeItems: "center",
      cursor: "pointer",
      transition: "transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease",
    } satisfies CSSProperties,

    /** Input: muy hundido (neumorphism profundo). */
    input: {
      height: 46,
      width: "100%",
      padding: "0 20px",
      borderRadius: 16,
      border: `2px solid ${t.glass.borderSoft}`,
      background: t.glass.bg,
      color: t.c.ink,
      fontSize: "1.0625rem",
      boxShadow: neuInset,
      transition: "border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease",
      outline: "none",
    } satisfies CSSProperties,

    inputFocusRing: {
      boxShadow: `${neuInsetSoft}, 0 0 0 3px ${t.c.ring}`,
      borderColor: t.neuColors.red,
    } satisfies CSSProperties,

    /** Enviar: naranja sólido (NEXT_PUBLIC_ONDA_ORANGE o #FB5002), 100% neumorphism. */
    send: {
      height: 46,
      padding: "0 24px",
      borderRadius: 16,
      border: "none",
      color: "#fff",
      fontSize: "1.0625rem",
      fontWeight: 700,
      letterSpacing: ".04em",
      cursor: "pointer",
      touchAction: "manipulation",
      background: t.c.orange,
      boxShadow: t.shadow.neuRaisedColoredSolid(t.c.orange),
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
    } satisfies CSSProperties,
  };

  const pickerBaseShadow = neuRaised;
  const pickerHoverShadow = neuRaisedStrong;
  const pickerPressedShadow = neuInset;

  const lift = {
    icon: liftHandlers(t.shadow.s3, neuRaisedStrong),
    chip: liftHandlers(neuRaised, neuRaisedStrong),
    menu: liftHandlers(neuRaised, neuRaisedStrong),
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
    /** Solo hover (sin onMouseDown/onMouseUp) para no perder el click al mover el botón. */
    send: {
      onMouseEnter: (e: Ev) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = t.shadow.neuRaisedColoredSolidHover(t.c.orange);
      },
      onMouseLeave: (e: Ev) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = t.shadow.neuRaisedColoredSolid(t.c.orange);
      },
    },
    tab: (active: boolean): LiftBind =>
      liftHandlers(active ? neuInsetSoft : neuRaised, neuRaisedStrong),
    tts: liftHandlers(neuRaised, neuRaisedStrong),
    /** Píldoras de intuición: hover extruido (más relieve). */
    pildora: liftHandlers(t.shadow.extruded, t.shadow.extrudedHover),
  };

  return { ...S, lift };
}
