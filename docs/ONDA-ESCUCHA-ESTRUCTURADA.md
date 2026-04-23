# Escucha estructurada — Onda

## Qué es

Capa de producto para invitar, de forma breve y conversacional, a que la persona comparta **contexto opcional** (experiencia, duda persistente, corrección, caso similar, etc.). Esos textos se guardan como **contribuciones de comunidad** en **Firestore** (`onda_community_contributions`) para **revisión humana**. No se tratan como evidencias verificadas ni se inyectan solos en las respuestas del asistente.

## Flujo web

1. `POST /api/chat/stream` genera la respuesta habitual (NDJSON).
2. Si las heurísticas lo permiten, el servidor emite una línea extra: `{ "listeningInvite": { "show": true, "prompt", "turnToken", "userEcho", "assistantSummary", "topicHint", "locale" } }` **antes** de `{ "done": true }`.
3. El cliente (`lib/chatStreamClient.ts`) captura `listeningInvite` y la UI (`ListeningInviteForm` dentro de `ChatBubble`) muestra el texto de invitación y un formulario colapsable.
4. El envío va a `POST /api/community-contribution` (rate limit por IP). El servidor fuerza `sourceRisk: needs_review` y `reviewStatus: new`. `turnToken` evita duplicados por turno.

## Flujo WhatsApp

Tras enviar la respuesta principal (texto / medios), si aplica la misma heurística, Onda envía **un segundo mensaje** con el texto de invitación. La persona puede contestar en libre forma; **no** se parsea automáticamente en este MVP (el aporte formal sigue siendo vía web; en WA el equipo puede copiar manualmente desde conversación si se habilita flujo futuro).

## Panel interno

- Ruta: `/admin/onda-contribuciones` (lista y filtros) y `/admin/onda-contribuciones/[id]` (detalle y acciones).
- Auth: misma cookie / `ADMIN_SECRET` que el resto del admin (`lib/adminAuth.ts`).
- Acciones: cambiar `reviewStatus`, notas internas, `tags`, `topic`, `urgency`.

## Reglas de producto y seguridad

- Nada de lo que envía el público entra como **verdad** en el modelo de producción de forma automática.
- Solo el equipo, vía panel, puede marcar `verified` o `incorporated` (y aun así el uso en contenido vivo debe ser por **curaduría** explícita).
- Preparado para futuro dashboard de métricas (temas, dudas recurrentes) leyendo la misma colección.

## Variables de entorno

Requiere Firebase Admin configurado (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) como el resto del proyecto. Sin Firestore, `POST /api/community-contribution` responde `503`.

## Tipo de datos (`CommunityContribution`)

El contrato TypeScript vive en `lib/communityContributionTypes.ts` (`CommunityContribution`). Incluye `contributionType: … | "senal_comunitaria"` (ASCII, sin tilde en la clave). Los documentos antiguos con `señal_comunitaria` se normalizan al leer. El persistido en Firestore añade `turnToken` para dedupe (`CommunityContributionRecord`).
