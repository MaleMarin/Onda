import { describe, it, expect } from "vitest";
import { parseResponseFormat } from "@/lib/responseFormat";

describe("parseResponseFormat", () => {
  it("elimina marcadores de formato y detecta audio", () => {
    const raw =
      "[ONDA_FORMATO:audio]\n\nHola, aquí va la respuesta.\n[ONDA_SUGERENCIAS: ¿Más ayuda? | ¿Otro tema?]";
    const p = parseResponseFormat(raw);
    expect(p.formato).toBe("audio");
    expect(p.sendAudio).toBe(true);
    expect(p.text).not.toContain("ONDA_FORMATO");
    expect(p.suggestions.length).toBeGreaterThanOrEqual(1);
  });

  it("default texto si no hay marcador", () => {
    const p = parseResponseFormat("Solo texto sin marcadores.");
    expect(p.formato).toBe("texto");
    expect(p.text.length).toBeGreaterThan(5);
  });
});
