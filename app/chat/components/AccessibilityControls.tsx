"use client";

import { useCallback, useEffect, useId, useState, type CSSProperties } from "react";
import type { OndaTheme } from "@/lib/ondaTheme";

const STORAGE_REDUCED_MOTION = "onda_a11y_reduced_motion";
const STORAGE_LARGE_TEXT = "onda_a11y_large_text";

function readBool(key: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(key) === "1";
}

function applyReducedMotion(on: boolean): void {
  document.documentElement.classList.toggle("onda-a11y-reduced-motion", on);
}

function applyLargeText(on: boolean): void {
  document.documentElement.classList.toggle("onda-a11y-large-text", on);
}

type Props = {
  theme: OndaTheme;
  compact?: boolean;
};

/**
 * Preferencias de accesibilidad persistidas en localStorage (animaciones / tamaño de texto).
 */
export function AccessibilityControls({ theme, compact }: Props) {
  const t = theme;
  const [open, setOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const panelId = useId();
  const rmId = useId();
  const ltId = useId();

  useEffect(() => {
    const rm = readBool(STORAGE_REDUCED_MOTION);
    const lt = readBool(STORAGE_LARGE_TEXT);
    setReducedMotion(rm);
    setLargeText(lt);
    applyReducedMotion(rm);
    applyLargeText(lt);
  }, []);

  const persistRm = useCallback((on: boolean) => {
    setReducedMotion(on);
    try {
      localStorage.setItem(STORAGE_REDUCED_MOTION, on ? "1" : "0");
    } catch {
      /* ignore quota */
    }
    applyReducedMotion(on);
  }, []);

  const persistLt = useCallback((on: boolean) => {
    setLargeText(on);
    try {
      localStorage.setItem(STORAGE_LARGE_TEXT, on ? "1" : "0");
    } catch {
      /* ignore */
    }
    applyLargeText(on);
  }, []);

  const btnStyle: CSSProperties = {
    fontSize: compact ? "0.75rem" : "0.8125rem",
    color: t.c.muted,
    background: t.c.surface,
    border: `1px solid ${t.c.border}`,
    cursor: "pointer",
    padding: "6px 10px",
    borderRadius: t.r.sm,
    fontWeight: 600,
  };

  const panelStyle: CSSProperties = {
    padding: "10px 12px",
    borderRadius: t.r.md,
    border: `1px solid ${t.c.border}`,
    background: t.isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
    fontSize: compact ? "0.8125rem" : "0.875rem",
    maxWidth: 280,
  };

  const rowStyle: CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 8,
  };

  return (
    <div style={{ position: "relative", zIndex: 12 }}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        style={btnStyle}
      >
        Accesibilidad
      </button>
      {open && (
        <div
          id={panelId}
          role="region"
          aria-label="Opciones de accesibilidad"
          style={{
            ...panelStyle,
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 6,
            zIndex: 30,
            boxShadow: t.shadow?.neuRaised ?? "0 4px 16px rgba(0,0,0,0.12)",
          }}
        >
          <div style={{ fontWeight: 700, color: t.c.ink, marginBottom: 4 }}>Preferencias</div>
          <div style={rowStyle}>
            <input
              id={rmId}
              type="checkbox"
              checked={reducedMotion}
              onChange={(e) => persistRm(e.target.checked)}
            />
            <label htmlFor={rmId} style={{ cursor: "pointer", lineHeight: 1.4 }}>
              Reducir animaciones
            </label>
          </div>
          <div style={rowStyle}>
            <input
              id={ltId}
              type="checkbox"
              checked={largeText}
              onChange={(e) => persistLt(e.target.checked)}
            />
            <label htmlFor={ltId} style={{ cursor: "pointer", lineHeight: 1.4 }}>
              Texto más grande en el chat
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
