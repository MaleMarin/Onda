import { sanitizeTextForTelemetry } from "@/lib/insightsTagger";

/** Sanitiza campos de texto libre antes de guardar o exponer en admin. */
export function sanitizeContributionPlainText(s: string, maxLen: number): string {
  const cleaned = sanitizeTextForTelemetry((s ?? "").slice(0, maxLen + 200));
  return cleaned.slice(0, maxLen).trim();
}
