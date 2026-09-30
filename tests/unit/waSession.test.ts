import { describe, it, expect } from "vitest";
import {
  resolveWaFirstContactWelcome,
  WA_FIRST_CONTACT_PACK_ES,
  WA_FIRST_CONTACT_PACK_PT,
} from "@/content/shared";
import { mergePrefs, parsePreferenceCommand } from "@/lib/userPrefs";
import {
  appendWaHistory,
  applyLanguageAndFormatFromText,
  buildWaModelPreferences,
  consumeWaEjeCommand,
  defaultWaSession,
  responseWhenEjeMissing,
  responseWhenVagueIntent,
  waHistoryToOndaHistory,
  WA_HISTORY_MAX_MESSAGES,
} from "@/lib/waSession";

describe("waSession", () => {
  it("responseWhenEjeMissing pide eje cuando falta perfil", () => {
    const s = defaultWaSession();
    const g = responseWhenEjeMissing(s, "hola");
    expect(g).not.toBeNull();
    expect(g!.text).toMatch(/ONDA/i);
    expect(g!.session.ejePromptShown).toBe(true);
  });

  it("consumeWaEjeCommand reconoce Cívita y confirma", () => {
    const s = defaultWaSession();
    const r = consumeWaEjeCommand("Cívita", s);
    expect(r.session.eje).toBe("CIVITA");
    expect(r.confirmation).toMatch(/Cívita/i);
    expect(r.remainder).toBe("");
  });

  it('consumeWaEjeCommand: "Civita" enruta a CIVITA', () => {
    const r = consumeWaEjeCommand("Civita", defaultWaSession());
    expect(r.session.eje).toBe("CIVITA");
  });

  it('consumeWaEjeCommand: "profes" enruta a PROFES', () => {
    const r = consumeWaEjeCommand("profes", defaultWaSession());
    expect(r.session.eje).toBe("PROFES");
  });

  it('consumeWaEjeCommand: "a mano" enruta a A_MANO', () => {
    const r = consumeWaEjeCommand("a mano", defaultWaSession());
    expect(r.session.eje).toBe("A_MANO");
  });

  it('consumeWaEjeCommand: "docente" enruta a PROFES', () => {
    const r = consumeWaEjeCommand("docente", defaultWaSession());
    expect(r.session.eje).toBe("PROFES");
  });

  it("consumeWaEjeCommand con prefijo Mão deja el resto como pregunta", () => {
    const s = defaultWaSession();
    const r = consumeWaEjeCommand("Mão: me llegó una estafa por WhatsApp", s);
    expect(r.session.eje).toBe("A_MANO");
    expect(r.confirmation).toBeNull();
    expect(r.remainder).toContain("estafa");
  });

  it("bienvenida WA: +56 → ES", () => {
    const w = resolveWaFirstContactWelcome("+56912345678", "hola");
    expect(w).toBe(WA_FIRST_CONTACT_PACK_ES);
    expect(w).toMatch(/Soy Onda/);
    expect(w).toMatch(/\*STOP\* o \*BAJA\*/);
  });

  it("bienvenida WA: +52 → ES", () => {
    expect(resolveWaFirstContactWelcome("5215512345678", "hola")).toBe(WA_FIRST_CONTACT_PACK_ES);
  });

  it("bienvenida WA: +55 → PT", () => {
    const w = resolveWaFirstContactWelcome("+5511999999999", "oi");
    expect(w).toBe(WA_FIRST_CONTACT_PACK_PT);
    expect(w).toMatch(/serviço de educação midiática/);
    expect(w).not.toMatch(/assistente/);
  });

  it("applyLanguageAndFormatFromText detecta áudio y buildWaModelPreferences refleja outputMode", () => {
    let s = defaultWaSession();
    s = applyLanguageAndFormatFromText(s, "Responda em áudio por favor");
    expect(s.prefs.format).toBe("audio");
    const p = buildWaModelPreferences(s, "test");
    expect(p.outputMode).toBe("audio");
  });

  it("applyLanguageAndFormatFromText: texto, fontes e verbosidade", () => {
    let s = defaultWaSession();
    s = applyLanguageAndFormatFromText(s, "texto");
    expect(s.prefs.format).toBe("texto");
    s = applyLanguageAndFormatFromText(s, "com fontes");
    expect(s.prefs.sources).toBe(true);
    s = applyLanguageAndFormatFromText(s, "sem fontes");
    expect(s.prefs.sources).toBe(false);
    s = applyLanguageAndFormatFromText(s, "curto");
    expect(s.prefs.verbosity).toBe("curto");
  });

  it("responseWhenVagueIntent com eje ativo e saudação curta", () => {
    let s = defaultWaSession();
    s = { ...s, eje: "A_MANO" as const };
    const v = responseWhenVagueIntent(s, "Oi");
    expect(v).not.toBeNull();
    expect(v!.text).toMatch(/Explicar em simples/i);
  });

  it("appendWaHistory recorta al máximo y guarda summary heurístico", () => {
    let s = defaultWaSession();
    s = { ...s, prefs: { ...s.prefs, locale: "pt" } };
    for (let i = 0; i < 6; i++) {
      s = appendWaHistory(s, `pergunta ${i}`, `resposta ${i}`);
    }
    expect(s.history.length).toBe(WA_HISTORY_MAX_MESSAGES);
    expect(s.summary).toBeTruthy();
    expect(s.summary!.length).toBeGreaterThan(10);
  });

  it("comando puro infográfico: patch de formato via parsePreferenceCommand", () => {
    const s = defaultWaSession();
    const pc = parsePreferenceCommand("infográfico", s.prefs);
    expect(pc).not.toBeNull();
    const merged = mergePrefs(s.prefs, pc!.patch);
    expect(merged.format).toBe("infografia");
    expect(pc!.ackText.pt).toMatch(/infográfico/i);
  });

  it("comando puro pt: locale pt", () => {
    const pc = parsePreferenceCommand("pt", defaultWaSession().prefs);
    expect(pc?.patch.locale).toBe("pt");
    const merged = mergePrefs(defaultWaSession().prefs, pc!.patch);
    expect(merged.locale).toBe("pt");
  });

  it("waHistoryToOndaHistory antepone resumo quando session.summary existe", () => {
    const base = defaultWaSession();
    const s: typeof base = {
      ...base,
      prefs: { ...base.prefs, locale: "pt" },
      summary: "Tema: golpe por PIX.",
      history: [
        { role: "user", content: "Oi", ts: 1 },
        { role: "assistant", content: "Olá", ts: 2 },
      ],
    };
    const h = waHistoryToOndaHistory(s);
    expect(h[0].role).toBe("model");
    expect(h[0].content).toContain("Resumo do contexto anterior");
    expect(h[0].content).toContain("PIX");
    expect(h.length).toBe(3);
  });
});
