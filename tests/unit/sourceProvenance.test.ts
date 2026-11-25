import { describe, it, expect } from "vitest";
import { extractRetrievedSources } from "@/lib/sourceProvenance";

describe("trazabilidad de los resultados de Onda", () => {
  it("recupera título y URL sin afirmar que el documento fue leído completo", () => {
    const refs = extractRetrievedSources("[Sitio oficial] Fragmento sobre una ley [Fuente: https://www.gov.br/pt-br]\n\n[Reporte] Fragmento [Fuente: https://www.cepal.org/es]");
    expect(refs).toEqual([
      { title: "Sitio oficial", url: "https://www.gov.br/pt-br", kind: "web_result" },
      { title: "Reporte", url: "https://www.cepal.org/es", kind: "web_result" },
    ]);
  });
  it("elimina duplicados y enlaces a recursos locales", () => {
    const refs = extractRetrievedSources("[A] hola [Fuente: https://example.org/a]\n\n[B] hola [Fuente: https://example.org/a]\n\n[C] peligro [Fuente: http://127.0.0.1/admin]");
    expect(refs).toHaveLength(1);
  });
  it("no inventa referencias cuando no hubo búsqueda", () => {
    expect(extractRetrievedSources("Sin evidencias externas disponibles")).toEqual([]);
  });
});
