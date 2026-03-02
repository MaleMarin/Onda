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
            style={{
              ...S.tab(isActive),
              ...(compact ? { padding: "8px 6px", fontSize: "0.7rem" } : {}),
            }}
          >
            <span>{shortName}</span>
          </button>
        );
      })}
    </div>
  );
}
