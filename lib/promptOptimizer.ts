/**
 * Comprime el system prompt cuando supera un umbral de caracteres.
 * No altera el guard de seguridad inicial ni bloques de voz / WhatsApp explícitos.
 */

const MAX_CONTEXT_CHARS = 6000;

const TRUNC_MEMORIA = 300;
const TRUNC_ACTUALIDAD = 800;
const TRUNC_NOTICIA = 600;

const MARK_MEMORIA = "--- MEMORIA DE INTERACCIONES PREVIAS";
const MARK_ACTUALIDAD = "--- CONTEXTO_DE_ACTUALIDAD";
const MARK_NOTICIA = "--- MODO NOTICIA (enlace detectado)";

export interface OptimizationResult {
  prompt: string;
  originalChars: number;
  optimizedChars: number;
  wasOptimized: boolean;
}

/**
 * Estima tokens (~4 caracteres por token en español).
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Trunca respetando el último punto o, si no hay, el último espacio.
 */
export function truncateContext(text: string, maxChars: number): string {
  const t = (text ?? "").trim();
  if (t.length <= maxChars) return t;

  const slice = t.slice(0, maxChars);
  const lastDot = slice.lastIndexOf(". ");
  const cut = lastDot > maxChars * 0.5 ? lastDot + 1 : slice.lastIndexOf(" ");
  const base = cut > 0 ? slice.slice(0, cut) : slice;
  return `${base.trim()}...`;
}

function nextSectionBoundary(full: string, searchFrom: number): number {
  const rest = full.slice(searchFrom);
  const patterns = [
    /\n--- (?:CONTEXTO|MEMORIA|MODO|VOZ|Lista)/,
    /\n\n📱 FORMATO PARA WHATSAPP/,
    /\n\n📚 EL USUARIO PIDIÓ/,
    /\n\n--- CONTEXTO DE LA CONSULTA/,
  ];
  let min = full.length;
  for (const p of patterns) {
    const m = rest.match(p);
    if (m?.index != null) min = Math.min(min, searchFrom + m.index);
  }
  return min;
}

function truncateMarkedSection(
  prompt: string,
  marker: string,
  maxInnerChars: number
): { next: string; changed: boolean } {
  const idx = prompt.indexOf(marker);
  if (idx === -1) return { next: prompt, changed: false };

  const bodyStart = idx + marker.length;
  const bodyEnd = nextSectionBoundary(prompt, bodyStart);
  const body = prompt.slice(bodyStart, bodyEnd);
  const trimmed = body.trim();
  if (trimmed.length <= maxInnerChars) return { next: prompt, changed: false };

  const truncated = truncateContext(trimmed, maxInnerChars);
  const rebuilt = prompt.slice(0, bodyStart) + "\n" + truncated + "\n" + prompt.slice(bodyEnd);
  return { next: rebuilt, changed: true };
}

/**
 * Optimiza secciones de contexto largo (memoria, RAG/web, modo noticia).
 */
export function optimizeSystemPrompt(prompt: string): OptimizationResult {
  const originalChars = prompt.length;
  if (originalChars <= MAX_CONTEXT_CHARS) {
    return { prompt, originalChars, optimizedChars: originalChars, wasOptimized: false };
  }

  let p = prompt;
  let changed = false;

  let r = truncateMarkedSection(p, MARK_MEMORIA, TRUNC_MEMORIA);
  p = r.next;
  changed ||= r.changed;

  r = truncateMarkedSection(p, MARK_ACTUALIDAD, TRUNC_ACTUALIDAD);
  p = r.next;
  changed ||= r.changed;

  r = truncateMarkedSection(p, MARK_NOTICIA, TRUNC_NOTICIA);
  p = r.next;
  changed ||= r.changed;

  if (changed) {
    p = `${p.trimEnd()}\n\n[Contexto resumido por longitud]\n`;
  }

  const optimizedChars = p.length;
  return {
    prompt: p,
    originalChars,
    optimizedChars,
    wasOptimized: changed,
  };
}
