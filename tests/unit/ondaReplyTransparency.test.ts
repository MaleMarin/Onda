import { describe, expect, it } from "vitest";
import { buildTransparencyInstructionAppend } from "@/lib/transparencyMode";
import { SYSTEM_BLOCK_TRANSPARENCIA_ES, SYSTEM_BLOCK_TRANSPARENCIA_PT } from "@/content/shared";
import { DEFAULT_ONDA_USER_PREFERENCES } from "@/lib/userPreferences";
import { DEFAULT_USER_PREFS } from "@/lib/userPrefs";

describe("buildTransparencyInstructionAppend (inyectado en ondaReply)", () => {
  it("incluye el bloque ES y señales cuando hay transparencia larga", () => {
    const s = buildTransparencyInstructionAppend({
      requested: true,
      locale: "es-LATAM",
      riskPipeline: { emergency: false, sensitive: false, pantallazoDetective: false },
      hasArticleContext: true,
      articleThin: false,
      hasExternalContext: false,
      hasImageInput: false,
      userText: "¿Cómo llegaste a eso?",
      inclusivePreferences: DEFAULT_ONDA_USER_PREFERENCES,
      unifiedUserPrefs: DEFAULT_USER_PREFS,
    });
    expect(s).toContain(SYSTEM_BLOCK_TRANSPARENCIA_ES);
    expect(s).toContain("No usé fuentes externas");
  });

  it("en modo compacto (simple3) no incluye el bloque ### largo", () => {
    const s = buildTransparencyInstructionAppend({
      requested: true,
      locale: "pt-BR",
      riskPipeline: { emergency: false, sensitive: false, pantallazoDetective: false },
      hasArticleContext: false,
      hasExternalContext: false,
      hasImageInput: false,
      userText: "simple3 ideias e transparência",
      inclusivePreferences: DEFAULT_ONDA_USER_PREFERENCES,
      unifiedUserPrefs: DEFAULT_USER_PREFS,
    });
    expect(s).not.toContain("### Transparência (como cheguei nisso)");
    expect(s).toContain("Transparência: baseei-me");
  });
});
