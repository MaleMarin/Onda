import { describe, it, expect } from "vitest";
import { ORDERED_EJES } from "@/content/shared";
import { getEjeCardSubtitle } from "@/lib/chatI18n";
import { scanUiStringsForLocaleMix } from "@/lib/localeMixGuard";
import { getLocalizedGreetingNewDay } from "@/lib/welcomeI18n";

describe("UI locale coherence (sin mezcla ES/PT)", () => {
  it("pt-BR: subtítulos de tarjeta Onda no contienen marcadores ES de Civita/A Mano", () => {
    const snippets = ORDERED_EJES.map((eje) => getEjeCardSubtitle("pt-BR", eje));
    for (const s of snippets) {
      expect(s).not.toMatch(/\binstituciones\b|\bciudadanía\b|\bcotidiana\b|\bdocencia\b/);
    }
    const { mixed } = scanUiStringsForLocaleMix("pt-BR", snippets);
    expect(mixed).toBe(false);
  });

  it("es-LATAM: subtítulos no contienen marcadores PT de Civita/A Mano", () => {
    const snippets = ORDERED_EJES.map((eje) => getEjeCardSubtitle("es-LATAM", eje));
    for (const s of snippets) {
      expect(s).not.toMatch(/\binstituições\b|\bcidadania\b|\bdia a dia\b|\bdocência\b/);
    }
    const { mixed } = scanUiStringsForLocaleMix("es-LATAM", snippets);
    expect(mixed).toBe(false);
  });

  it("saludo nuevo día pt-BR no incluye patrón ES 'instituciones'", () => {
    const g = getLocalizedGreetingNewDay(null, "pt-BR");
    expect(g).not.toMatch(/\binstituciones\b/);
    expect(g.toLowerCase()).toContain("hoje é");
  });
});
