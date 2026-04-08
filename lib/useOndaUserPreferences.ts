"use client";

import { useCallback, useEffect, useState } from "react";
import type { OndaUserPreferences } from "./userPreferences";
import {
  DEFAULT_ONDA_USER_PREFERENCES,
  loadOndaUserPreferencesFromStorage,
  saveOndaUserPreferencesToStorage,
} from "./userPreferences";

export function useOndaUserPreferences(): {
  prefs: OndaUserPreferences;
  setPrefs: (p: OndaUserPreferences | ((prev: OndaUserPreferences) => OndaUserPreferences)) => void;
  hydrated: boolean;
} {
  const [prefs, setPrefsState] = useState<OndaUserPreferences>(() => ({
    ...DEFAULT_ONDA_USER_PREFERENCES,
  }));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPrefsState(loadOndaUserPreferencesFromStorage());
    setHydrated(true);
  }, []);

  const setPrefs = useCallback(
    (p: OndaUserPreferences | ((prev: OndaUserPreferences) => OndaUserPreferences)) => {
      setPrefsState((prev) => {
        const next = typeof p === "function" ? (p as (x: OndaUserPreferences) => OndaUserPreferences)(prev) : p;
        saveOndaUserPreferencesToStorage(next);
        return next;
      });
    },
    []
  );

  return { prefs, setPrefs, hydrated };
}
