import type { CSSProperties } from "react";
import type { OndaTheme } from "./ondaTheme";

const EASE = "cubic-bezier(.2,.8,.2,1)";
const TR = `180ms ${EASE}`;

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
  const S = {
    page: {
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      padding: "28px 18px",
      fontFamily: t.font.ui,
      color: t.c.ink,
      background: t.grad.pageBg,
    } satisfies CSSProperties,

    shell: {
      ...t.fx.glass,
      width: "100%",
      maxWidth: 980,
      borderRadius: t.r.lg + 6,
      overflow: "hidden",
    } satisfies CSSProperties,

    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "18px 18px",
      background: t.grad.header,
      borderBottom: `1px solid ${t.c.border}`,
    } satisfies CSSProperties,

    titleWrap: { display: "flex", alignItems: "center", gap: 10 } satisfies CSSProperties,

    titleBadge: {
      width: 12,
      height: 12,
      borderRadius: 999,
      background: t.grad.badge,
      boxShadow: `0 0 0 5px ${t.isDark ? "rgba(43,99,255,.14)" : "rgba(43,99,255,.10)"}`,
    } satisfies CSSProperties,

    subtitle: { fontSize: 13, color: t.c.muted } satisfies CSSProperties,

    tabs: {
      display: "flex",
      gap: 10,
      padding: "12px 14px",
      borderBottom: `1px solid ${t.c.border}`,
      background: t.isDark ? "rgba(20,30,55,.35)" : "rgba(255,255,255,.35)",
    } satisfies CSSProperties,

    tab: (active: boolean): CSSProperties => ({
      flex: 1,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: "10px 12px",
      borderRadius: 999,
      border: `1px solid ${active ? "rgba(43,99,255,.28)" : "rgba(110,135,190,.18)"}`,
      color: active ? t.c.ink : t.c.muted,
      background: active
        ? `${t.grad.activeTab}, ${t.isDark ? "rgba(20,30,55,.46)" : "rgba(255,255,255,.75)"}`
        : t.isDark
          ? "rgba(20,30,55,.44)"
          : "rgba(255,255,255,.55)",
      boxShadow: active ? t.shadow.s2 : "none",
      cursor: "pointer",
      userSelect: "none",
      transition: `transform ${TR}, box-shadow ${TR}, border-color ${TR}, background ${TR}, color ${TR}`,
    }),

    chat: {
      display: "grid",
      gridTemplateRows: "1fr auto",
      height: "min(74vh, 760px)",
    } satisfies CSSProperties,

    messages: {
      padding: 18,
      overflow: "auto",
      scrollBehavior: "smooth",
    } satisfies CSSProperties,

    row: (isUser: boolean): CSSProperties => ({
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      gap: 10,
      alignItems: "flex-end",
      margin: "10px 0",
    }),

    avatar: {
      width: 34,
      height: 34,
      borderRadius: 999,
      background:
        `radial-gradient(circle at 30% 30%, rgba(255,255,255,.9), rgba(255,255,255,.2) 30%, transparent 65%),
         linear-gradient(135deg, rgba(43,99,255,.85), rgba(17,197,182,.75))`,
      boxShadow: "0 8px 18px rgba(43,99,255,.18)",
      flex: "0 0 auto",
    } satisfies CSSProperties,

    bubble: (isUser: boolean): CSSProperties => ({
      maxWidth: "min(72ch, 86%)",
      padding: "12px 14px",
      borderRadius: t.r.lg,
      lineHeight: 1.35,
      fontSize: 15,
      letterSpacing: ".1px",
      boxShadow: t.shadow.s3,
      border: isUser ? "0" : `1px solid ${t.c.border}`,
      color: isUser ? "#ffffff" : t.c.ink,
      background: isUser ? t.grad.userBubble : t.c.surface2,
      ...(isUser
        ? { borderTopRightRadius: 14 }
        : { borderTopLeftRadius: 14 }),
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
      background: t.isDark ? "rgba(20,30,55,.28)" : "rgba(255,255,255,.28)",
    } satisfies CSSProperties,

    chip: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "9px 12px",
      borderRadius: 999,
      border: "1px solid rgba(110,135,190,.22)",
      background: t.isDark ? "rgba(20,30,55,.55)" : "rgba(255,255,255,.65)",
      color: t.c.ink,
      fontSize: 13,
      cursor: "pointer",
      transition: `transform ${TR}, box-shadow ${TR}, border-color ${TR}, background ${TR}`,
    } satisfies CSSProperties,

    composer: {
      padding: 14,
      borderTop: `1px solid ${t.c.border}`,
      background: t.isDark ? "rgba(20,30,55,.35)" : "rgba(255,255,255,.35)",
    } satisfies CSSProperties,

    composerRow: {
      display: "grid",
      gridTemplateColumns: "auto 1fr auto",
      gap: 10,
      alignItems: "center",
    } satisfies CSSProperties,

    iconBtn: {
      width: 42,
      height: 42,
      borderRadius: 14,
      border: "1px solid rgba(110,135,190,.22)",
      background: t.isDark ? "rgba(20,30,55,.55)" : "rgba(255,255,255,.65)",
      boxShadow: t.shadow.s3,
      display: "grid",
      placeItems: "center",
      cursor: "pointer",
      transition: `transform ${TR}, box-shadow ${TR}, border-color ${TR}`,
    } satisfies CSSProperties,

    input: {
      height: 44,
      width: "100%",
      padding: "0 14px",
      borderRadius: 16,
      border: "1px solid rgba(110,135,190,.24)",
      background: t.isDark ? "rgba(20,30,55,.62)" : "rgba(255,255,255,.72)",
      color: t.c.ink,
      boxShadow: `inset 0 1px 0 ${t.isDark ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.55)"}`,
      transition: `border-color ${TR}, box-shadow ${TR}, background ${TR}`,
      outline: "none",
    } satisfies CSSProperties,

    inputFocusRing: {
      boxShadow: `0 0 0 5px ${t.c.ring}`,
      borderColor: "rgba(43,99,255,.42)",
    } satisfies CSSProperties,

    send: {
      height: 44,
      padding: "0 18px",
      borderRadius: 16,
      border: 0,
      color: "#fff",
      fontWeight: 700,
      letterSpacing: ".2px",
      cursor: "pointer",
      background:
        `radial-gradient(140px 70px at 20% 0%, rgba(255,255,255,.18), transparent 65%),
         linear-gradient(135deg, ${t.c.brand}, ${t.c.brand2})`,
      boxShadow: "0 14px 28px rgba(43,99,255,.22)",
      transition: `transform ${TR}, box-shadow ${TR}, filter ${TR}`,
    } satisfies CSSProperties,
  };

  const lift = {
    icon: liftHandlers(t.shadow.s3, t.shadow.s2),
    chip: liftHandlers("none", t.shadow.s3),
    menu: liftHandlers("none", t.shadow.s3),
    picker: liftHandlers("none", t.shadow.s2),
    send: liftHandlers(
      "0 14px 28px rgba(43,99,255,.22)",
      "0 18px 34px rgba(43,99,255,.26)"
    ),
    tab: (active: boolean): LiftBind =>
      liftHandlers(active ? t.shadow.s2 : "none", t.shadow.s2),
    tts: liftHandlers("none", t.shadow.s3),
  };

  return { ...S, lift };
}
