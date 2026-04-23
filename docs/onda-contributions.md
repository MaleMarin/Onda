# Onda Contributions (escucha estructurada)

## Objetivo

Agregar un **segundo momento conversacional**: Onda responde y, cuando hay valor real, invita de forma breve a dejar un aporte opcional. Ese aporte se guarda para **revisión humana**. **Nunca** se incorpora automáticamente a respuestas ni a una fuente de verdad productiva.

## Colección Firestore

- **Colección**: `onda_contributions`
- **Reglas**:
  - `sourceRisk` entra siempre como `needs_review`
  - `reviewStatus` entra siempre como `new`
  - solo admin puede marcar `verified/incorporated/rejected`

## Schema (documento)

Campos principales:

- `createdAt`, `updatedAt`
- `channel`: `web | whatsapp`
- `eje`: `onda_a_mano | onda_civita | onda_profes`
- `conversationId`, `messageId`
- `userQuestion`, `assistantResponseSummary`
- `contributionText`, `contributionType`
- `topic`, `tags`, `sentiment`, `urgency`
- `sourceRisk`, `reviewStatus`, `internalNotes`, `reviewedBy`, `reviewedAt`
- `locale`, `optionalContactAllowed`
- `statsBucketDay`, `statsBucketMonth` (UTC)

Tipos en `lib/onda/contributions/types.ts`.

## Flujo web (stream)

1. `POST /api/chat/stream` responde NDJSON como siempre.
2. Al final del stream, el servidor puede emitir:

```json
{ "listeningInvite": { "show": true, "prompt": "...", "turnToken": "...", "userEcho": "...", "assistantSummary": "...", "topicHint": "...", "locale": "es-LATAM" } }
```

3. UI: se renderiza un prompt no intrusivo.
4. Si el usuario responde con texto sustancial, el cliente envía `POST /api/onda-contributions`.

## Flujo WhatsApp

1. Tras la respuesta principal, si aplica, se envía un segundo mensaje con la invitación.
2. Se guarda contexto en la sesión KV (`contributionInviteContext`).
3. El siguiente mensaje de texto puede persistirse como contribución (y se limpia el contexto), sin loops.

## Panel interno

- UI: `/admin/onda-contributions`
- API: `/api/admin/onda-contributions` y `/api/admin/onda-contributions/[id]`
- Protección: `verifyAdminAuth` (mismo patrón del admin actual).

## Activar/desactivar prompts de escucha

- Heurísticas: `lib/onda/contributions/shouldInviteContribution.ts`.
- Evitar spam: `alreadyInvitedInConversation` (web) y `contributionInviteContext` (WA).

## Qué NO hacer (gobernanza)

- No usar contribuciones como verdad automática.
- No exponer contribuciones internas a usuarios finales.
- No permitir cambios de estado sensibles fuera de rutas admin protegidas.

