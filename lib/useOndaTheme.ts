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

export function useOndaTheme(): OndaTheme {
  const mode = usePrefersColorScheme();
  return useMemo(() => createOndaTheme(mode), [mode]);
}
