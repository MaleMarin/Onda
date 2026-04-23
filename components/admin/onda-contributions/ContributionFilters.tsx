"use client";

import type { ContributionEjeSlug, ReviewStatus, ContributionType, ContributionUrgency, ContributionChannel } from "@/lib/onda/contributions/types";
import { CONTRIBUTION_TYPES, REVIEW_STATUSES } from "@/lib/onda/contributions/constants";

const BLUE = "#1428d4";

const EJES: { id: ContributionEjeSlug | ""; label: string }[] = [
  { id: "", label: "Todos los ejes" },
  { id: "onda_a_mano", label: "A mano" },
  { id: "onda_civita", label: "Civita" },
  { id: "onda_profes", label: "Profes" },
];

type Props = {
  eje: ContributionEjeSlug | "";
  setEje: (v: ContributionEjeSlug | "") => void;
  reviewStatus: ReviewStatus | "";
  setReviewStatus: (v: ReviewStatus | "") => void;
  contributionType: string;
  setContributionType: (v: string) => void;
  topic: string;
  setTopic: (v: string) => void;
  urgency: "" | ContributionUrgency;
  setUrgency: (v: "" | ContributionUrgency) => void;
  channel: "" | ContributionChannel;
  setChannel: (v: "" | ContributionChannel) => void;
  from: string;
  setFrom: (v: string) => void;
  to: string;
  setTo: (v: string) => void;
};

export function ContributionFilters({
  eje,
  setEje,
  reviewStatus,
  setReviewStatus,
  contributionType,
  setContributionType,
  topic,
  setTopic,
  urgency,
  setUrgency,
  channel,
  setChannel,
  from,
  setFrom,
  to,
  setTo,
}: Props) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
        gap: 10,
        marginTop: 16,
        marginBottom: 16,
        background: "#fff",
        padding: 14,
        borderRadius: 12,
        boxShadow: "0 2px 8px rgba(10,15,138,0.08)",
      }}
    >
      <label style={{ fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: 4 }}>
        Eje
        <select
          value={eje}
          onChange={(e) => setEje(e.target.value as ContributionEjeSlug | "")}
          style={{ padding: 8, borderRadius: 8, border: `1px solid ${BLUE}` }}
        >
          {EJES.map((o) => (
            <option key={o.id || "all"} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label style={{ fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: 4 }}>
        Estado revisión
        <select
          value={reviewStatus}
          onChange={(e) => setReviewStatus(e.target.value as ReviewStatus | "")}
          style={{ padding: 8, borderRadius: 8, border: `1px solid ${BLUE}` }}
        >
          <option value="">Todos</option>
          {REVIEW_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label style={{ fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: 4 }}>
        Tipo
        <select
          value={contributionType}
          onChange={(e) => setContributionType(e.target.value)}
          style={{ padding: 8, borderRadius: 8, border: `1px solid ${BLUE}` }}
        >
          <option value="">Todos</option>
          {CONTRIBUTION_TYPES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label style={{ fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: 4 }}>
        Canal
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value as "" | ContributionChannel)}
          style={{ padding: 8, borderRadius: 8, border: `1px solid ${BLUE}` }}
        >
          <option value="">Todos</option>
          <option value="web">web</option>
          <option value="whatsapp">whatsapp</option>
        </select>
      </label>
      <label style={{ fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: 4 }}>
        Urgencia
        <select
          value={urgency}
          onChange={(e) => setUrgency(e.target.value as "" | ContributionUrgency)}
          style={{ padding: 8, borderRadius: 8, border: `1px solid ${BLUE}` }}
        >
          <option value="">Todas</option>
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
        </select>
      </label>
      <label style={{ fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: 4 }}>
        Topic (contiene)
        <input value={topic} onChange={(e) => setTopic(e.target.value)} style={{ padding: 8, borderRadius: 8, border: `1px solid ${BLUE}` }} />
      </label>
      <label style={{ fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: 4 }}>
        Desde (ISO)
        <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="2026-01-01" style={{ padding: 8, borderRadius: 8, border: `1px solid ${BLUE}` }} />
      </label>
      <label style={{ fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: 4 }}>
        Hasta (ISO)
        <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="2026-12-31" style={{ padding: 8, borderRadius: 8, border: `1px solid ${BLUE}` }} />
      </label>
    </div>
  );
}
