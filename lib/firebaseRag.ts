/**
 * RAG con Firestore Vector Search: consulta documentos privados (embeddings_onda)
 * y devuelve el texto de los fragmentos más similares para inyectar en el prompt.
 */

import OpenAI from "openai";
import { getFirestoreForVector } from "./firebaseConfig";

const COLLECTION = "embeddings_onda";
const VECTOR_FIELD = "vector";
const EMBEDDING_MODEL = "text-embedding-3-small";
const TOP_K = 3;

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY no configurado");
    openai = new OpenAI({ apiKey: key });
  }
  return openai;
}

async function getQueryEmbedding(query: string): Promise<number[]> {
  const res = await getOpenAI().embeddings.create({
    model: EMBEDDING_MODEL,
    input: query.slice(0, 8000),
    encoding_format: "float",
  });
  const vec = res.data?.[0]?.embedding;
  if (!vec || !Array.isArray(vec)) throw new Error("Embedding vacío");
  return vec as number[];
}

/**
 * Busca en la colección embeddings_onda los fragmentos más similares a la consulta
 * y devuelve el texto combinado (para usar como extraContext en ondaReply).
 */
export async function searchPrivateDocs(query: string): Promise<string> {
  const q = query?.trim();
  if (!q) return "";

  const db = getFirestoreForVector();
  if (!db) return "";

  let queryVector: number[];
  try {
    queryVector = await getQueryEmbedding(q);
  } catch (e) {
    console.error("[firebaseRag] Error generando embedding:", e);
    return "";
  }

  const coll = db.collection(COLLECTION);
  const vectorQuery = coll.findNearest(VECTOR_FIELD, queryVector, {
    limit: TOP_K,
    distanceMeasure: "COSINE",
  });

  try {
    const snapshot = await vectorQuery.get();
    const docs = snapshot.docs ?? [];
    const texts = docs
      .map((doc: { data: () => Record<string, unknown> }) => {
        const data = doc.data();
        const text = data?.text;
        const source = (typeof data?.source === "string" ? data.source : data?.file) as string | undefined;
        const label = source ? ` [Fuente: ${source}]` : "";
        return typeof text === "string" && text.length > 0 ? text + label : "";
      })
      .filter((s: unknown): s is string => typeof s === "string" && s.length > 0);
    if (texts.length === 0) return "";
    return "Documentos Precisar (RAG — PDFs/informes):\n" + texts.join("\n\n---\n\n");
  } catch (e) {
    console.error("[firebaseRag] Error en findNearest (¿índice vectorial creado?):", e);
    return "";
  }
}
