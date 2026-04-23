# Escucha estructurada — Onda

## Qué es

Capa de producto para invitar, de forma breve y conversacional, a que la persona comparta **contexto opcional** (experiencia, duda persistente, corrección, caso similar, etc.). Esos textos se guardan como **contribuciones de comunidad** en **Firestore** (`onda_contributions`) para **revisión humana**. No se tratan como evidencias verificadas ni se inyectan solos en las respuestas del asistente ni en RAG productivo.

## Activar o desactivar invitaciones

- La decisión está centralizada en `lib/onda/contributions/shouldInviteContribution.ts` y el builder `lib/onda/contributions/web.ts` (`buildListeningInvitePayload`).
- El cliente web envía `alreadyInvitedInConversation: true` cuando en los últimos mensajes ya hubo una burbuja con `listeningInvite` (evita spam en la misma ventana de conversación).
- WhatsApp usa `contributionInviteContext` en la sesión KV (`src/lib/waSession.ts`): si hay invitación pendiente reciente, no se emite otra hasta que caduque (30 min), se consuma como aporte o se limpie.

## Flujo web

1. `POST /api/chat/stream` genera la respuesta habitual (NDJSON).
2. Si las heurísticas lo permiten, el servidor emite una línea extra: `{ "listeningInvite": { "show", "prompt", "turnToken", "userEcho", "assistantSummary", "topicHint", "locale", "suggestedContributionType?" } }` **antes** de `{ "done": true }`.
3. `lib/chatStreamClient.ts` captura `listeningInvite`. `ChatBubble` muestra `ContributionPrompt` (texto breve; **sin** formulario aparte).
4. El usuario puede responder en el **mismo input** del chat. Si el texto califica como seguimiento sustancial, el cliente envía `POST /api/onda-contributions` y marca la burbuja de usuario con `interpretedAsCommunityContribution`.
5. El servidor fuerza `sourceRisk: needs_review` y `reviewStatus: new`. `turnToken` evita duplicados por turno.

## Flujo WhatsApp

1. Tras la respuesta principal, si aplica, se envía un **segundo mensaje** con la invitación.
2. Se guarda `contributionInviteContext` en la sesión WA (KV).
3. En el siguiente mensaje de texto, si encaja la heurística (`looksLikeContributionFollowUp`, sin “pregunta nueva” evidente ni ack corto), se llama a `saveOndaContribution` y se limpia el contexto. Si no aplica, el mensaje sigue el flujo normal del bot.

## Panel interno

- Ruta canónica: `/admin/onda-contributions` (lista, filtros por canal/eje/estado/tipo/topic/urgencia/fecha) y `/admin/onda-contributions/[id]` (detalle y acciones).
- Redirección desde `/admin/onda-contribuciones` (configurada en `next.config.mjs`).
- Auth: misma cookie / `ADMIN_SECRET` que el resto del admin (`lib/adminAuth.ts`).
- APIs: `GET/PATCH /api/admin/onda-contributions` y `GET/PATCH /api/admin/onda-contributions/[id]`.

## Cómo revisar una contribución

1. Entrá al panel con usuario interno autorizado.
2. Filtrá por estado (`new`, `triaged`, `in_review`, …).
3. Abrí el detalle, leé pregunta eco, resumen de Onda y aporte.
4. Usá acciones rápidas o guardá notas/tags/topic. Solo humanos con acceso admin pueden cambiar estados.

## Métricas preparadas

Los documentos incluyen `statsBucketDay` y `statsBucketMonth` (UTC) para agregaciones futuras por día, eje, tipo, topic y estado de revisión.

## Variables de entorno

Requiere Firebase Admin configurado (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) como el resto del proyecto. Sin Firestore, `POST /api/onda-contributions` responde `503`.

## Tipos

Contrato principal: `lib/onda/contributions/types.ts` (`CommunityContribution`, `OndaContributionRecord`, `ListeningInviteStreamPayload`).
