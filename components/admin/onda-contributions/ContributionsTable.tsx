"use client";

import Link from "next/link";
import type { OndaContributionRecord } from "@/lib/onda/contributions/types";

const BLUE = "#1428d4";

type Props = {
  items: OndaContributionRecord[];
  basePath?: string;
};

export function ContributionsTable({ items, basePath = "/admin/onda-contributions" }: Props) {
  return (
    <div style={{ overflowX: "auto", background: "#fff", borderRadius: 12, padding: 12, boxShadow: "0 2px 8px rgba(10,15,138,0.08)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: `2px solid ${BLUE}` }}>
            <th style={{ padding: 8 }}>Fecha</th>
            <th style={{ padding: 8 }}>Canal</th>
            <th style={{ padding: 8 }}>Eje</th>
            <th style={{ padding: 8 }}>Tipo</th>
            <th style={{ padding: 8 }}>Estado</th>
            <th style={{ padding: 8 }}>Urg.</th>
            <th style={{ padding: 8 }}>Topic</th>
            <th style={{ padding: 8 }} />
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id} style={{ borderBottom: "1px solid #eee", verticalAlign: "top" }}>
              <td style={{ padding: 8, whiteSpace: "nowrap" }}>{row.createdAt ? row.createdAt.slice(0, 19).replace("T", " ") : "—"}</td>
              <td style={{ padding: 8 }}>{row.channel}</td>
              <td style={{ padding: 8 }}>{row.eje}</td>
              <td style={{ padding: 8 }}>{row.contributionType}</td>
              <td style={{ padding: 8 }}>{row.reviewStatus}</td>
              <td style={{ padding: 8 }}>{row.urgency}</td>
              <td style={{ padding: 8 }}>{row.topic ?? "—"}</td>
              <td style={{ padding: 8 }}>
                <Link href={`${basePath}/${row.id}`} style={{ color: BLUE, fontWeight: 600 }}>
                  Ver
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 ? <p style={{ color: "#666", padding: 8 }}>Sin resultados o Firestore sin datos.</p> : null}
    </div>
  );
}
