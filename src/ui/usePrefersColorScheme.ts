// src/ui/usePrefersColorScheme.ts
"use client";

import { useEffect, useState } from "react";

export function usePrefersColorScheme(): "light" | "dark" {
  const [mode, setMode] = useState<"light" | "dark">("light");

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
