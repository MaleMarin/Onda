import { EjeOnda } from "@/content/types";
import type { OndaChatLocale } from "@/lib/userPreferences";
import {
  SENSITIVE_OPENING_LINE_ES,
  SENSITIVE_OPENING_LINE_PT,
  SYSTEM_BLOCK_KIT_EMERGENCIA_ES,
  SYSTEM_BLOCK_KIT_EMERGENCIA_PT,
  SYSTEM_BLOCK_PANTALLAZO_DETECTIVE_ES,
  SYSTEM_BLOCK_PANTALLAZO_DETECTIVE_PT,
} from "@/content/shared";

/** Locale reducido para listas de palabras (PT vs ES). */
export type RiskLocale = "pt" | "es";

export type RiskPipelineFlags = {
  emergency: boolean;
  sensitive: boolean;
  pantallazoDetective: boolean;
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

function detectScamQuestion(text: string): boolean {
  const t = normText(text);
  return (
    /\b[eéh]\s+golpe\b|\bes\s+estafa\b|\bes\s+phishing\b|\bser[aá]\s+golpe\b|\bes\s+fraude\b/.test(t) ||
    /\b(eh|es)\s+un\s+tim(o|a)\b/.test(t)
  );
}

/**
 * Flags para inyectar bloques de sistema (emergencia, pantallazo detective, aviso sensible).
 * Pantallazo detective: eje A MANO y (imagen O intención pantallazo O señales de estafa).
 */
export function computeRiskPipelineFlags(
  text: string,
  hasImage: boolean,
  eje: EjeOnda | null | undefined,
  locale: OndaChatLocale | null | undefined
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
  return { emergency, sensitive, pantallazoDetective };
}

function localeIsPt(locale: OndaChatLocale | null | undefined): boolean {
  return locale === "pt-BR";
}

/** Fragmentos de system prompt derivados de `RiskPipelineFlags`. */
export function buildRiskSystemAppend(
  flags: RiskPipelineFlags | null | undefined,
  locale: OndaChatLocale | null | undefined
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
  return parts.join("\n\n");
}

export function riskPipelineSkipsCache(flags: RiskPipelineFlags | null | undefined): boolean {
  if (!flags) return false;
  return flags.emergency || flags.sensitive || flags.pantallazoDetective;
}
