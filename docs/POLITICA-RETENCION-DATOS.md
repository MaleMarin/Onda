# Política de retención de datos — Onda / Precisar

Documento orientado a cumplimiento de privacidad y transparencia. Onda es un asistente de **Fundación Precisar** (derechos digitales y pensamiento crítico).

## Qué datos se guardan

El módulo `lib/auditStore.ts` puede persistir en **Vercel KV** (Redis) si existen `KV_REST_API_URL` y `KV_REST_API_TOKEN`. Si no hay KV, los eventos solo se registran en consola del servidor (sin historial persistente centralizado).

| Tipo | Clave Redis (lista) | Contenido típico |
|------|---------------------|------------------|
| Uso / métricas | `onda:usage` | Eventos anónimos: `eje_select`, `message_sent`, `session_start`, `sessionId` opcional, tiempos de respuesta |
| Feedback | `onda:feedback` | Voto 👍/👎, `messageId`, `conversationId` opcional |
| Errores técnicos | `onda:errors` | Origen (`chat` / `whatsapp`), fragmentos de mensaje o error para depuración |
| Conversación (opcional) | `onda:conversations` | API `recordConversation`: extractos / `sessionId` si se integra en el futuro |

**Importante:** el contenido completo del chat web no se guarda en `auditStore` por defecto; la conversación vive principalmente en el dispositivo del usuario (p. ej. `localStorage`). Los mensajes pueden aparecer de forma parcial en registros de **error** si falla el flujo.

## Por cuánto tiempo

Cada registro nuevo incluye `expiresAt` (marca de tiempo en milisegundos, epoch). Tras esa fecha el registro **no debe usarse** en métricas y puede eliminarse con purga.

| Tipo de dato | TTL | Justificación |
|--------------|-----|----------------|
| Conversaciones (log en `onda:conversations`) | 90 días | Mínimo necesario para mejora continua, si se activa el registro |
| Feedback | 180 días | Valor analítico para satisfacción y mejora del producto |
| Errores técnicos | 30 días | Solo para depuración activa |
| Métricas de uso | 180 días | Reportes de impacto y uso de la fundación |

**Firestore:** en la versión actual del código, la auditoría **no** usa Firestore para estos listados. Si en el futuro se replica en Firestore, hay que:

1. Guardar el mismo campo `expiresAt` como **Timestamp**.
2. Configurar una **política TTL** en la colección apuntando a ese campo (Google Cloud / Firebase).
3. Tener en cuenta que **sin política TTL en la consola, Firestore no borra automáticamente** los documentos aunque el campo exista.

**Vercel KV (Redis LIST):** Redis no aplica caducidad por elemento dentro de una lista con `EXPIRE` sobre la clave entera sin borrar todo el histórico. Por eso:

- Cada ítem lleva `expiresAt` en el JSON.
- `getMetrics()` **ignora** ítems ya vencidos.
- La eliminación física de vencidos se hace con **`purgeExpiredRecords()`** o el endpoint `POST /api/admin/purge` con `{ "purgeExpired": true }`.

No equivale a `SET key value EX 90d` por registro; la retención está implementada a nivel de **dato** (campo + purga), no de clave Redis única por evento.

## Cómo se borra

- **Automático (lógico):** al calcular métricas, se excluyen registros con `expiresAt < now`.
- **Físico (KV):** ejecutar purga de vencidos (admin o tarea programada que llame a `purgeExpiredRecords`).
- **Manual (equipo):** `POST /api/admin/purge` con cabecera `Authorization: Bearer <ADMIN_SECRET>` y cuerpo `{ "purgeExpired": true }` o `{ "identifier": "..." }` (ver README técnico del endpoint en el código).
- **Por solicitud del titular:** escribir a **contacto@precisar.net** — respuesta orientativa en **5 días hábiles** (ajustar si la fundación publica otro canal oficial).

### Endpoint `/api/admin/purge`

- Variable de entorno **`ADMIN_SECRET`** obligatoria en el entorno donde se despliegue.
- **No** debe ser un endpoint público: usar **Vercel Access Controls**, autenticación adicional, red privada o similar en producción.

## Marco legal aplicable (referencia)

- **Chile:** Ley 19.628 sobre Protección de la Vida Privada.
- **México:** LFPDPPP (Ley Federal de Protección de Datos Personales en Posesión de los Particulares), incluyendo derechos de acceso, rectificación, cancelación y oposición / olvido según corresponda.

Este documento es informativo y no sustituye asesoría legal.

## Datos que NUNCA se guardan en este flujo de auditoría

- Contraseñas  
- Datos de tarjetas de pago  
- Documentos de identidad completos  

Si en el futuro se amplía el alcance del almacenamiento, actualizar esta política y los tipos en `auditStore`.
