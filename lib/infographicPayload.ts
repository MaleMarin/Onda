/**
 * Payload infografía + alt text accesible + parsing etiquetado (TITULO:, LO_IMPORTANTE:, …).
 * Sin HTML; texto del modelo recortado antes de parsear (límite seguridad).
 */

import type { EjeOnda } from "../content/types";

export const INFOGRAPHIC_MAX_MODEL_TEXT_CHARS = 9000;
export const INFOGRAPHIC_ALT_MAX_CHARS = 3500;
/** Recorte de alt enviado por WhatsApp antes de ofrecer continuar (rango operativo 1500–2000). */
export const INFOGRAPHIC_ALT_WHATSAPP_RESUMIR = 2000;

export type InfographicLocale = "pt" | "es";

export interface InfographicPayload {
  title: string;
  summaryBullets: string[];
  whyMatters: string[];
  nextSteps: string[];
  sources?: string[];
  /** Texto alternativo para accesibilidad (siempre rellenado al construir con buildInfographicPayloadFromModelText). */
  altText: string;
  locale?: InfographicLocale;
  /** Tipografía más grande y menos ítems (personas mayores / lectura fácil). */
  elderFriendly?: boolean;
}

export type BuildInfographicOptions = {
  locale?: InfographicLocale;
  elderFriendly?: boolean;
  eje?: EjeOnda | null;
};

const BULLET_REGEX = /^[\s]*[-*•]\s+/;
const NUMBERED_REGEX = /^[\s]*\d+[.)]\s+/;

function isBulletLine(line: string): boolean {
  const t = line.trim();
  return BULLET_REGEX.test(t) || NUMBERED_REGEX.test(t);
}

function stripBullet(line: string): string {
  return line.replace(BULLET_REGEX, "").replace(NUMBERED_REGEX, "").trim();
}

const MAX_WORDS_BULLET = 14;

function trimToMaxWords(s: string, maxWords: number): string {
  const parts = s.trim().split(/\s+/);
  if (parts.length <= maxWords) return s.trim();
  return parts.slice(0, maxWords).join(" ") + (s.trim().endsWith("…") ? "" : "…");
}

function sourceToShortLabel(raw: string): string {
  const t = raw.trim();
  const urlMatch = t.match(/https?:\/\/([^/?#]+)/i);
  if (urlMatch) {
    let domain = urlMatch[1].replace(/^www\./, "");
    const segs = domain.split(".").filter(Boolean);
    if (segs.length >= 2) domain = segs[segs.length - 2] ?? domain;
    return domain.length > 32 ? domain.slice(0, 29) + "…" : domain;
  }
  return t.slice(0, 36);
}

function normalizeTagKey(raw: string): string | null {
  const k = raw
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/\s+/g, "_");
  switch (k) {
    case "TITULO":
      return "title";
    case "LO_IMPORTANTE":
      return "important";
    case "O_ESSENCIAL":
    case "O_QUE_IMPORTA":
      return "important";
    case "POR_QUE_IMPORTA":
    case "PORQUE_IMPORTA":
      return "why";
    case "QUE_HACER_AHORA":
    case "O_QUE_FAZER_AGORA":
    case "O_QUE_FAZER":
    case "QUE_FAZER_AGORA":
      return "actions";
    case "FUENTES":
    case "FONTES":
      return "sources";
    default:
      return null;
  }
}

/**
 * Parsea bloques etiquetados (una línea con CLAVE: y líneas siguientes hasta otra clave).
 */
function parseTaggedSections(body: string): {
  title?: string;
  important: string[];
  why: string[];
  actions: string[];
  sources: string[];
} | null {
  const lines = body.split(/\r?\n/);
  let current: string | null = null;
  const acc: Record<string, string[]> = {
    title: [],
    important: [],
    why: [],
    actions: [],
    sources: [],
  };

  const tagLine =
    /^(TITULO|TÍTULO|LO_IMPORTANTE|O_ESSENCIAL|O_QUE_IMPORTA|POR_QUE_IMPORTA|POR_QUÉ_IMPORTA|QUE_HACER_AHORA|O_QUE_FAZER_AGORA|O_QUE_FAZER|QUE_FAZER_AGORA|FUENTES|FONTES)\s*:\s*(.*)$/i;

  for (const line of lines) {
    const m = line.match(tagLine);
    if (m) {
      const key = normalizeTagKey(m[1]);
      const rest = (m[2] ?? "").trim();
      if (key) {
        current = key;
        if (rest) {
          if (key === "title") acc.title.push(rest);
          else acc[key].push(rest);
        }
      }
      continue;
    }
    if (!current) continue;
    const t = line.trim();
    if (!t) continue;
    if (current === "title") acc.title.push(t);
    else acc[current].push(t);
  }

  const titleJoined = acc.title.join(" ").trim();
  const hasStructure =
    titleJoined.length > 0 ||
    acc.important.length > 0 ||
    acc.why.length > 0 ||
    acc.actions.length > 0;
  if (!hasStructure) return null;

  const pushBullets = (raw: string[], target: string[]) => {
    for (const ln of raw) {
      if (isBulletLine(ln)) target.push(trimToMaxWords(stripBullet(ln), MAX_WORDS_BULLET));
      else if (ln.length > 2) target.push(trimToMaxWords(ln, MAX_WORDS_BULLET));
    }
  };

  const important: string[] = [];
  const why: string[] = [];
  const actions: string[] = [];
  const sources: string[] = [];

  pushBullets(acc.important, important);
  pushBullets(acc.why, why);
  for (const ln of acc.actions) {
    if (isBulletLine(ln)) actions.push(trimToMaxWords(stripBullet(ln), MAX_WORDS_BULLET));
    else if (NUMBERED_REGEX.test(ln.trim())) actions.push(trimToMaxWords(stripBullet(ln), MAX_WORDS_BULLET));
    else if (ln.trim()) actions.push(trimToMaxWords(ln.trim(), MAX_WORDS_BULLET));
  }
  for (const ln of acc.sources) {
    const s = stripBullet(ln).replace(/^\d+[.)]\s*/, "").trim();
    if (s) sources.push(sourceToShortLabel(s));
  }

  return {
    title: titleJoined.slice(0, 120) || undefined,
    important,
    why,
    actions,
    sources,
  };
}

function extractInfographicHeuristic(text: string): Omit<InfographicPayload, "altText" | "locale" | "elderFriendly"> {
  const raw = (text || "").trim();
  if (!raw) {
    return {
      title: "Infografía ONDA",
      summaryBullets: [],
      whyMatters: [],
      nextSteps: [],
    };
  }

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const bullets: string[] = [];
  let title = "";
  const whyMatters: string[] = [];
  const nextSteps: string[] = [];
  const sources: string[] = [];

  let i = 0;
  if (lines.length > 0 && !isBulletLine(lines[0])) {
    title = lines[0].replace(/^\*\*|\*\*$/g, "").slice(0, 120);
    i = 1;
  }
  while (i < lines.length && bullets.length < 5) {
    const line = lines[i];
    if (isBulletLine(line)) {
      bullets.push(trimToMaxWords(stripBullet(line), MAX_WORDS_BULLET));
    } else if (/^(por qué importa|porque importa|qué importa|por qué es importante|por que importa)/i.test(line)) {
      i++;
      for (let j = 0; j < 3 && i + j < lines.length; j++) {
        if (isBulletLine(lines[i + j]))
          whyMatters.push(trimToMaxWords(stripBullet(lines[i + j]), MAX_WORDS_BULLET));
      }
      i += 3;
      continue;
    } else if (/^(qué hacer|cómo verificar|pasos|siguiente|qué hacer ahora|o que fazer)/i.test(line)) {
      i++;
      for (let j = 0; j < 4 && i + j < lines.length; j++) {
        if (isBulletLine(lines[i + j]))
          nextSteps.push(trimToMaxWords(stripBullet(lines[i + j]), MAX_WORDS_BULLET));
      }
      i += 4;
      continue;
    } else if (/^(fuentes|referencias|fontes|📚)/i.test(line)) {
      i++;
      for (let j = 0; j < 5 && i + j < lines.length && sources.length < 3; j++) {
        const ln = lines[i + j].trim();
        if (ln && (/\d+\./.test(ln) || /[-*•]/.test(ln) || /https?:\/\//i.test(ln))) {
          sources.push(sourceToShortLabel(ln.replace(/^\d+[.)]\s*/, "").replace(/^[-*•]\s*/, "")));
        }
      }
      i += 5;
      break;
    }
    i++;
  }

  if (!title && bullets.length > 0) title = bullets.shift()?.slice(0, 120) ?? "Infografía ONDA";
  if (!title) title = raw.slice(0, 80).split("\n")[0] || "Infografía ONDA";
  if (whyMatters.length === 0 && bullets.length > 1) {
    whyMatters.push(bullets[bullets.length - 1] ?? "Resumen del contenido.");
  }
  if (nextSteps.length === 0) {
    nextSteps.push("Revisar fuentes oficiales.", "Compartir con criterio.", "Profundizar con calma.");
  }

  return {
    title,
    summaryBullets: bullets.slice(0, 5),
    whyMatters: whyMatters.slice(0, 2),
    nextSteps: nextSteps.slice(0, 3),
    sources: sources.length ? sources.slice(0, 3) : undefined,
  };
}

export function buildInfographicAltText(p: Omit<InfographicPayload, "altText"> & { altText?: string }): string {
  const locale = p.locale ?? "es";
  const h =
    locale === "pt"
      ? {
          important: "O essencial",
          why: "Por que importa",
          actions: "O que fazer agora",
          sources: "Fontes",
        }
      : {
          important: "Lo importante",
          why: "Por qué importa",
          actions: "Qué hacer ahora",
          sources: "Fuentes",
        };

  const parts: string[] = [`Título: ${p.title}`];
  if (p.summaryBullets.length) {
    parts.push(`${h.important}: ${p.summaryBullets.join("; ")}`);
  }
  if (p.whyMatters.length) {
    parts.push(`${h.why}: ${p.whyMatters.join("; ")}`);
  }
  if (p.nextSteps.length) {
    parts.push(`${h.actions}: ${p.nextSteps.map((s, i) => `${i + 1}) ${s}`).join(" ")}`);
  }
  if (p.sources?.length) {
    parts.push(`${h.sources}: ${p.sources.join(", ")}`);
  }
  return parts.join("\n").slice(0, INFOGRAPHIC_ALT_MAX_CHARS);
}

export function truncateInfographicModelText(text: string): string {
  const t = (text || "").trim();
  if (t.length <= INFOGRAPHIC_MAX_MODEL_TEXT_CHARS) return t;
  return t.slice(0, INFOGRAPHIC_MAX_MODEL_TEXT_CHARS).trimEnd() + "\n…";
}

/**
 * Construye payload + altText. Prioriza secciones etiquetadas; si no hay, heurística.
 */
export function buildInfographicPayloadFromModelText(
  rawModelText: string,
  options?: BuildInfographicOptions
): InfographicPayload {
  const trimmed = truncateInfographicModelText(rawModelText);
  const locale: InfographicLocale = options?.locale ?? "es";
  const elderFriendly = options?.elderFriendly === true;

  const tagged = parseTaggedSections(trimmed);
  let base: Omit<InfographicPayload, "altText" | "locale" | "elderFriendly">;

  if (tagged && (tagged.important.length > 0 || tagged.actions.length > 0 || (tagged.title && tagged.title.length > 0))) {
    base = {
      title: tagged.title?.slice(0, 120) || "ONDA",
      summaryBullets: tagged.important.slice(0, elderFriendly ? 3 : 5),
      whyMatters: tagged.why.slice(0, elderFriendly ? 1 : 2),
      nextSteps: tagged.actions.length
        ? tagged.actions.slice(0, 3)
        : ["Verificar en fuente oficial.", "Ir con calma.", "Preguntar si duda."],
      sources: tagged.sources.length ? tagged.sources.slice(0, 3) : undefined,
    };
  } else {
    base = extractInfographicHeuristic(trimmed);
    if (elderFriendly) {
      base = {
        ...base,
        summaryBullets: base.summaryBullets.slice(0, 3),
        whyMatters: base.whyMatters.slice(0, 1),
        nextSteps: base.nextSteps.slice(0, 3),
      };
    }
  }

  const altText = buildInfographicAltText({ ...base, locale, elderFriendly });
  return {
    ...base,
    altText,
    locale,
    elderFriendly,
  };
}

/** Para WhatsApp: recorta alt muy largo y añade oferta de continuar. */
export function altTextForWhatsApp(alt: string, locale: InfographicLocale = "es"): { text: string; truncated: boolean } {
  if (alt.length <= INFOGRAPHIC_ALT_MAX_CHARS) return { text: alt, truncated: false };
  const cut = alt.slice(0, INFOGRAPHIC_ALT_WHATSAPP_RESUMIR).trimEnd();
  const tail =
    locale === "es"
      ? "…(texto alternativo resumido; si quieres el resto, escribe: más texto alt)"
      : "…(texto alternativo resumido; se quiser o restante, escreva: mais texto alt)";
  return {
    text: `${cut}\n\n${tail}`,
    truncated: true,
  };
}

/** Rótulo da mensagem que acompanha o PNG no WhatsApp (PT/ES). */
export function infographicAltWhatsAppPrefix(locale: InfographicLocale): string {
  return locale === "es" ? "Texto alternativo:\n" : "Descrição em texto (acessibilidade):\n";
}

/** Bloque visible en el stream web (mismo criterio de idioma que el PNG/alt). */
export function infographicStreamAltPrefix(locale: InfographicLocale): string {
  return locale === "es" ? "Texto alternativo:\n" : "Texto alternativo (acessibilidade):\n";
}

/** Alias del nombre pedido en especificaciones (misma firma que buildInfographicPayloadFromModelText). */
export const buildInfographicPayloadFromText = buildInfographicPayloadFromModelText;
