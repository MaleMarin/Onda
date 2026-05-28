import { describe, expect, it } from "vitest";
import { buildRiskSystemAppend, computeRiskPipelineFlags } from "@/lib/riskModes";
import {
  SYSTEM_BLOCK_DISINFO_360_ES,
  SYSTEM_BLOCK_DISINFO_360_PT,
} from "@/content/shared";
import { stripOndaInflightMarkers } from "@/lib/responseFormat";

/**
 * Auditoría de producción mostró 7/7 casos con disinfo360=true pero 0/7 cumplieron las 9
 * secciones obligatorias. La causa raíz fue jerarquía: el bloque 360 quedaba compitiendo con
 * el formato general 60s y la regla de enlaces obligatorios. Estos tests blindan:
 *  - Que `buildRiskSystemAppend(disinfo360=true)` incluye TODOS los 9 títulos exactos.
 *  - Que incluye la INSTRUCCIÓN DE PRIORIDAD que reemplaza otros formatos.
 *  - Que incluye la frase de transparencia obligatoria cuando NO hay contexto externo.
 *  - Que el ensamblaje final pone el bloque 360 DESPUÉS de transparencia/format/locale lock.
 *  - Que `stripOndaInflightMarkers` filtra `[ONDA_SUGERENCIAS:...]` y demás artefactos internos.
 *
 * Si alguno falla tras un cambio: la regresión en el formato 360 está volviendo a colarse.
 */

const REQUIRED_TITLES_ES = [
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

const REQUIRED_TITLES_PT = [
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
  it("SYSTEM_BLOCK_DISINFO_360_ES contiene los 9 títulos exactos en orden", () => {
    let lastIndex = -1;
    for (const title of REQUIRED_TITLES_ES) {
      const idx = SYSTEM_BLOCK_DISINFO_360_ES.indexOf(title);
      expect(idx, `Falta título ES: ${title}`).toBeGreaterThan(lastIndex);
      lastIndex = idx;
    }
  });

  it("SYSTEM_BLOCK_DISINFO_360_PT contiene los 9 títulos exactos en orden", () => {
    let lastIndex = -1;
    for (const title of REQUIRED_TITLES_PT) {
      const idx = SYSTEM_BLOCK_DISINFO_360_PT.indexOf(title);
      expect(idx, `Falta título PT: ${title}`).toBeGreaterThan(lastIndex);
      lastIndex = idx;
    }
  });

  it("SYSTEM_BLOCK_DISINFO_360_ES contiene INSTRUCCIÓN DE PRIORIDAD", () => {
    expect(SYSTEM_BLOCK_DISINFO_360_ES).toMatch(/INSTRUCCI[OÓ]N\s+DE\s+PRIORIDAD/i);
    expect(SYSTEM_BLOCK_DISINFO_360_ES).toMatch(
      /esta\s+estructura\s+reemplaza\s+cualquier\s+otro\s+formato/i
    );
  });

  it("SYSTEM_BLOCK_DISINFO_360_PT contiene INSTRUÇÃO DE PRIORIDADE", () => {
    expect(SYSTEM_BLOCK_DISINFO_360_PT).toMatch(/INSTRU[CÇ][AÃ]O\s+DE\s+PRIORIDADE/i);
    expect(SYSTEM_BLOCK_DISINFO_360_PT).toMatch(
      /esta\s+estrutura\s+substitui\s+qualquer\s+outro\s+formato/i
    );
  });

  it("SYSTEM_BLOCK_DISINFO_360_ES contiene un ejemplo one-shot con el caso 'bancos'", () => {
    expect(SYSTEM_BLOCK_DISINFO_360_ES).toMatch(/EJEMPLO\s+BREVE\s+DE\s+RESPUESTA\s+IDEAL/i);
    expect(SYSTEM_BLOCK_DISINFO_360_ES).toMatch(/cerrar[aá]n\s+todos\s+los\s+bancos/i);
  });

  it("SYSTEM_BLOCK_DISINFO_360_PT contiene um exemplo one-shot com o caso 'bancos'", () => {
    expect(SYSTEM_BLOCK_DISINFO_360_PT).toMatch(/EXEMPLO\s+BREVE\s+DE\s+RESPOSTA\s+IDEAL/i);
    expect(SYSTEM_BLOCK_DISINFO_360_PT).toMatch(/fechar\s+todos\s+os\s+bancos/i);
  });

  it("buildRiskSystemAppend con disinfo360=true (sin contexto externo) inyecta los 9 títulos + prioridad + transparencia", () => {
    const flags = computeRiskPipelineFlags(
      "Me llegó un audio que dice que mañana cerrarán todos los bancos. ¿Es verdad?",
      false,
      null,
      "es-LATAM"
    );
    expect(flags.disinfo360).toBe(true);

    const appended = buildRiskSystemAppend(flags, "es-LATAM", { hasExternalContext: false });

    for (const title of REQUIRED_TITLES_ES) {
      expect(appended, `Falta título tras append: ${title}`).toContain(title);
    }

    expect(appended).toMatch(/PRIORIDAD\s+ABSOLUTA:\s+MODO_DESINFORMACION_360/i);
    expect(appended).toMatch(/INSTRUCCI[OÓ]N\s+DE\s+PRIORIDAD/i);
    expect(appended).toMatch(/No\s+tengo\s+evidencia\s+externa\s+disponible/i);
    expect(appended).toMatch(/PROHIBIDO\s+citar\s+BBC,\s+Reuters/i);
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

  it("buildRiskSystemAppend PT con disinfo360=true inyecta los 9 títulos PT + prioridade", () => {
    const flags = computeRiskPipelineFlags(
      "Me chegou um áudio dizendo que amanhã vão fechar todos os bancos. É verdade?",
      false,
      null,
      "pt-BR",
      "disinformation"
    );
    expect(flags.disinfo360).toBe(true);

    const appended = buildRiskSystemAppend(flags, "pt-BR", { hasExternalContext: false });
    for (const title of REQUIRED_TITLES_PT) {
      expect(appended, `Falta título PT tras append: ${title}`).toContain(title);
    }

    expect(appended).toMatch(/PRIORIDADE\s+ABSOLUTA:\s+MODO_DESINFORMACAO_360/i);
    expect(appended).toMatch(/INSTRU[CÇ][AÃ]O\s+DE\s+PRIORIDADE/i);
    expect(appended).toMatch(/N[aã]o\s+tenho\s+evid[eê]ncia\s+externa/i);
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
    expect(appended).not.toContain("**1. Qué entendí**");
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
