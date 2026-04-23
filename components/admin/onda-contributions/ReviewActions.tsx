"use client";

import type { OndaContributionRecord } from "@/lib/onda/contributions/types";
import type { ReviewStatus } from "@/lib/onda/contributions/types";
import { REVIEW_STATUSES } from "@/lib/onda/contributions/constants";

const BLUE = "#1428d4";
const DARK = "#0a0f8a";

const QUICK: ReviewStatus[] = ["new", "triaged", "in_review", "verified", "rejected", "incorporated"];

type Props = {
  row: OndaContributionRecord;
  saving: boolean;
  onPatch: (partial: Record<string, unknown>) => Promise<void>;
};

export function ReviewActions({ row, saving, onPatch }: Props) {
  return (
    <section style={{ background: "#fff", borderRadius: 12, padding: 16, marginTop: 12 }}>
      <h2 style={{ fontSize: "1rem", marginTop: 0, color: DARK }}>Acciones rápidas</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {QUICK.map((st) => (
          <button
            key={st}
            type="button"
            disabled={saving || !REVIEW_STATUSES.includes(st)}
            onClick={() => void onPatch({ reviewStatus: st, reviewedBy: "panel-admin" })}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: `1px solid ${BLUE}`,
              background: row.reviewStatus === st ? BLUE : "#fff",
              color: row.reviewStatus === st ? "#fff" : DARK,
              cursor: "pointer",
              fontSize: "0.8125rem",
            }}
          >
            {st}
          </button>
        ))}
      </div>
      <p style={{ fontSize: "0.8125rem", color: "#555" }}>
        <strong>verified</strong> e <strong>incorporated</strong> implican decisión humana; no alimentan respuestas automáticas.
      </p>
    </section>
  );
}
