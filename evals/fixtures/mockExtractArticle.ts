import type { EvalCase } from "../types";

/** Construye un simulate_article mínimo para casos con URL. */
export function thinArticleMeta(host = "diario.ejemplo.cl", url = "https://diario.ejemplo.cl/articulo"): NonNullable<EvalCase["simulate_article"]> {
  return {
    text: "",
    thin: true,
    host,
    url,
    meta: {
      title: "Titular de ejemplo para evaluación",
      description: "Descripción corta del artículo; el cuerpo no está disponible (paywall simulado).",
    },
  };
}
