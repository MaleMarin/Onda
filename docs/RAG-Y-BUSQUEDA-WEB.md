# RAG y Búsqueda Web en Onda

## Estado actual

- **Búsqueda web:** Integrada. Si defines `TAVILY_API_KEY` o `SERPER_API_KEY` en Vercel, cada mensaje de texto (sin imagen) consulta la API y el resultado se inyecta como contexto extra en el prompt. Prioridad: Tavily > Serper. No hace falta cambiar código.
- **RAG (base vectorial):** El flujo en `lib/ondaReply.ts` y `app/api/chat/stream/route.ts` ya acepta contexto extra; `lib/rag.ts` existe pero devuelve `""` hasta que conectes una base vectorial.

---

## Pasos para implementar RAG (base de documentos Precisar)

### 1. Elegir base vectorial

- **Vercel KV** no es ideal para búsqueda por similitud (es clave-valor/listas). Mejor:
  - **Pinecone:** índice vectorial gestionado, buena documentación.
  - **Supabase Vector (pgvector):** si ya usas Supabase, añades una tabla con columna `embedding` y usas búsqueda por similitud.

### 2. Generar embeddings de tus documentos

- Sube los PDFs/documentos de Precisar a un almacenamiento (S3, Supabase Storage, o local para un script).
- Usa **OpenAI Embeddings** (`text-embedding-3-small` o `text-embedding-3-large`):
  - Endpoint: `POST https://api.openai.com/v1/embeddings`
  - Por cada fragmento de texto (p. ej. por página o por párrafo largo), llama a la API y obtén un vector (array de números).
- Inserta en tu índice:
  - **Pinecone:** `upsert` con `id`, `values` (embedding), `metadata` (título, fuente, fragmento de texto).
  - **Supabase:** fila con `content`, `embedding` (el array), `source`, etc.

### 3. Implementar `getRagContext` en `lib/rag.ts`

- Recibir `query: string`.
- Generar embedding de la query con la misma API y modelo que usaste para los documentos.
- Consultar el índice:
  - **Pinecone:** `query({ vector: queryEmbedding, topK: 5, includeMetadata: true })`.
  - **Supabase:** `match_documents` o `rpc` con búsqueda por similitud (cosine o L2) sobre la columna `embedding`.
- De los resultados, construir un único string: por ejemplo `[Título / Fuente]\nFragmento de texto\n` por cada hit.
- Devolver ese string (con un límite de caracteres, p. ej. 3000) para no inflar el prompt.

### 4. Variables de entorno

- **Pinecone:** `PINECONE_API_KEY`, `PINECONE_INDEX_NAME` (y opcionalmente `PINECONE_ENVIRONMENT` si aplica).
- **Supabase:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (o anon key si la tabla es pública) y el nombre de la tabla/función RPC.
- **OpenAI** (para embeddings): el mismo `OPENAI_API_KEY` que usa el chat.

### 5. Uso en el flujo actual

- El route `app/api/chat/stream/route.ts` ya llama a `getRagContext(message)` junto con `searchWeb(message)`.
- El resultado se concatena y se pasa como `extraContext` a `getOndaReplyStream` / `getOndaReplyWithImage` / `getOndaReply`.
- No hace falta tocar `lib/ondaReply.ts` más allá de lo ya implementado.

---

## Búsqueda web (Tavily / Serper)

- **Tavily:** Crear cuenta en [tavily.com](https://tavily.com), obtener API key y definir `TAVILY_API_KEY` en Vercel.
- **Serper:** Crear cuenta en [serper.dev](https://serper.dev), obtener API key y definir `SERPER_API_KEY` en Vercel.
- Si ambas están definidas, se usa Tavily. El resultado se formatea en `lib/searchWeb.ts` y se inyecta en el mismo bloque de “CONTEXTO ADICIONAL” que el RAG.

---

## Resumen de archivos

| Archivo | Rol |
|--------|-----|
| `lib/rag.ts` | Devuelve contexto RAG; aquí implementas la llamada a Pinecone/Supabase + embeddings. |
| `lib/searchWeb.ts` | Llama a Tavily o Serper y devuelve texto para el prompt. |
| `lib/ondaReply.ts` | Acepta `extraContext` opcional y lo añade al system prompt. |
| `app/api/chat/stream/route.ts` | Obtiene RAG + búsqueda web y pasa `extraContext` al stream. |
