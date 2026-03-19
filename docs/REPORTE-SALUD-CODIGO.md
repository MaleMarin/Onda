# Reporte de Salud del Código — Auditoría Post-Cambios

**Fecha:** 2026-03-19  
**Alcance:** Rutas API, código muerto, terminología, errores y RAG tras Model Orchestrator, Tavily y Citado de Autoridad.

---

## 1. Eliminación de duplicidad (rutas API)

### Estado actual
- **`/api/chat/stream`** (NDJSON): usada por el front (`app/chat/page.tsx`). Incluye Model Orchestrator, `extractArticle`, `articleContext`, RAG + Tavily, timeout de contexto, fallback en stream.
- **`/api/chat`** (Vercel AI SDK): mismo body (message, image, audio, eje, history) pero devuelve `toDataStreamResponse()` (formato distinto a NDJSON). Usa `streamText`, `getRelevantContext`, `buildOndaSystemContent`, `getModelForEje`. Dependencias `ai` / `@ai-sdk/openai` han dado problemas de build (zod/v3, zod/v4).

### Recomendación
**Eliminar `app/api/chat/route.ts`** y mantener una sola ruta: **`/api/chat/stream`**.

**Motivos:**
1. El front solo llama a `/api/chat/stream`; `/api/chat` no tiene consumidor.
2. La ruta stream ya concentra la lógica deseada: orchestrator, evidencias web/RAG, modo noticia, fallback.
3. Unificar bajo AI SDK exigiría migrar el front al formato del SDK y resolver dependencias; es un trabajo aparte.
4. Menos rutas = menos superficie de mantenimiento y menos riesgo de divergencia.

**Acción:** Borrar `app/api/chat/route.ts`. Las exportaciones `buildOndaSystemContent`, `getModelForEje` y `ONDA_MAX_TOKENS` de `lib/ondaReply.ts` se mantienen: `getModelForEje` se usa en `getOndaReplyWithImage`; las otras quedan disponibles para una futura ruta con AI SDK si se decide.

---

## 2. Código muerto

### Tras eliminar `/api/chat`
- **Archivo completo eliminado:** `app/api/chat/route.ts` (único consumidor de `buildOndaSystemContent` en rutas; el resto de la app no lo usa).
- **Sin eliminar en `lib/ondaReply.ts`:** `buildOndaSystemContent`, `getModelForEje`, `ONDA_MAX_TOKENS` siguen exportados y/o usados por `getOndaReplyWithImage` y posible uso futuro.

### Resto del proyecto
- No se detectaron funciones, variables o importaciones huérfanas atribuibles al Orchestrator o a Tavily. La ruta stream y `lib/ondaReply.ts` usan las piezas actuales.

---

## 3. Consistencia de terminología (evidencias vs pruebas)

### Revisión
- **Prompts del sistema y comentarios en código:** Se usa “evidencias”, “Fuentes de Autoridad”, “contexto RAG/búsqueda”. No aparece “pruebas” en sentido de evidencias periodísticas en `lib/` ni en `content/shared.ts`.
- **Documentación (.md):** “prueba” y “probar” aparecen en sentido de *testing* o *número de prueba* (Meta/WhatsApp). No se cambian.
- **content/raw/ondaRaw.ts:** “Estudiantes prueban” = probar en sentido de intentar/usar; no evidencia. Sin cambio.

**Conclusión:** No hay cambios necesarios en código para rigor periodístico; la terminología ya es consistente con “evidencias”.

---

## 4. Manejo de errores

### console.log en producción
- **`app/api/chat/stream/route.ts`:** Los `console.log` de artículo están bajo `if (isDev)` → correcto.
- **`app/api/webhook/route.ts`:** Varios `console.log` sin guard (verificación webhook, body, mensajes, respuestas). En producción añaden ruido.
- **`scripts/ingestToFirestore.ts`**, **`lib/whatsapp.ts`**, **`src/index.ts`:** Uso de `console.log` aceptable para scripts y servidor legacy; opcional dejarlos solo en desarrollo.

**Acción recomendada:** En `app/api/webhook/route.ts`, envolver los `console.log` en `process.env.NODE_ENV === "development"` o sustituirlos por `console.info`/`console.error` solo donde aporten valor en producción.

### Mensajes al usuario
- **`/api/chat` (a eliminar):** “Probá con otro formato” → usar español neutro: “Puedes probar con otro formato”.
- **`/api/chat/stream`:** Mismo ajuste en mensajes de error (transcripción, imagen, conexión). 500 genérico: “No pude conectar. Revisa OPENAI_API_KEY” puede confundir al usuario; mejor: “Algo falló en el servidor. Intenta de nuevo en un momento.”

---

## 5. Optimización de RAG / extraContext entre sesiones

### Verificación
- En `app/api/chat/stream/route.ts`, `extraContext` se construye **por request** dentro del POST:
  - `webContextPromise`, `ragAndPrivatePromise`, `extraContextPromise` son variables locales.
  - No hay almacenamiento server-side por sesión ni caché global de contexto por usuario.
  - Cada petición usa su propio `message`, `history` y obtiene RAG + Tavily de nuevo.

**Conclusión:** El contexto se limpia de forma natural entre requests; no se mezclan evidencias de distintos usuarios. No se requieren cambios.

---

## Resumen de acciones de limpieza

| # | Acción | Motivo |
|---|--------|--------|
| 1 | Eliminar `app/api/chat/route.ts` | Unificar en una sola ruta; front solo usa stream; evitar duplicidad y problemas de build del AI SDK. |
| 2 | Mantener exportaciones en `ondaReply.ts` | `getModelForEje` usado en imagen; el resto útil para evolución futura. |
| 3 | No cambiar terminología en código | Ya se usa “evidencias” en prompts y comentarios. |
| 4 | En webhook: limitar `console.log` a desarrollo | Reducir ruido en producción. |
| 5 | Mensajes de error en español neutro y claros | “Puedes” en lugar de “Probá”; 500 sin mencionar OPENAI_API_KEY al usuario. |
| 6 | No tocar lógica de RAG/extraContext | Ya es por request; no hay mezcla entre usuarios. |

---

## Resultado esperado

- Una sola ruta de chat: **POST `/api/chat/stream`**.
- Menos superficie de mantenimiento y un único contrato (NDJSON) para el front.
- Logs de webhook controlados en producción.
- Mensajes de error coherentes y en español neutro.
- Sin riesgo de mezcla de evidencias entre usuarios.

---

## Limpieza aplicada (post-auditoría)

| Acción | Archivo(s) |
|--------|------------|
| Eliminada ruta duplicada | `app/api/chat/route.ts` (borrado) |
| Mensajes de error en español neutro y 500 genérico | `app/api/chat/stream/route.ts` |
| `console.log` solo en desarrollo en webhook | `app/api/webhook/route.ts` (constante `isDev`) |
| Mensajes al usuario en webhook en español neutro | `app/api/webhook/route.ts` |
| Documentación de la auditoría | `docs/REPORTE-SALUD-CODIGO.md` (este archivo) |
