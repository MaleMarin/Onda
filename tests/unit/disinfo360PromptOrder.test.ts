import { describe, expect, it } from "vitest";
import { buildRiskSystemAppend, computeRiskPipelineFlags } from "@/lib/riskModes";
import {
  SYSTEM_BLOCK_DISINFO_360_ES,
  SYSTEM_BLOCK_DISINFO_360_PT,
} from "@/content/shared";
import { stripOndaInflightMarkers } from "@/lib/responseFormat";

/**
 * El modo Desinformación 360 responde en máximo 3 párrafos en prosa (sin 9 secciones).
 * Estos tests blindan:
 *  - Que el bloque exige prosa de 3 párrafos y prohíbe estructura numerada.
 *  - Que incluye la INSTRUCCIÓN DE PRIORIDAD que reemplaza otros formatos.
 *  - Que incluye la frase de transparencia obligatoria cuando NO hay contexto externo.
 *  - Que `stripOndaInflightMarkers` filtra marcadores internos.
 */

const FORBIDDEN_SECTION_TITLES_ES = [
  "**1. Qué entendí**",
  "**2. Qué se afirma**",
  "**3. Tipo de afirmación**",
  "**4. Señales de alerta**",
  "**5. Qué evidencia habría que buscar**",
  "**6. Qué se puede concluir hoy y qué no**",
  "**7. Nivel de certeza**",
  "**8. Antes de compartir**",
  "**9. Cómo reconocer este patrón la próxima vez**",
];

const FORBIDDEN_SECTION_TITLES_PT = [
  "**1. O que entendi**",
  "**2. O que se afirma**",
  "**3. Tipo de afirmação**",
  "**4. Sinais de alerta**",
  "**5. Que evidência seria preciso buscar**",
  "**6. O que dá para concluir hoje e o que não dá**",
  "**7. Nível de certeza**",
  "**8. Antes de compartilhar**",
  "**9. Como reconhecer este padrão na próxima vez**",
];

describe("Desinformación 360 — system prompt enforcement", () => {
  it("SYSTEM_BLOCK_DISINFO_360_ES exige máximo 3 párrafos en prosa y prohíbe 9 secciones", () => {
    expect(SYSTEM_BLOCK_DISINFO_360_ES).toMatch(/M[ÁA]XIMO\s+3\s+p[áa]rrafos/i);
    expect(SYSTEM_BLOCK_DISINFO_360_ES).toMatch(/sin numerar/i);
    expect(SYSTEM_BLOCK_DISINFO_360_ES).toMatch(/estructura numerada de 9 secciones/i);
    for (const title of FORBIDDEN_SECTION_TITLES_ES) {
      expect(SYSTEM_BLOCK_DISINFO_360_ES, `No debe contener: ${title}`).not.toContain(title);
    }
    expect(SYSTEM_BLOCK_DISINFO_360_ES).not.toContain("Qué entendí");
    expect(SYSTEM_BLOCK_DISINFO_360_ES).not.toContain("Qué se afirma");
    expect(SYSTEM_BLOCK_DISINFO_360_ES).not.toContain("Nivel de certeza");
  });

  it("SYSTEM_BLOCK_DISINFO_360_PT exige no máximo 3 parágrafos em prosa e proíbe 9 seções", () => {
    expect(SYSTEM_BLOCK_DISINFO_360_PT).toMatch(/NO\s+M[ÁA]XIMO\s+3\s+par[áa]grafos/i);
    expect(SYSTEM_BLOCK_DISINFO_360_PT).toMatch(/sem numerar/i);
    expect(SYSTEM_BLOCK_DISINFO_360_PT).toMatch(/estrutura numerada de 9 se[çc][õo]es/i);
    for (const title of FORBIDDEN_SECTION_TITLES_PT) {
      expect(SYSTEM_BLOCK_DISINFO_360_PT, `Não deve conter: ${title}`).not.toContain(title);
    }
    expect(SYSTEM_BLOCK_DISINFO_360_PT).not.toContain("O que entendi");
    expect(SYSTEM_BLOCK_DISINFO_360_PT).not.toContain("Nível de certeza");
  });

  it("SYSTEM_BLOCK_DISINFO_360_ES contiene INSTRUCCIÓN DE PRIORIDAD", () => {
    expect(SYSTEM_BLOCK_DISINFO_360_ES).toMatch(/INSTRUCCI[OÓ]N\s+DE\s+PRIORIDAD/i);
    expect(SYSTEM_BLOCK_DISINFO_360_ES).toMatch(/REPLAZA\s+cualquier\s+otro\s+formato/i);
  });

  it("SYSTEM_BLOCK_DISINFO_360_PT contiene INSTRUÇÃO DE PRIORIDADE", () => {
    expect(SYSTEM_BLOCK_DISINFO_360_PT).toMatch(/INSTRU[CÇ][AÃ]O\s+DE\s+PRIORIDADE/i);
    expect(SYSTEM_BLOCK_DISINFO_360_PT).toMatch(/SUBSTITUI\s+qualquer\s+outro\s+formato/i);
  });

  it("SYSTEM_BLOCK_DISINFO_360_ES contiene un ejemplo one-shot con el caso 'bancos'", () => {
    expect(SYSTEM_BLOCK_DISINFO_360_ES).toMatch(/EJEMPLO\s+BREVE\s+DE\s+RESPUESTA\s+IDEAL/i);
    expect(SYSTEM_BLOCK_DISINFO_360_ES).toMatch(/cerrar[aá]n\s+todos\s+los\s+bancos/i);
  });

  it("SYSTEM_BLOCK_DISINFO_360_PT contiene um exemplo one-shot com o caso 'bancos'", () => {
    expect(SYSTEM_BLOCK_DISINFO_360_PT).toMatch(/EXEMPLO\s+BREVE\s+DE\s+RESPOSTA\s+IDEAL/i);
    expect(SYSTEM_BLOCK_DISINFO_360_PT).toMatch(/fechar\s+todos\s+os\s+bancos/i);
  });

  it("buildRiskSystemAppend con disinfo360=true (sin contexto externo) inyecta prosa 3 párrafos + prioridad + transparencia", () => {
    const flags = computeRiskPipelineFlags(
      "Me llegó un audio que dice que mañana cerrarán todos los bancos. ¿Es verdad?",
      false,
      null,
      "es-LATAM"
    );
    expect(flags.disinfo360).toBe(true);

    const appended = buildRiskSystemAppend(flags, "es-LATAM", { hasExternalContext: false });

    expect(appended).toMatch(/M[ÁA]XIMO\s+3\s+p[áa]rrafos/i);
    expect(appended).toMatch(/PRIORIDAD\s+ABSOLUTA:\s+MODO_DESINFORMACION_360/i);
    expect(appended).toMatch(/INSTRUCCI[OÓ]N\s+DE\s+PRIORIDAD/i);
    expect(appended).toMatch(/No\s+tengo\s+evidencia\s+externa\s+disponible/i);
    expect(appended).toMatch(/PROHIBIDO\s+citar\s+BBC,\s+Reuters/i);
    for (const title of FORBIDDEN_SECTION_TITLES_ES) {
      expect(appended, `No debe inyectar: ${title}`).not.toContain(title);
    }
  });

  it("buildRiskSystemAppend con disinfo360=true Y contexto externo NO inyecta nota anti-fuentes", () => {
    const flags = computeRiskPipelineFlags(
      "Vi una noticia que dice que una nueva ley ya fue aprobada, pero no trae fuente ni fecha. ¿La comparto?",
      false,
      null,
      "es-LATAM"
    );
    expect(flags.disinfo360).toBe(true);

    const appended = buildRiskSystemAppend(flags, "es-LATAM", { hasExternalContext: true });

    expect(appended).toMatch(/PRIORIDAD\s+ABSOLUTA:\s+MODO_DESINFORMACION_360/i);
    expect(appended).not.toMatch(/PROHIBIDO\s+citar\s+BBC,\s+Reuters/i);
    expect(appended).not.toMatch(/SIN\s+EVIDENCIA\s+EXTERNA\s+INYECTADA/i);
  });

  it("buildRiskSystemAppend PT con disinfo360=true inyecta prosa 3 parágrafos + prioridade", () => {
    const flags = computeRiskPipelineFlags(
      "Me chegou um áudio dizendo que amanhã vão fechar todos os bancos. É verdade?",
      false,
      null,
      "pt-BR",
      "disinformation"
    );
    expect(flags.disinfo360).toBe(true);

    const appended = buildRiskSystemAppend(flags, "pt-BR", { hasExternalContext: false });
    expect(appended).toMatch(/NO\s+M[ÁA]XIMO\s+3\s+par[áa]grafos/i);
    expect(appended).toMatch(/PRIORIDADE\s+ABSOLUTA:\s+MODO_DESINFORMACAO_360/i);
    expect(appended).toMatch(/INSTRU[CÇ][AÃ]O\s+DE\s+PRIORIDADE/i);
    expect(appended).toMatch(/N[aã]o\s+tenho\s+evid[eê]ncia\s+externa/i);
    for (const title of FORBIDDEN_SECTION_TITLES_PT) {
      expect(appended, `Não deve injetar: ${title}`).not.toContain(title);
    }
  });

  it("buildRiskSystemAppend con disinfo360=false NO inyecta el bloque 360", () => {
    const appended = buildRiskSystemAppend(
      {
        emergency: false,
        sensitive: false,
        pantallazoDetective: false,
        disinfo360: false,
      },
      "es-LATAM",
      { hasExternalContext: false }
    );
    expect(appended).not.toContain("MODO_DESINFORMACION_360");
    expect(appended).not.toMatch(/PRIORIDAD\s+ABSOLUTA/i);
  });
});

describe("Streaming artifacts — strip de marcadores internos", () => {
  it("stripOndaInflightMarkers elimina [ONDA_SUGERENCIAS:...] completo", () => {
    const raw = "Texto útil para el usuario.\n[ONDA_SUGERENCIAS: ¿Más? | ¿Cómo? | ¿Cuándo?]\nFin.";
    const out = stripOndaInflightMarkers(raw);
    expect(out).not.toContain("[ONDA_SUGERENCIAS");
    expect(out).toContain("Texto útil para el usuario.");
    expect(out).toContain("Fin.");
  });

  it("stripOndaInflightMarkers elimina [ONDA_FORMATO:...] y [ONDA_GUIA:...]", () => {
    const raw = "Resp [ONDA_FORMATO:texto] con guía [ONDA_GUIA:phishing] activa.";
    const out = stripOndaInflightMarkers(raw);
    expect(out).not.toMatch(/\[ONDA_/);
    expect(out).toContain("Resp");
  });

  it("stripOndaInflightMarkers oculta marcadores parciales al final del chunk (in-flight)", () => {
    const raw = "Texto previo.\n[ONDA_SUGERENCIAS: ¿Algo m";
    const out = stripOndaInflightMarkers(raw);
    expect(out).not.toContain("[ONDA_SUGERENCIAS");
    expect(out).toContain("Texto previo.");
  });

  it("stripOndaInflightMarkers no toca texto normal con corchetes legítimos", () => {
    const raw = "Mira [Wikipedia](https://wikipedia.org) para más.";
    const out = stripOndaInflightMarkers(raw);
    expect(out).toBe(raw);
  });

  it("stripOndaInflightMarkers filtra cualquier marcador interno [ONDA_*]", () => {
    const raw = "Hola [ONDA_DESCONOCIDO:valor cualquiera] mundo.";
    const out = stripOndaInflightMarkers(raw);
    expect(out).not.toMatch(/\[ONDA_/);
  });
});
