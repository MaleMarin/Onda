"use client";

import { useEffect, useMemo, useState } from "react";
import { createOndaTheme, type OndaMode, type OndaTheme } from "./ondaTheme";

export function usePrefersColorScheme(): OndaMode {
  const [mode, setMode] = useState<OndaMode>("light");

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;

    const apply = () => setMode(mq.matches ? "dark" : "light");
    apply();

    const handler = () => apply();
    mq.addEventListener?.("change", handler);
    mq.addListener?.(handler);

    return () => {
      mq.removeEventListener?.("change", handler);
      mq.removeListener?.(handler);
    };
  }, []);

  return mode;
}

/** Detects if the environment supports backdrop-filter (liquid glass blur). */
export function useSupportsBackdropFilter(): boolean {
  const [supports, setSupports] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined" || typeof CSS === "undefined" || !CSS.supports) {
      setSupports(true);
      return;
    }
    setSupports(CSS.supports("backdrop-filter", "blur(1px)") || CSS.supports("-webkit-backdrop-filter", "blur(1px)"));
  }, []);

  return supports;
}

/** Si pasas true, el chat usa siempre tema claro (liquid glass). Sin fallback por defecto para evitar re-renders que rompan interactividad. */
export function useOndaTheme(forceLight?: boolean): OndaTheme {
  const systemMode = usePrefersColorScheme();
  const mode = forceLight ? "light" : systemMode;
  return useMemo(() => createOndaTheme(mode), [mode]);
}
