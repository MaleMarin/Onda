import { describe, it, expect } from "vitest";
import { EjeOnda } from "@/content/types";
import { recordEvent, type TelemetryEvent } from "@/lib/insightsTelemetry";

function baseEvent(): TelemetryEvent {
  return {
    timestamp: new Date().toISOString(),
    channel: "web",
    locale: "es",
    eje: EjeOnda.CIVITA,
    detected_intent: "general",
    content_type: "text",
    output_format: "texto",
    verbosity: "normal",
    sources_requested: false,
    risk_flags: { emergency: false, scam: false, sensitive: false, simple3: true },
    outcome: "ok",
    turn_stats: { user_chars: 2, assistant_chars: 0 },
    tags: ["test"],
  };
}

describe("recordEvent", () => {
  it("rechaza campos prohibidos (no PII en payload)", async () => {
    const bad = { ...baseEvent(), user_message: "secreto" } as unknown as TelemetryEvent;
    await expect(recordEvent(bad)).rejects.toThrow(/prohibido/);
  });

  it("acepta evento mínimo válido", async () => {
    await expect(recordEvent(baseEvent())).resolves.toBeUndefined();
  });
});

describe("insights serialization (eval)", () => {
  it("no incluye claves de mensaje completo", () => {
    const e = baseEvent();
    const s = JSON.stringify(e);
    for (const k of ["user_message", "assistant_message", "messages", "history"]) {
      expect(s).not.toContain(`"${k}"`);
    }
  });
});
