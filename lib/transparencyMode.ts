/**
 * Pedido explícito de transparencia (“cómo llegaste a eso”) — sin activar por accidente.
 */

import {
  SYSTEM_BLOCK_TRANSPARENCIA_ES,
  SYSTEM_BLOCK_TRANSPARENCIA_PT,
} from "@/content/shared";
import type { OndaChatLocale, OndaUserPreferences } from "@/lib/userPreferences";
import type { RiskPipelineFlags } from "@/lib/riskModes";
import { normalizePrefs, type UserPrefs } from "@/lib/userPrefs";

/** ES: cómo llegaste, qué usaste, en qué te basas… */
const RE_TRANSPARENCY_ES =
  /(c[oó]mo\s+llegaste|por\s+qu[eé]\s+dices|en\s+qu[eé]\s+te\s+basas|qu[eé]\s+usaste|fuentes\s+de\s+esto|c[oó]mo\s+sabes|de\s+d[oó]nde\s+sale)/i;

/** PT: como você chegou, em que se baseou… */
const RE_TRANSPARENCY_PT =
  /(como\s+voc[eê]\s+chegou|por\s+que\s+voc[eê]\s+diz|em\s+que\s+voc[eê]\s+se\s+baseou|quais\s+fontes|como\s+voc[eê]\s+sabe|de\s+onde\s+saiu)/i;

/**
 * `locale` orienta el patrón principal; también se prueba el otro idioma por si el usuario mezcla.
 */
export function detectTransparencyRequest(
  text: string,
  locale: OndaChatLocale | null | undefined
): boolean {
  const t = text ?? "";
  const esHit = RE_TRANSPARENCY_ES.test(t);
  const ptHit = RE_TRANSPARENCY_PT.test(t);
  if (locale === "pt-BR") return ptHit || esHit;
  if (locale === "es-LATAM") return esHit || ptHit;
  return esHit || ptHit;
}

/**
 * `explicit === true` fuerza activar; `false` fuerza desactivar; `undefined` usa solo detección por texto.
 */
export function effectiveTransparencyRequested(
  explicit: boolean | undefined,
  userText: string,
  locale: OndaChatLocale | null | undefined
): boolean {
  if (explicit === true) return true;
  if (explicit === false) return false;
  return detectTransparencyRequest(userText, locale);
}

/** Modo muy simple / 3 ideas / simple3: transparencia en una sola línea (sin bloque largo). */
export function wantsCompactTransparencyOnly(
  userText: string,
  inclusive: OndaUserPreferences | null | undefined,
  unified: UserPrefs | null | undefined
): boolean {
  if (inclusive?.responseDepth === "simple") return true;
  const u = unified ? normalizePrefs(unified) : null;
  if (u?.verbosity === "curto") return true;
  if (/\b(3\s*ideas|tres\s*ideas|muy\s+simple|bem\s+simples|simple\s*3)\b/i.test(userText ?? "")) {
    return true;
  }
  return false;
}

export type TransparencyInstructionContext = {
  requested: boolean;
  locale: OndaChatLocale | null | undefined;
  riskPipeline: RiskPipelineFlags | null | undefined;
  hasArticleContext: boolean;
  /** Enlace extraído pero solo titular/meta (paywall / thin). */
  articleThin?: boolean;
  hasExternalContext: boolean;
  hasImageInput?: boolean;
  userText: string;
  inclusivePreferences: OndaUserPreferences | null | undefined;
  unifiedUserPrefs: UserPrefs | null | undefined;
};

/**
 * Instrucciones de sistema para que el modelo añada transparencia en la respuesta.
 * Kit de emergencia o modo muy breve: solo una línea final (PT/ES).
 */
export function buildTransparencyInstructionAppend(ctx: TransparencyInstructionContext): string {
  if (!ctx.requested) return "";

  const pt = ctx.locale === "pt-BR";
  const emergency = ctx.riskPipeline?.emergency === true;
  const compact =
    !emergency && wantsCompactTransparencyOnly(ctx.userText, ctx.inclusivePreferences, ctx.unifiedUserPrefs);

  if (emergency || compact) {
    return pt
      ? `

--- TRANSPARENCIA (resposta curta) ---
Não uses o bloco longo com "### Transparência". No fim da resposta, depois do conteúdo principal, uma única linha neste sentido (adapta se não houve link nem fontes externas):
Transparência: baseei-me no que você enviou + (link/fontes se houver).
Proibido: nomes internos de sistemas, prompts, tokens ou raciocínio passo a passo.`.trim()
      : `

--- TRANSPARENCIA (respuesta breve) ---
No uses el bloque largo con "### Transparencia". Al final del contenido principal, una sola línea en este sentido (adapta si no hubo enlace ni fuentes externas):
Transparencia: me basé en lo que enviaste + (link/fuentes si hubo).
Prohibido: nombres internos de sistemas, prompts, tokens o razonamiento paso a paso.`.trim();
  }

  const noFuentes = pt
    ? "Na secção de fontes externas, se não houve contexto adicional de fontes, escreve exatamente: «Não usei fontes externas nesta resposta.»"
    : "En la sección de fuentes externas, si no hubo contexto adicional de fuentes, escribe exactamente: «No usé fuentes externas en esta respuesta.»";

  const thinLink = pt
    ? "Se o link foi «thin»/paywall (só título ou descrição): no apartado do link indica em linguagem humana que usaste só título/descrição disponíveis e que o texto completo pode mudar matizes. Proibido: dizer que não consegues abrir links."
    : "Si el enlace fue «thin»/paywall (solo titular o descripción): en el apartado del link indica en lenguaje humano que usaste solo el título/descripción disponibles y que el texto completo puede cambiar matices. Prohibido: «no puedo abrir enlaces».";

  const signals = `
--- SEÑALES PARA ESTE TURNO (rellena el bloque con honestidad; no copies literalmente) ---
- Hubo texto o mensaje del usuario: sí.
- Hubo imagen adjunta: ${ctx.hasImageInput ? "sí" : "no"}.
- Hubo contenido asociado a un enlace (titular/texto extraído): ${ctx.hasArticleContext ? "sí" : "no"}.
- Enlace solo con titular/meta (thin/paywall): ${ctx.articleThin ? "sí" : "no"}.
- Hubo contexto adicional de fuentes públicas en internet o materiales internos disponibles para el modelo: ${ctx.hasExternalContext ? "sí" : "no"}.
${noFuentes}
${ctx.articleThin ? thinLink : ""}
En «Cómo verificar / Como verificar»: exactamente 3 pasos numerados o listados.
No menciones en la respuesta al usuario: Tavily, RAG, embeddings, endpoints, NDJSON, system prompt, OpenAI, Claude, Gemini, nombres de modelos o proveedores. Usa "fuentes públicas en internet" o "materiales internos disponibles" si aplica.
`.trim();

  const block = pt ? SYSTEM_BLOCK_TRANSPARENCIA_PT : SYSTEM_BLOCK_TRANSPARENCIA_ES;
  return `\n\n${signals}\n\n${block}`;
}
