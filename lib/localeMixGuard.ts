import type { OndaChatLocale } from "@/lib/userPreferences";

/** Patrones típicos de copy ES en UI que no deberían aparecer si el locale efectivo es pt-BR. */
const ES_MARKERS_IN_PT_UI =
  /\binstituciones\b|\bciudadanía\b|\bdocencia\b|\bcotidiana\b|\bcriterio e IA\b|\bproyectos educativos\b/i;

/** Patrones típicos de copy PT en UI que no deberían aparecer si el locale efectivo es es-LATAM. */
const PT_MARKERS_IN_ES_UI =
  /\binstituições\b|\bcidadania\b|\bdocência\b|\bdia a dia\b|\bcritério e IA\b|\bprojetos educativos\b/i;

export function scanUiStringsForLocaleMix(
  effectiveLocale: OndaChatLocale,
  snippets: string[]
): { mixed: boolean; hits: string[] } {
  const hits: string[] = [];
  const combined = snippets.filter(Boolean).join(" | ");
  if (!combined.trim()) return { mixed: false, hits: [] };
  if (effectiveLocale === "pt-BR" && ES_MARKERS_IN_PT_UI.test(combined)) hits.push("es-markers-in-pt-ui");
  if (effectiveLocale === "es-LATAM" && PT_MARKERS_IN_ES_UI.test(combined)) hits.push("pt-markers-in-es-ui");
  return { mixed: hits.length > 0, hits };
}

/** Solo desarrollo: avisa si strings de UI mezclan idiomas respecto al locale elegido. */
export function warnLocaleMixInDev(
  effectiveLocale: OndaChatLocale,
  snippets: string[],
  context?: string
): void {
  if (process.env.NODE_ENV === "production") return;
  const { mixed, hits } = scanUiStringsForLocaleMix(effectiveLocale, snippets);
  if (mixed) {
    console.warn(`[onda/locale] Posible mezcla de idioma (${context ?? "ui"}):`, hits, { effectiveLocale });
  }
}
