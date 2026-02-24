"use client";

import { EJE_CONFIGS, ORDERED_EJES } from "@/content/shared";
import { EjeOnda } from "@/content/types";

interface EjeSelectorProps {
  currentEje: EjeOnda;
  onSelect: (eje: EjeOnda) => void;
  compact?: boolean;
}

export function EjeSelector({ currentEje, onSelect, compact }: EjeSelectorProps) {
  return (
    <div
      style={{
        display: "flex",
        background: "rgba(241, 245, 249, 0.9)",
        padding: 4,
        borderRadius: 9999,
        marginBottom: 12,
        border: "1px solid #e2e8f0",
      }}
    >
      {ORDERED_EJES.map((eje) => {
        const isActive = currentEje === eje;
        const config = EJE_CONFIGS[eje];
        const shortName = config.name.split(" ").pop() ?? config.name; // "Onda A Mano" -> "Mano"
        return (
          <button
            key={eje}
            type="button"
            onClick={() => onSelect(eje)}
            style={{
              flex: 1,
              padding: compact ? "8px 6px" : "10px 8px",
              fontSize: compact ? "0.7rem" : "0.75rem",
              fontWeight: 600,
              borderRadius: 9999,
              border: "none",
              background: isActive ? "#fff" : "transparent",
              color: isActive ? "#334155" : "#64748b",
              boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <span>{config.icon}</span>
            <span>{shortName}</span>
          </button>
        );
      })}
    </div>
  );
}
