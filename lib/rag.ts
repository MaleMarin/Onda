/**
 * RAG (Retrieval-Augmented Generation) para Onda.
 * Consulta una base vectorial con documentos de Precisar y devuelve contexto relevante para inyectar en el prompt.
 *
 * Sin base vectorial configurada, devuelve "".
 * Pasos para implementar: ver docs/RAG-Y-BUSQUEDA-WEB.md
 */

export async function getRagContext(query: string): Promise<string> {
  if (!query?.trim()) return "";
  // TODO: cuando exista Pinecone/Supabase Vector + embeddings de PDFs Precisar:
  // 1. Generar embedding de query (OpenAI embeddings o el que use la base).
  // 2. Consultar el índice vectorial (similitud coseno o ANN).
  // 3. Devolver los fragmentos más relevantes como texto para inyectar en el system prompt.
  return "";
}
