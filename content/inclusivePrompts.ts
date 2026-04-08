/**
 * Capa modular de inclusión: se concatena al system prompt sin reemplazar reglas existentes de Onda.
 */

import type { OndaUserPreferences } from "@/lib/userPreferences";
import { DEFAULT_ONDA_USER_PREFERENCES, isDefaultOndaUserPreferences } from "@/lib/userPreferences";
import { EjeOnda } from "@/content/types";
type InclusiveCanal = "web" | "whatsapp" | null | undefined;

const STRESS_HINT =
  /\b(me da vergüenza|tengo miedo|estoy asustad|no entiendo nada|soy muy grande para|no sé usar|me van a estafar|es urgente|me van a cerrar)\b/i;

function baseTransparencyBlock(): string {
  return `
--- CAPA INCLUSIÓN: TRANSPARENCIA (breve, no burocrática) ---
Cuando ayude a la persona, deja claro (sin párrafos largos):
- qué sabes con base en el contexto o fuentes disponibles;
- qué es inferencia razonable frente a un dato verificado;
- si falta un dato clave (p. ej. país o enlace), dilo en una línea y ofrece seguir igual con marco general.
No uses la palabra "pruebas" para el mensaje de la fundación; usa "evidencias" salvo cita literal de una fuente.
`.trim();
}

function emotionalAccompanimentBlock(userText: string): string {
  const t = (userText || "").trim();
  if (!t || !STRESS_HINT.test(t)) return "";
  return `
--- ACOMPAÑAMIENTO (no es terapia; es UX conversacional) ---
La persona puede venir tensa o avergonzada. Baja la ansiedad con un tono sereno, sin dramatizar ni culpar.
Ofrece UN siguiente paso concreto (verificar, pausar, contrastar). No infantilices.
`.trim();
}

function localeBlock(prefs: OndaUserPreferences): string {
  if (prefs.locale === "pt-BR") {
    return `
--- IDIOMA (preferência da pessoa) ---
Responda em português do Brasil: claro, natural, "você", sem jargão desnecessário. Mantenha neutralidade e as mesmas regras éticas de Onda.
`.trim();
  }
  return "";
}

function depthBlock(prefs: OndaUserPreferences): string {
  switch (prefs.responseDepth) {
    case "simple":
      return `PROFUNDIDAD "simple": lenguaje muy claro, corto, una idea principal y un ejemplo cotidiano si aplica. Evita tecnicismos.`;
    case "brief":
      return `PROFUNDIDAD "brief": respuesta corta, accionable, sin preámbulos largos. Máximo 2–3 párrafos cortos en web (menos en WhatsApp).`;
    case "step_by_step":
      return `PROFUNDIDAD "paso a paso": estructura numerada (1, 2, 3…) con un solo paso por ítem; al final, un recordatorio de "qué hacer primero".`;
    case "detailed":
    default:
      return `PROFUNDIDAD "detalle": puedes desarrollar con claridad, siempre con jerarquía (títulos ligeros o párrafos) y sin relleno.`;
  }
}

function readingModeBlock(prefs: OndaUserPreferences): string {
  if (prefs.readingMode !== "easy") return "";
  return `
MODO LECTURA FÁCIL (obligatorio mientras esté activo):
- Frases cortas (ideal ≤ 20 palabras).
- Una idea por párrafo.
- Ejemplos cotidianos concretos; cero jerga; si un término es necesario, defínelo en la misma frase.
- Tono amable, adulto (no infantilizar).
`.trim();
}

function bandwidthBlock(prefs: OndaUserPreferences, canal: InclusiveCanal): string {
  const lines: string[] = [];
  if (prefs.bandwidthMode === "low") {
    lines.push(
      "MODO BAJO CONSUMO: prioriza texto útil; menos adornos y menos secciones; respuestas más cortas; acciones concretas primero."
    );
  }
  if (canal === "whatsapp") {
    lines.push(
      "Canal WhatsApp: asume datos móviles limitados; máxima claridad en pocas líneas; evita listas largas y markdown de web."
    );
  }
  return lines.length ? lines.join("\n") : "";
}

function countryBlock(prefs: OndaUserPreferences, eje: EjeOnda | null | undefined): string {
  const c = prefs.userCountry?.trim();
  const civitaExtra =
    eje === EjeOnda.CIVITA
      ? " En Civita, el marco territorial importa: distingue dato verificado de interpretación y de opinión."
      : "";
  if (c && c !== "LATAM") {
    return `
CONTEXTO TERRITORIAL: la persona indicó país/región: ${c}. Explica primero el marco general cuando el tema varía por país; luego aterriza al contexto ${c} si tienes información fiable. Si no, dilo en una línea y sugiere verificar en fuente oficial de ese país.${civitaExtra}
`.trim();
  }
  return `
CONTEXTO TERRITORIAL: no hay país guardado. Si el tema depende del país (leyes, trámites, fechas electorales, organismos), explica el marco general y, si hace falta, pide el país en UNA línea al final sin cortar la ayuda útil.${civitaExtra}
`.trim();
}

function audienceBlock(prefs: OndaUserPreferences): string {
  switch (prefs.audienceProfile) {
    case "older_adult":
      return `PERFIL "persona mayor": calma, pasos claros, menos carga cognitiva, sin prisa en el tono; evita asumir que domina la jerga digital.`;
    case "youth":
      return `PERFIL "jóven": directo, respetuoso, sin tono paternalista; ejemplos actuales y breves.`;
    case "teacher":
      return `PERFIL "docente": estructura útil (objetivo, pasos, ejemplo de aula); enfoque práctico y responsable con el uso de IA.`;
    case "community_mediator":
      return `PERFIL "mediación comunitaria": respuestas reutilizables para explicar a un grupo (taller, vecinos); lenguaje inclusivo y neutro.`;
    default:
      return `PERFIL "general": mantén el tono Onda habitual, claro y pedagógico.`;
  }
}

function outputAudioBlock(prefs: OndaUserPreferences): string {
  if (prefs.outputMode === "audio") {
    return `SALIDA: la persona pidió audio. Comienza la respuesta con la marca exacta [ONDA_FORMATO:audio] y luego un texto adecuado para leer en voz (frases cortas, sin tablas ni markdown complejo).`;
  }
  if (prefs.outputMode === "auto") {
    return `SALIDA "auto": por defecto texto. Si la persona pide voz/audio explícitamente o el mensaje indica dificultad para leer, puedes usar [ONDA_FORMATO:audio]; no abuses.`;
  }
  return `SALIDA: texto por defecto; no uses [ONDA_FORMATO:audio] salvo que el usuario pida audio o esté en modo auto y aplique lo anterior.`;
}

function ejeTweaks(eje: EjeOnda | null | undefined): string {
  if (eje === EjeOnda.A_MANO) {
    return `AJUSTE A MANO: prioriza vida digital cotidiana, estafas y confusión; pasos verificables; contención sin alarmismo.`;
  }
  if (eje === EjeOnda.CIVITA) {
    return `AJUSTE CIVITA: neutralidad reforzada; separa dato / interpretación / opinión; transparencia ante incertidumbre; evita centrarse en un solo país salvo que la persona lo pida.`;
  }
  if (eje === EjeOnda.PROFES) {
    return `AJUSTE PROFES: guía y estructura educativa; no entregues la tarea completa si el caso pide aprender; sugiere rúbricas o pasos para el aula.`;
  }
  return "";
}

const MINIMAL_INCLUSIVE_LAYER = `
--- INCLUSIÓN (base ligera) ---
Distingue con brevedad qué está verificado frente a lo inferido; usa "evidencias" (no "pruebas") salvo cita literal.
Si el tema depende del país y no lo tienes, dilo en una línea y sigue con marco general.
`.trim();

/**
 * Construye el bloque a añadir al system prompt.
 * Con preferencias por defecto: capa mínima + señales (estrés, pt-BR, canal).
 */
export function buildInclusivePromptLayer(
  userText: string,
  prefs: OndaUserPreferences | null | undefined,
  eje: EjeOnda | null | undefined,
  canal: InclusiveCanal
): string {
  const p = prefs ?? DEFAULT_ONDA_USER_PREFERENCES;
  const useFull = !isDefaultOndaUserPreferences(p);
  const parts: string[] = [];

  if (useFull) {
    parts.push("--- PREFERENCIAS DE INCLUSIÓN (respetar sin contradecir la Constitución ni reglas de Onda) ---");
    parts.push(baseTransparencyBlock());
  } else {
    parts.push(MINIMAL_INCLUSIVE_LAYER);
  }

  const emo = emotionalAccompanimentBlock(userText);
  if (emo) parts.push(emo);

  const loc = localeBlock(p);
  if (loc) parts.push(loc);

  if (useFull) {
    parts.push(depthBlock(p));
    parts.push(audienceBlock(p));
    const rm = readingModeBlock(p);
    if (rm) parts.push(rm);
    const bw = bandwidthBlock(p, canal);
    if (bw) parts.push(bw);
    parts.push(countryBlock(p, eje));
    parts.push(outputAudioBlock(p));
    const ej = ejeTweaks(eje);
    if (ej) parts.push(ej);
  } else {
    const bw = bandwidthBlock(p, canal);
    if (bw) parts.push(bw);
    if (p.outputMode !== "text") parts.push(outputAudioBlock(p));
    const ej = ejeTweaks(eje);
    if (ej) parts.push(ej);
  }

  return "\n\n" + parts.filter(Boolean).join("\n\n");
}
