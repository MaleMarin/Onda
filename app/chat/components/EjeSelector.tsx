"use client";

import { EJE_CONFIGS, ORDERED_EJES } from "@/content/shared";
import { EjeOnda } from "@/content/types";
import { getChatMicrocopy, getEjeCardSubtitle } from "@/lib/chatI18n";
import type { OndaChatLocale } from "@/lib/userPreferences";
import type { OndaTheme } from "@/lib/ondaTheme";
import { ondaStyles } from "@/lib/ondaStyles";

interface EjeSelectorProps {
  currentEje: EjeOnda;
  onSelect: (eje: EjeOnda) => void;
  compact?: boolean;
  theme: OndaTheme;
  /** Locale efectivo de producto (unificado + inferencia). */
  locale: OndaChatLocale;
}

export function EjeSelector({ currentEje, onSelect, compact, theme, locale }: EjeSelectorProps) {
  const S = ondaStyles(theme);
  const mc = getChatMicrocopy(locale);

  return (
    <div
      id="onda-eje-tablist"
      role="tablist"
      aria-label={mc.ejeTablistAria}
      style={{ ...S.tabs, marginBottom: 0, padding: 0, borderBottom: "none", background: "transparent", gap: 8 }}
    >
      {ORDERED_EJES.map((eje) => {
        const isActive = currentEje === eje;
        const config = EJE_CONFIGS[eje];
        const subtitle = getEjeCardSubtitle(locale, eje);
        const shortName = config.name.split(" ").pop() ?? config.name;
        return (
          <button
            key={eje}
            type="button"
            role="tab"
            id={`onda-tab-${eje}`}
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            aria-controls="onda-chat-main"
            onClick={() => onSelect(eje)}
            aria-label={`${config.name}. ${subtitle}`}
            style={{
              ...S.tab(isActive),
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              textAlign: "center",
              minHeight: 42,
              padding: "8px 12px",
              borderRadius: 12,
              fontSize: "0.875rem",
              boxShadow: isActive ? "inset 0 1px 4px rgba(30,36,45,0.1)" : "none",
            }}
          >
            <span style={{ fontWeight: 700, lineHeight: 1.2 }}>{shortName}</span>

          </button>
        );
      })}
    </div>
  );
}
