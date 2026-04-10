import { describe, it, expect } from "vitest";
import {
  DEFAULT_USER_PREFS,
  inferLocaleFromMessage,
  mapPrefsToOndaChatLocale,
  mergePrefs,
  normalizePrefs,
  parsePreferenceCommand,
  shouldForceFormat,
} from "@/lib/userPrefs";

describe("userPrefs", () => {
  it("normalizePrefs aplica defaults y lee lang legado como locale", () => {
    expect(normalizePrefs(null)).toEqual(DEFAULT_USER_PREFS);
    expect(normalizePrefs({ locale: "pt" })).toMatchObject({ locale: "pt" });
    expect(normalizePrefs({ lang: "es" })).toMatchObject({ locale: "es" });
  });

  it("parsePreferenceCommand solo con coincidencia exacta del mensaje", () => {
    const cur = DEFAULT_USER_PREFS;
    expect(parsePreferenceCommand("pt", cur)).not.toBeNull();
    expect(parsePreferenceCommand("português", cur)?.patch).toMatchObject({ locale: "pt" });
    expect(parsePreferenceCommand("español", cur)?.patch).toMatchObject({ locale: "es" });
    expect(parsePreferenceCommand("com fontes", cur)?.patch).toMatchObject({ sources: true });
    expect(parsePreferenceCommand("infográfico", cur)?.patch).toMatchObject({ format: "infografia" });
    expect(parsePreferenceCommand("quiero pt", cur)).toBeNull();
    expect(parsePreferenceCommand("pt y algo más", cur)).toBeNull();
    expect(parsePreferenceCommand("", cur)).toBeNull();
  });

  it("parsePreferenceCommand no activa en frases largas", () => {
    expect(
      parsePreferenceCommand("Explícame en portugués qué es phishing", DEFAULT_USER_PREFS)
    ).toBeNull();
  });

  it("inferLocaleFromMessage distingue pt vs es", () => {
    expect(inferLocaleFromMessage("obrigado pela mensagem hoje")).toBe("pt");
    expect(inferLocaleFromMessage("gracias por la información de hoy")).toBe("es");
    expect(inferLocaleFromMessage("ok")).toBe("unknown");
  });

  it("mapPrefsToOndaChatLocale", () => {
    expect(mapPrefsToOndaChatLocale({ ...DEFAULT_USER_PREFS, locale: "pt" }, "")).toBe("pt-BR");
    expect(mapPrefsToOndaChatLocale({ ...DEFAULT_USER_PREFS, locale: "es" }, "")).toBe("es-LATAM");
    expect(
      mapPrefsToOndaChatLocale({ ...DEFAULT_USER_PREFS, locale: "auto" }, "gracias por la información de hoy")
    ).toBe("es-LATAM");
    expect(mapPrefsToOndaChatLocale({ ...DEFAULT_USER_PREFS, locale: "auto" }, "ok")).toBe("pt-BR");
  });

  it("shouldForceFormat detecta pedidos en frase (no solo comando puro)", () => {
    const base = DEFAULT_USER_PREFS;
    expect(shouldForceFormat(base, "responde em áudio por favor")).toBe("audio");
    expect(shouldForceFormat(base, "quiero una infografía")).toBe("infografia");
  });

  it("ack incluye estado completo tras merge", () => {
    const cur = mergePrefs(DEFAULT_USER_PREFS, { locale: "pt", format: "infografia" });
    const pc = parsePreferenceCommand("curto", cur);
    expect(pc?.ackText.pt).toContain("curto");
    expect(pc?.ackText.pt).toContain("infográfico");
    expect(pc?.ackText.es).toContain("corto");
  });
});
