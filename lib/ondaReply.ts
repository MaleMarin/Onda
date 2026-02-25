import OpenAI from "openai";
import { EjeOnda } from "../content/types";
import { EJE_PROMPTS, FUENTES_ONDA_PARA_RESPUESTA } from "../content/shared";
import {
  RAW_A_MANO_FULL,
  RAW_CIVITA_FULL,
  RAW_PROFES_FULL,
} from "../content/raw/ondaRaw";

function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Missing credentials. Please set the OPENAI_API_KEY environment variable.");
  return new OpenAI({ apiKey: key });
}

const SYSTEM_PROMPT_FUSIONADO = `
🛑 REGLA SUPREMA (GROUNDING):
Tu conocimiento base es tu única fuente de verdad para definiciones y protocolos de seguridad (phishing, deepfakes, acoso, etc.). Si la información no está en tu base, di: "No tengo esa información específica en mis registros oficiales, pero puedo ayudarte a buscar fuentes confiables." (NO inventes).

🛑 PROCESO: Analiza el requerimiento → consulta hechos relevantes → sintetiza con tono cercano y sin tecnicismos → entrega la respuesta.

Eres Onda, el Asistente de IA del proyecto Precisar (www.precisar.net). Tu misión es empoderar a las personas para que naveguen el mundo digital con pensamiento crítico y sin miedo.

🏛️ MARCO ÉTICO: Derechos Humanos y Derechos Digitales. Cero violencia, odio o discriminación. Neutralidad: no emitas opiniones sobre política, religión o ideologías. Respeto absoluto. Privacidad como derecho fundamental.

🗣️ LENGUAJE: Neutralidad de género ("te damos la bienvenida", "¿Empezamos?"). Español neutro para América Latina, cercano, comprensible. Si usas un término en inglés, explícalo. Negritas para lo importante. Párrafos cortos.

😊 PERSONALIDAD: Fresco y empoderador. Coach, no solo fact-checker: enseña a la persona a identificar por qué algo puede ser engañoso. Humano al centro: la IA es herramienta, la persona tiene el criterio final. Paciente y empático.

🛠️ CAPACIDADES: Analizar noticias, mensajes, cadenas (texto, audio, imágenes, links). Explicar en simple. Enseñar uso de IA y prompts. Activar kits de emergencia cuando corresponda. Sugerir desconexión digital sin moralizar. Fomentar pensamiento crítico.

📚 FUENTE DE VERDAD: Basa tus explicaciones en tu base de conocimiento. Si no sabes algo, dilo y ofrece ayudar a buscar fuentes confiables.

Actúas según el eje (A_MANO, CIVITA, PROFES). Si no entiendes, saluda y ofrece las 3 Ondas: 🟡 Onda a Mano, 🟣 Onda Civita, 🟢 Onda Profes.

📤 FORMATO DE RESPUESTA (en las 3 Ondas): Si el usuario pide la respuesta en voz/audio, al final de tu respuesta añade exactamente [ONDA_FORMATO:audio]. Si pide imagen o infografía y tienes una guía que encaje (estafa, phishing, deepfake, criterio, instituciones, derechos, actividad), añade al final [ONDA_GUIA:nombre], por ejemplo [ONDA_GUIA:estafa]. El texto que escribas se mostrará igual; el sistema usará esos marcadores para enviar además audio o la imagen de la guía.

--- ONDA A MANO ---
${RAW_A_MANO_FULL}

--- ONDA CIVITA ---
${RAW_CIVITA_FULL}

--- ONDA PROFES ---
${RAW_PROFES_FULL}
`;

/** Historial para la API: solo role y content. role "model" se mapea a "assistant" en OpenAI. */
export type HistoryEntry = { role: "user" | "model"; content: string };

/** Contexto de artículo extraído (modo noticia). Si thin, solo tenemos titular/meta. */
export type ArticleContext = {
  text: string;
  thin: boolean;
  host: string;
  url?: string;
  meta: { title: string; description: string };
};

/** Construye newsContext: si hay texto del artículo lo usamos; si no, título + descripción + host + URL. */
function buildNewsContext(ctx: ArticleContext): string {
  if (ctx.text && ctx.text.trim().length > 0) {
    return ctx.text;
  }
  const parts = [
    ctx.meta.title ? `Titular: ${ctx.meta.title}` : "",
    ctx.meta.description ? `Descripción: ${ctx.meta.description}` : "",
    `Fuente (host): ${ctx.host}`,
    ctx.url ? `URL: ${ctx.url}` : "",
  ].filter(Boolean);
  return parts.join("\n");
}

const FALLBACK_PAYWALL =
  "No pude acceder al texto completo del enlace (posible paywall). Si pegas el primer párrafo, lo explico mejor. Mientras tanto, aquí va una explicación basada en el título/descripción disponibles.";

const NOTICIA_SYSTEM_BLOCK = (ctx: ArticleContext) => {
  const newsContext = buildNewsContext(ctx);
  const isThin = ctx.thin || !ctx.text?.trim();
  return `
--- MODO NOTICIA (enlace detectado) ---
El backend YA extrajo contenido del enlace. Lo que ves abajo en "CONTENIDO DISPONIBLE" es todo lo que tienes. Responde SIEMPRE usando eso.

PROHIBIDO decir: "no tengo acceso directo a enlaces", "no puedo abrir el artículo", "no puedo leer enlaces de contenido externo" o similar. El sistema SÍ puede hacer fetch; si hay poco texto es paywall/403, no falta de capacidad.

Actúas como ONDA, explicas noticias de forma neutral y pedagógica.
Si hay texto del artículo, resume SOLO ese texto.
Si el artículo no se pudo leer completo (solo titular/descripción), usa SOLO título/descripcion/host disponibles y explícitalo. No inventes detalles.
Prohibido inventar datos. Prohibido opinar políticamente.
NUNCA respondas "no tengo info en registros oficiales" ni frases similares.

Formato de tu respuesta:
1) En una frase: de qué trata
2) Lo importante (3-5 bullets)
3) Por qué importa (2 bullets)
4) Qué falta por confirmar (2 bullets)
5) Cómo verificar rápido (3 pasos).
${isThin ? `\nSi el contenido disponible es solo titular/descripción, termina tu respuesta con exactamente este párrafo:\n"${FALLBACK_PAYWALL}"` : ""}

CONTENIDO DISPONIBLE DEL ARTÍCULO (usa SOLO esto, no inventes):
${newsContext}
`;
};

const MAX_HISTORY_MESSAGES = 20; // últimos N mensajes para no exceder contexto

/**
 * Obtiene la respuesta de ONDA para un mensaje de usuario (lógica central reutilizable).
 * Si se pasa eje, el modelo prioriza ese contexto. Si se pasa history, el modelo ve la conversación anterior.
 * Si includeSourcesList es true (p. ej. el usuario pidió "fuentes"), el modelo recibe la lista oficial y debe incluirla en la respuesta.
 */
export async function getOndaReply(
  userText: string,
  eje?: EjeOnda | null,
  history?: HistoryEntry[] | null,
  includeSourcesList?: boolean,
  articleContext?: ArticleContext | null
): Promise<string> {
  const openai = getOpenAI();
  const ejeContext =
    eje != null ? `\n--- CONTEXTO ACTUAL (responde en este marco) ---\n${EJE_PROMPTS[eje]}\n` : "";
  const sourcesBlock =
    includeSourcesList === true
      ? `\n\n📚 EL USUARIO PIDIÓ FUENTES. Incluí al final de tu respuesta una sección "Fuentes" o "Referencias" con las que apliquen al tema, usando SOLO esta lista oficial ONDA (nombre + URL):\n${FUENTES_ONDA_PARA_RESPUESTA}\nSi no pidió fuentes, no incluyas esta sección.\n`
      : "";
  const noticiaBlock = articleContext != null ? NOTICIA_SYSTEM_BLOCK(articleContext) : "";
  const systemContent = SYSTEM_PROMPT_FUSIONADO + ejeContext + sourcesBlock + noticiaBlock;

  const historySlice = (history ?? []).slice(-MAX_HISTORY_MESSAGES);
  const historyForApi: Array<{ role: "user" | "assistant"; content: string }> = historySlice.map(
    (m) => ({
      role: m.role === "model" ? "assistant" : "user",
      content: m.content,
    })
  );

  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: systemContent },
      ...historyForApi,
      { role: "user", content: userText },
    ],
    model: "gpt-4o-mini",
  });

  return (
    completion.choices[0].message.content ||
    "Ups, no tengo una respuesta en este momento."
  );
}

/**
 * Igual que getOndaReply pero en streaming: va generando la respuesta por chunks.
 * Si includeSourcesList es true, el modelo incluye la sección de fuentes cuando el usuario la pidió.
 * Si articleContext está presente (modo noticia), se inyecta contenido del enlace e instrucciones de neutralidad.
 */
export async function* getOndaReplyStream(
  userText: string,
  eje?: EjeOnda | null,
  history?: HistoryEntry[] | null,
  includeSourcesList?: boolean,
  articleContext?: ArticleContext | null
): AsyncGenerator<string, void, unknown> {
  const openai = getOpenAI();
  const ejeContext =
    eje != null ? `\n--- CONTEXTO ACTUAL (responde en este marco) ---\n${EJE_PROMPTS[eje]}\n` : "";
  const sourcesBlock =
    includeSourcesList === true
      ? `\n\n📚 EL USUARIO PIDIÓ FUENTES. Incluí al final de tu respuesta una sección "Fuentes" o "Referencias" con las que apliquen al tema, usando SOLO esta lista oficial ONDA (nombre + URL):\n${FUENTES_ONDA_PARA_RESPUESTA}\n`
      : "";
  const noticiaBlock = articleContext != null ? NOTICIA_SYSTEM_BLOCK(articleContext) : "";
  const systemContent = SYSTEM_PROMPT_FUSIONADO + ejeContext + sourcesBlock + noticiaBlock;

  const historySlice = (history ?? []).slice(-MAX_HISTORY_MESSAGES);
  const historyForApi: Array<{ role: "user" | "assistant"; content: string }> = historySlice.map(
    (m) => ({
      role: m.role === "model" ? "assistant" : "user",
      content: m.content,
    })
  );

  const stream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemContent },
      ...historyForApi,
      { role: "user", content: userText },
    ],
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (typeof delta === "string" && delta.length > 0) yield delta;
  }
}

/**
 * Respuesta ONDA cuando el usuario envía imagen (y opcional texto). Usa OpenAI GPT-4o-mini (visión).
 * Si includeSourcesList es true, el modelo incluye la sección de fuentes al final.
 */
export async function getOndaReplyWithImage(
  userText: string,
  imageDataUrl: string,
  eje: EjeOnda | null,
  history?: HistoryEntry[] | null,
  includeSourcesList?: boolean
): Promise<string> {
  const openai = getOpenAI();
  const ejeContext =
    eje != null ? `\n--- CONTEXTO ACTUAL (responde en este marco) ---\n${EJE_PROMPTS[eje]}\n` : "";
  const sourcesBlock =
    includeSourcesList === true
      ? `\n\n📚 EL USUARIO PIDIÓ FUENTES. Incluí al final de tu respuesta una sección "Fuentes" o "Referencias" con las que apliquen al tema, usando SOLO esta lista oficial ONDA (nombre + URL):\n${FUENTES_ONDA_PARA_RESPUESTA}\n`
      : "";
  const systemContent = SYSTEM_PROMPT_FUSIONADO + ejeContext + sourcesBlock;

  const historySlice = (history ?? []).slice(-MAX_HISTORY_MESSAGES);
  const historyForApi: Array<{ role: "user" | "assistant"; content: string }> = historySlice.map(
    (m) => ({
      role: m.role === "model" ? "assistant" : "user",
      content: m.content,
    })
  );

  const userContent: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [];
  if (imageDataUrl) {
    userContent.push({ type: "image_url", image_url: { url: imageDataUrl } });
  }
  userContent.push({ type: "text", text: userText || "¿Qué ves en esta imagen? Responde según ONDA." });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemContent },
      ...historyForApi,
      { role: "user", content: userContent },
    ],
  });

  return (
    completion.choices[0].message.content ||
    "Ups, no tengo una respuesta en este momento."
  );
}
