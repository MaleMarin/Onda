import { EjeOnda } from "@/content/types";
import type { OndaChatLocale } from "@/lib/userPreferences";
import {
  SENSITIVE_OPENING_LINE_ES,
  SENSITIVE_OPENING_LINE_PT,
  SYSTEM_BLOCK_DISINFO_360_ES,
  SYSTEM_BLOCK_DISINFO_360_PT,
  SYSTEM_BLOCK_KIT_EMERGENCIA_ES,
  SYSTEM_BLOCK_KIT_EMERGENCIA_PT,
  SYSTEM_BLOCK_PANTALLAZO_DETECTIVE_ES,
  SYSTEM_BLOCK_PANTALLAZO_DETECTIVE_PT,
} from "@/content/shared";
import type { ConversationIntent } from "@/lib/intentClassifier";

/** Locale reducido para listas de palabras (PT vs ES). */
export type RiskLocale = "pt" | "es";

export type RiskPipelineFlags = {
  emergency: boolean;
  sensitive: boolean;
  pantallazoDetective: boolean;
  /** Modo Desinformación 360: rumor/cadena/titular/link dudoso/imagen-audio con afirmaciones, "¿es verdad?", "¿lo comparto?" */
  disinfo360: boolean;
};

function normText(text: string): string {
  return (text ?? "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

export function localeToRiskLocale(locale: OndaChatLocale | null | undefined): RiskLocale {
  return locale === "pt-BR" ? "pt" : "es";
}

/** Hack, robo de cuenta, estafa activa que requiere kit inmediato. */
export function detectEmergencyKeywords(text: string, locale: RiskLocale): boolean {
  const t = normText(text);
  if (locale === "pt") {
    return (
      /\bme\s+hacke(aram|ou)|hacke(aram|ou)\s+minha|invadiram\s+minha|roubaram\s+minha\s+conta|roubaram\s+meu\s+(celular|telefone)/.test(
        t
      ) ||
      /\bestafaram|me\s+estafaram|clonaram\s+(meu|minha)|furtaram\s+minha\s+conta/.test(t) ||
      (/\bnao\s+consigo\s+entrar|não\s+consigo\s+entrar|perdi\s+o\s+acesso\b/.test(t) &&
        /\b(conta|email|correio|whatsapp|zap|banco|pix)\b/.test(t)) ||
      /\bsequestraram\s+(whatsapp|zap|wpp|conta|instagram|insta)\b/.test(t) ||
      /\bconta\s+foi\s+hackead|whatsapp\s+hackead/.test(t)
    );
  }
  return (
    /\bme\s+hackearon|hackearon\s+mi|me\s+robaron\b|me\s+robaron\s+la\s+cuenta|me\s+estafaron|me\s+clonaron/.test(t) ||
    /\bme\s+robaron\s+el\s+(celular|tel[eé]fono|whatsapp)\b/.test(t) ||
    /\bperd[ií]\s+el\s+acceso|no\s+puedo\s+entrar\s+a\s+mi\s+cuenta/.test(t) ||
    /\bsecuestraron\s+(whatsapp|la\s+cuenta|instagram)\b/.test(t)
  );
}

/** Palabras que orientan a análisis de estafa / manipulación (texto). */
export function detectScamKeywords(text: string, locale: RiskLocale): boolean {
  const t = normText(text);
  const core =
    /\b(phishing|golpe|estafa|fraude|clonagem|clonacion|suplantaci[oó]n|engañ\w*|premio\s+falso|cuenta\s+bloquead)/.test(
      t
    ) ||
    /\blink\s+(raro|falso|sospechoso)|enlace\s+(raro|falso)|dom[ií]nio\s+raro/.test(t) ||
    /\b(pix|transferencia)\s+(fals\w+|clonad)/.test(t);
  if (locale === "pt") {
    return (
      core ||
      /\b(correios?|banco)\s+fals\w*|mensagem\s+suspeit|spam\s+do\s+banco/.test(t) ||
      /\b[eé]\s+golpe\b|\bser[aá]\s+fraude\b/.test(t)
    );
  }
  return (
    core ||
    /\b(correo|banco)\s+(falso|clonado)|mensaje\s+sospechos/.test(t) ||
    /\bes\s+estafa\b|\bes\s+phishing\b/.test(t)
  );
}

/** Usuario indica pantallazo / captura (texto). */
export function detectScreenshotIntent(text: string, locale: RiskLocale): boolean {
  const t = normText(text);
  void locale;
  return (
    /\b(print|screenshot|captura|pantallazo|pantalla|screen\s+shot|imagem\s+anex|foto\s+da\s+tela|foto\s+del\s+chat)\b/.test(
      t
    ) || /\bte\s+mando\s+(la\s+)?(foto|imagen|captura|print)\b/.test(t)
  );
}

/** Indicios de que el usuario pegó datos sensibles (avisar, no confiar). */
export function detectSensitiveData(text: string): boolean {
  const raw = text ?? "";
  const t = normText(raw);
  return (
    /\bcvv\b|\bcvc\b|\bcodigo\s+de\s+seguridad\s+de\s+la\s+tarjeta\b/.test(t) ||
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/.test(raw.replace(/\s/g, "")) ||
    /\b(2fa|mfa|otp)\b.*\b(codigo|code|c[oó]digo)\b/i.test(raw) ||
    /\b(mi|minha|meu)\s+(contraseña|senha|clave)\s+(es|é|eh)\s+\S+/i.test(raw) ||
    /\b(token|bearer)\s+[a-z0-9._-]{20,}/i.test(raw) ||
    /\bcpf\b|\brg\b|\bclave\s+de\s+cajero\b|\bdatos\s+bancarios\b|\bnumero\s+de\s+tarjeta\b/i.test(t) ||
    /\bchave\s+pix\b|\bconta\s+e\s+ag[eê]ncia\b/i.test(t)
  );
}

export function detectScamQuestion(text: string): boolean {
  const t = normText(text);
  return (
    /\b[eéh]\s+golpe\b|\bes\s+estafa\b|\bes\s+phishing\b|\bser[aá]\s+golpe\b|\bes\s+fraude\b/.test(t) ||
    /\b(eh|es)\s+un\s+tim(o|a)\b/.test(t)
  );
}

/**
 * Patrones de Desinformación 360: rumor/cadena/audio viral/titular/link dudoso/imagen con afirmación,
 * preguntas tipo "¿es verdad?", "¿lo comparto?", "sin fuente", "sin fecha".
 * No depende del eje; pueden venir en cualquier Onda.
 */
export function detectDisinfo360Patterns(text: string): boolean {
  const t = normText(text);
  return (
    /\bme\s+lleg(o|aron)\b|\bme\s+mandaron\b|\bme\s+pasaron\b/.test(t) ||
    /\bdicen\s+que\b|\bse\s+dice\s+que\b|\bdice(n)?\s+(que|por\s+ahi)\b/.test(t) ||
    /\bcadena(s)?\s+(de\s+)?(whatsapp|wpp|zap)?\b|\brumor(es)?\b/.test(t) ||
    /\bfake\s*news\b|\bnoticia\s+falsa\b|\bbulo(s)?\b|\bdesinformaci[oó]n\b/.test(t) ||
    /\bsin\s+fuente(s)?\b|\bsin\s+fecha\b|\bno\s+tiene\s+(fuente|fecha)\b/.test(t) ||
    /\b(es\s+)?verdad\s+o\s+mentira\b|\bes\s+manipulaci[oó]n\b/.test(t) ||
    /[¿\?]\s*es\s+verdad\b|[¿\?]\s*es\s+cierto\b|\bser[aá]\s+verdad\b/.test(t) ||
    /\blo\s+(comparto|reenv[ií]o)\b|\bla\s+(comparto|reenv[ií]o)\b/.test(t) ||
    /\btitular\s+dice\b|\baudio\s+(dice|familiar)\b|\bimagen\s+dice\b/.test(t) ||
    /\bme\s+dijeron\s+que\b|\bun\s+audio\s+(que\s+)?dice\b|\bun\s+mensaje\s+(que\s+)?dice\b/.test(t) ||
    /\breenviaron\b|\breenvi[eé]\b/.test(t)
  );
}

/**
 * Flags para inyectar bloques de sistema (emergencia, pantallazo detective, aviso sensible, disinfo 360).
 * Pantallazo detective: eje A MANO y (imagen O intención pantallazo O señales de estafa).
 * Disinfo 360: intent === "disinformation" | "fact_check" O patrones de rumor/cadena/etc. Activo
 * mientras no haya emergencia (en emergencia, kit prioritario).
 */
export function computeRiskPipelineFlags(
  text: string,
  hasImage: boolean,
  eje: EjeOnda | null | undefined,
  locale: OndaChatLocale | null | undefined,
  intent?: ConversationIntent | null
): RiskPipelineFlags {
  const rl = localeToRiskLocale(locale);
  const emergency = detectEmergencyKeywords(text, rl);
  const sensitive = detectSensitiveData(text);
  const scamQ = detectScamQuestion(text);
  const scamKw = detectScamKeywords(text, rl);
  const shot = detectScreenshotIntent(text, rl);
  const pantallazoDetective =
    !emergency &&
    eje === EjeOnda.A_MANO &&
    (hasImage || scamQ || scamKw || shot);
  const disinfoByIntent = intent === "disinformation" || intent === "fact_check";
  const disinfoByPattern = detectDisinfo360Patterns(text);
  const disinfo360 = !emergency && (disinfoByIntent || disinfoByPattern);
  return { emergency, sensitive, pantallazoDetective, disinfo360 };
}

function localeIsPt(locale: OndaChatLocale | null | undefined): boolean {
  return locale === "pt-BR";
}

/**
 * Contexto adicional para construir el append. `hasExternalContext` permite que el bloque
 * Desinformación 360 inyecte un recordatorio explícito de no inventar fuentes cuando no
 * hay CONTEXTO_DE_ACTUALIDAD / searchWeb / RAG inyectado.
 */
export type BuildRiskAppendOptions = {
  hasExternalContext?: boolean;
};

/**
 * Encabezado de PRIORIDAD para el bloque Desinformación 360. Se inyecta antes del bloque
 * obligatorio para que el modelo entienda que el formato de 3 párrafos en prosa reemplaza
 * cualquier otro formato sugerido anteriormente.
 */
const DISINFO_360_PRIORITY_HEADER_ES = `\n\n--- PRIORIDAD ABSOLUTA: MODO_DESINFORMACION_360 (overrides) ---
Cuando este modo está activo, el formato de MÁXIMO 3 párrafos en prosa que sigue REEMPLAZA cualquier otro formato sugerido anteriormente (formato 60 segundos, estructura noticia, formato unificado, recomendaciones de enlaces obligatorios, citado de autoridad, estructura numerada de análisis, etc.).

INSTRUCCIÓN DE PRIORIDAD: Si este bloque está presente, responde en máximo 3 párrafos cortos, sin listas, sin numeración y sin títulos de sección. No uses el formato general de 60 segundos ni ninguna estructura de 9 secciones.\n`;

const DISINFO_360_PRIORITY_HEADER_PT = `\n\n--- PRIORIDADE ABSOLUTA: MODO_DESINFORMACAO_360 (overrides) ---
Quando este modo está ativo, o formato de NO MÁXIMO 3 parágrafos em prosa a seguir SUBSTITUI qualquer outro formato sugerido anteriormente (formato 60 segundos, estrutura notícia, formato unificado, recomendações de links obrigatórios, citação de autoridade, estrutura numerada de análise, etc.).

INSTRUÇÃO DE PRIORIDADE: Se este bloco estiver presente, responde em no máximo 3 parágrafos curtos, sem listas, sem numeração e sem títulos de seção. Não uses o formato geral de 60 segundos nem nenhuma estrutura de 9 seções.\n`;

/**
 * Recordatorio explícito que se inyecta junto al bloque Desinformación 360 cuando NO hay
 * fuentes externas inyectadas (sin CONTEXTO_DE_ACTUALIDAD / searchWeb / RAG). Refuerza la
 * regla de no inventar fuentes ni listar medios como si hubieran sido consultados.
 */
const DISINFO_360_NO_EXTERNAL_ES = `\n\n--- NOTA OBLIGATORIA: SIN EVIDENCIA EXTERNA INYECTADA ---
No hay CONTEXTO_DE_ACTUALIDAD, ni resultados de búsqueda web, ni RAG disponibles para esta consulta.
Por lo tanto, en este turno:
- Dentro del párrafo 2 DEBES decir explícitamente, con estas palabras o equivalentes muy cercanas: "No tengo evidencia externa disponible en este momento; puedo ayudarte a revisar señales y qué fuentes consultar."
- PROHIBIDO citar BBC, Reuters, OMS, CDC, INE, Chequeado, CIPER, AFP, AP, Maldita, Salud con Lupa u otros medios u organismos como si hubieran sido consultados.
- PROHIBIDO listar nombres de fuentes con enlaces como si fueran fuentes revisadas.
- Está permitido decir, en lenguaje claro, "fuentes que convendría consultar" (sin enlaces inventados), dejando claro que NO fueron consultadas en esta respuesta.
- NO incluyas la sección "### 📚 Fuentes de Autoridad" ni números [1], [2], [3] como si hubieras citado fuentes.\n`;

const DISINFO_360_NO_EXTERNAL_PT = `\n\n--- NOTA OBRIGATÓRIA: SEM EVIDÊNCIA EXTERNA INJETADA ---
Não há CONTEXTO_DE_ACTUALIDAD, nem resultados de busca web, nem RAG disponíveis para esta consulta.
Portanto, neste turno:
- Dentro do parágrafo 2 DEVES dizer explicitamente, com estas palavras ou equivalentes muito próximas: "Não tenho evidência externa disponível neste momento; posso te ajudar a revisar sinais e que fontes consultar."
- PROIBIDO citar BBC, Reuters, OMS, CDC, INE, Chequeado, CIPER, AFP, AP, Maldita, Salud con Lupa ou outros meios/organismos como se tivessem sido consultados.
- PROIBIDO listar nomes de fontes com links como se fossem fontes revisadas.
- É permitido dizer, em linguagem clara, "fontes que conviria consultar" (sem links inventados), deixando claro que NÃO foram consultadas nesta resposta.
- NÃO incluas a seção "### 📚 Fontes de Autoridade" nem números [1], [2], [3] como se tivesses citado fontes.\n`;

/** Fragmentos de system prompt derivados de `RiskPipelineFlags`. */
export function buildRiskSystemAppend(
  flags: RiskPipelineFlags | null | undefined,
  locale: OndaChatLocale | null | undefined,
  options?: BuildRiskAppendOptions
): string {
  if (!flags) return "";
  const pt = localeIsPt(locale);
  const parts: string[] = [];
  if (flags.sensitive) {
    const line = pt ? SENSITIVE_OPENING_LINE_PT : SENSITIVE_OPENING_LINE_ES;
    parts.push(
      pt
        ? `\n\n--- ALERTA_DE_PRIVACIDADE (obrigatório) ---\nO primeiro parágrafo da tua resposta DEVE começar com esta frase (ou equivalente muito próxima):\n"${line}"\nDepois continua com o resto da resposta.\n`
        : `\n\n--- ALERTA_DE_PRIVACIDAD (obligatorio) ---\nEl primer párrafo de tu respuesta DEBE empezar con esta frase (o equivalente muy cercana):\n"${line}"\nLuego continúa con el resto.\n`
    );
  }
  if (flags.emergency) {
    parts.push(pt ? SYSTEM_BLOCK_KIT_EMERGENCIA_PT : SYSTEM_BLOCK_KIT_EMERGENCIA_ES);
  }
  if (flags.pantallazoDetective) {
    parts.push(pt ? SYSTEM_BLOCK_PANTALLAZO_DETECTIVE_PT : SYSTEM_BLOCK_PANTALLAZO_DETECTIVE_ES);
  }
  if (flags.disinfo360) {
    const header = pt ? DISINFO_360_PRIORITY_HEADER_PT : DISINFO_360_PRIORITY_HEADER_ES;
    const block = pt ? SYSTEM_BLOCK_DISINFO_360_PT : SYSTEM_BLOCK_DISINFO_360_ES;
    const noExternal = options?.hasExternalContext === false
      ? (pt ? DISINFO_360_NO_EXTERNAL_PT : DISINFO_360_NO_EXTERNAL_ES)
      : "";
    parts.push(`${header}\n${block}${noExternal}`);
  }
  return parts.join("\n\n");
}

export function riskPipelineSkipsCache(flags: RiskPipelineFlags | null | undefined): boolean {
  if (!flags) return false;
  return flags.emergency || flags.sensitive || flags.pantallazoDetective || flags.disinfo360;
}
