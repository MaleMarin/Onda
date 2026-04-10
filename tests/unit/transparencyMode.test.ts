import { describe, expect, it } from "vitest";
import {
  detectTransparencyRequest,
  effectiveTransparencyRequested,
  wantsCompactTransparencyOnly,
} from "@/lib/transparencyMode";
import { DEFAULT_ONDA_USER_PREFERENCES, mergeOndaUserPreferences } from "@/lib/userPreferences";
import { DEFAULT_USER_PREFS } from "@/lib/userPrefs";

describe("detectTransparencyRequest", () => {
  it("detecta pedidos ES", () => {
    expect(detectTransparencyRequest("¿Cómo llegaste a esa conclusión?", "es-LATAM")).toBe(true);
    expect(detectTransparencyRequest("En qué te basas para decir eso", "es-LATAM")).toBe(true);
    expect(detectTransparencyRequest("¿Por qué dices que es verdad?", "es-LATAM")).toBe(true);
    expect(detectTransparencyRequest("¿Qué usaste para armar esto?", "es-LATAM")).toBe(true);
    expect(detectTransparencyRequest("fuentes de esto", "es-LATAM")).toBe(true);
    expect(detectTransparencyRequest("¿Cómo sabes?", "es-LATAM")).toBe(true);
    expect(detectTransparencyRequest("¿De dónde sale eso?", "es-LATAM")).toBe(true);
  });

  it("detecta pedidos PT", () => {
    expect(detectTransparencyRequest("Como você chegou nisso?", "pt-BR")).toBe(true);
    expect(detectTransparencyRequest("Por que você diz isso?", "pt-BR")).toBe(true);
    expect(detectTransparencyRequest("Em que você se baseou?", "pt-BR")).toBe(true);
    expect(detectTransparencyRequest("Quais fontes você usou?", "pt-BR")).toBe(true);
    expect(detectTransparencyRequest("Como você sabe disso?", "pt-BR")).toBe(true);
    expect(detectTransparencyRequest("De onde saiu isso?", "pt-BR")).toBe(true);
  });

  it("no activa con mensajes genéricos", () => {
    expect(detectTransparencyRequest("Hola, ¿cómo estás?", "es-LATAM")).toBe(false);
    expect(detectTransparencyRequest("Obrigado pela ajuda", "pt-BR")).toBe(false);
  });
});

describe("effectiveTransparencyRequested", () => {
  it("respeta fuerza explícita", () => {
    expect(
      effectiveTransparencyRequested(true, "hola", "es-LATAM")
    ).toBe(true);
    expect(
      effectiveTransparencyRequested(false, "¿Cómo llegaste a eso?", "es-LATAM")
    ).toBe(false);
  });
});

describe("wantsCompactTransparencyOnly", () => {
  it("activa con profundidad simple o verbosidad curta", () => {
    const simple = mergeOndaUserPreferences(DEFAULT_ONDA_USER_PREFERENCES, {
      responseDepth: "simple",
    });
    expect(wantsCompactTransparencyOnly("texto", simple, DEFAULT_USER_PREFS)).toBe(true);
    expect(
      wantsCompactTransparencyOnly("texto", DEFAULT_ONDA_USER_PREFERENCES, {
        ...DEFAULT_USER_PREFS,
        verbosity: "curto",
      })
    ).toBe(true);
  });

  it("activa con simple3 / 3 ideas en el texto", () => {
    expect(wantsCompactTransparencyOnly("simple3 con transparencia", DEFAULT_ONDA_USER_PREFERENCES, null)).toBe(
      true
    );
    expect(wantsCompactTransparencyOnly("tres ideas claras", DEFAULT_ONDA_USER_PREFERENCES, null)).toBe(true);
  });
});
