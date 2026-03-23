"use client";

import { EJE_CONFIGS, ORDERED_EJES } from "@/content/shared";
import { EjeOnda } from "@/content/types";
import type { OndaTheme } from "@/lib/ondaTheme";
import { ondaStyles } from "@/lib/ondaStyles";

interface EjeSelectorProps {
  currentEje: EjeOnda;
  onSelect: (eje: EjeOnda) => void;
  compact?: boolean;
  theme: OndaTheme;
}

export function EjeSelector({ currentEje, onSelect, compact, theme }: EjeSelectorProps) {
  const S = ondaStyles(theme);
  const t = theme;

  return (
    <div style={{ ...S.tabs, marginBottom: 6 }}>
      {ORDERED_EJES.map((eje) => {
        const isActive = currentEje === eje;
        const config = EJE_CONFIGS[eje];
        const shortName = config.name.split(" ").pop() ?? config.name;
        return (
          <button
            key={eje}
            type="button"
            onClick={() => onSelect(eje)}
            aria-current={isActive ? "true" : undefined}
            aria-label={`${config.name}. ${config.description}`}
            style={{
              ...S.tab(isActive),
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              textAlign: "center",
              minHeight: compact ? 52 : 56,
              ...(compact ? { padding: "8px 6px", fontSize: "0.9375rem" } : {}),
            }}
          >
            <span style={{ fontWeight: 700, lineHeight: 1.2 }}>{shortName}</span>
            <span
              style={{
                fontSize: compact ? "0.6875rem" : "0.75rem",
                fontWeight: 500,
                lineHeight: 1.25,
                color: isActive ? t.c.muted : t.c.muted,
                opacity: isActive ? 0.95 : 0.88,
                maxWidth: "100%",
              }}
            >
              {config.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
