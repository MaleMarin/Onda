# Cómo funciona el código de ONDA (ondabot) — Flujo completo

Documentación de entradas, flujos y archivos clave del proyecto Next.js 14 (App Router).

---

## 1) ENTRADAS

### Chat web
- **Ruta:** `/chat`
- **Componente principal:** `app/chat/page.tsx` — `ChatPage` (client component).
- El usuario puede llegar desde la home (`app/page.tsx`) mediante el enlace "Abrir chat ONDA" que apunta a `/chat`, o entrando directamente a `/chat`. Opcional: `?embed=1` para modo embebido (layout más compacto).

### WhatsApp
- **Webhook:** `POST /api/webhook` y `GET /api/webhook` (verificación).
- **Archivo:** `app/api/webhook/route.ts`.
- Meta envía los mensajes a esta URL; GET se usa solo para la verificación al configurar el webhook en Meta.

---

## 2) FLUJO CHAT WEB (desde /chat hasta recibir respuesta)

### Componentes que intervienen
- **ChatPage** (`app/chat/page.tsx`): estado, formulario, llamada a la API y lectura del stream.
- **ChatBubble** (`app/chat/components/ChatBubble.tsx`): render de cada mensaje (texto, negritas, imagen adjunta, guía, botón TTS).
- **EjeSelector** (`app/chat/components/EjeSelector.tsx`): tabs para cambiar de Onda (A Mano, Civita, Profes).

### Estado relevante
- **mensajes** (`messages`): array de `Message` (id, role, content, timestamp, image?, audio?, guideId?, isGenerated?).
- **eje actual** (`currentEje`): `EjeOnda | null` (A_MANO, CIVITA, PROFES). Si es `null`, se muestra el selector de Ondas.
- **menú** (`showMenu`, `showIASubmenu`): si se muestra el menú de opciones del eje o el submenú de IA (solo en A Mano).
- Además: `input`, `attachmentImage`, `attachmentAudio`, `recording`, `loading`, `showPickOndaNotice`, `justSwitchedEje`, `embed`.

### Orden típico de interacción

1. **Entrada a /chat**  
   El usuario ve el mensaje de bienvenida (`MAIN_WELCOME`) y, si aún no eligió Onda, los botones para elegir Onda (A Mano, Civita, Profes).

2. **Elegir Onda — `pickEje(eje)`**  
   - Se llama al hacer clic en una Onda (o desde `EjeSelector` con `confirmEjeSwitch`).  
   - Hace: `setShowPickOndaNotice(false)`, `confirmEjeSwitch(eje)` (pone `currentEje` y `justSwitchedEje` un rato), `setShowMenu(true)`, `setShowIASubmenu(false)`.

3. **Menú — `handleMenuOption(optionId, label, intro, isSubmenu?)`**  
   - Si `isSubmenu === true`: abre submenú IA (`setShowIASubmenu(true)`) y agrega un mensaje del bot con `intro`.  
   - Si no: cierra menú (`setShowMenu(false)`), agrega mensaje de usuario con `label` y mensaje del bot con `intro` (o mensaje especial para A_M1 "link/noticia"). No llama a la API; solo actualiza `messages`.

4. **Enviar mensaje — `handleSend(e)`**  
   - Valida que haya contenido (texto y/o imagen y/o audio) y que no esté `loading`.  
   - Si `currentEje === null` → muestra aviso "Elegí primero una Onda" y retorna.  
   - Limpia input y adjuntos, arma `history` desde `messages` (solo role + content).  
   - Añade a `messages`: mensaje de usuario (texto o "Mensaje de voz"/"Imagen") y un mensaje placeholder del modelo (vacío, `isGenerated: true`).  
   - Pone `loading = true`, hace **POST a `/api/chat/stream`** con body: `{ message, image?, audio?, eje, history }`.  
   - Lee el body como stream NDJSON: por cada línea `{ "text": "..." }` va concatenando al contenido del placeholder; si llega `{ "done": true }` termina; si llega `{ "error": "..." }` muestra ese error en el placeholder.  
   - Al terminar el stream, pasa el contenido completo por `parseResponseFormat` (quita `[ONDA_FORMATO:audio]` y `[ONDA_GUIA:xxx]`, extrae `guideId`) y actualiza el mensaje del modelo con el texto limpio y `guideId` si aplica.  
   - En caso de error de red o timeout (60 s), muestra el mensaje de error correspondiente en el placeholder.  
   - Finalmente `setLoading(false)`.

5. **Otras acciones**  
   - **Sugerencias:** `useSuggestion(suggestion)` pone el texto en el input.  
   - **TTS:** `playTTS(text)` hace POST a `/api/tts` con `{ text }`, recibe audio y lo reproduce.  
   - **Imagen:** `handleImageFile` / `handlePaste` guardan data URL en `attachmentImage`.  
   - **Audio:** `startRecording` / `stopRecording` graban y guardan data URL en `attachmentAudio`.

### Diagrama de flujo (chat web)

```mermaid
flowchart TD
  A[/chat] --> B{currentEje?}
  B -->|null| C[Mostrar selector de Ondas]
  C --> D[pickEje]
  D --> E[showMenu = true, menú visible]
  E --> F[handleMenuOption]
  F --> G{isSubmenu?}
  G -->|Sí| H[showIASubmenu = true]
  G -->|No| I[Agregar user + model a messages, showMenu = false]
  E --> J[Escribir / adjuntar]
  I --> J
  J --> K[handleSend]
  K --> L{eje elegido?}
  L -->|No| M[showPickOndaNotice]
  L -->|Sí| N[POST /api/chat/stream]
  N --> O[Leer NDJSON stream]
  O --> P[Actualizar placeholder con chunks]
  P --> Q[done?]
  Q --> R[parseResponseFormat]
  R --> S[Actualizar mensaje final + guideId]
  S --> T[loading = false]
```

---

## 3) FLUJO API CHAT — POST /api/chat/stream

- **Archivo:** `app/api/chat/stream/route.ts`.

### Body que recibe
- `message`: string (texto del usuario).
- `image`: string opcional, data URL (base64) de imagen.
- `audio`: string opcional, data URL o base64 largo (audio).
- `eje`: string, uno de `A_MANO`, `CIVITA`, `PROFES` (si no es válido se trata como null).
- `history`: array de `{ role: "user" | "model", content: string }` (historial de conversación).

### Detección de tipo de contenido
- **URL:** con regex `/\b(https?:\/\/[^\s)\]}>"']+)/i` se obtiene la primera URL del texto (`extractFirstUrl(message)`).
- **Audio:** si `body.audio` es string que empieza por `data:` o tiene longitud > 100, se considera audio.
- **Imagen:** si `body.image` es string que empieza por `data:`, se considera imagen.

### Flujo interno

1. **Audio:** si hay `audio`, se llama a `transcribeAudio(audio)` (Whisper). El texto se concatena a `message` (o se usa solo la transcripción).
2. **URL:** si hay URL en `message`, se llama a `extractArticle(firstUrl)` (fetch del HTML, extracción de texto y meta). El resultado se guarda en `articleContext` (text, thin, host, url, meta). Si la extracción falla, se arma un contexto mínimo con host y URL.
3. **Respuesta:**
   - **Con imagen:** se llama a `getOndaReplyWithImage(message || "¿Qué ves...?", image, eje, history, includeSources)`. No hay streaming real; la respuesta completa se emite por chunks de texto con `chunkText()` para simular stream. Luego se envía `{ done: true }`.
   - **Solo texto (y opcional articleContext):** se usa `getOndaReplyStream(message, eje, history, includeSources, articleContext)`. Es streaming real con OpenAI; cada delta se escribe como línea NDJSON `{ "text": chunk }`. Al final se envía `{ done: true }`.
4. En caso de error dentro del stream se envía una línea `{ "error": "..." }`.

### Qué devuelve
- **Content-Type:** `application/x-ndjson`.
- **Cuerpo:** líneas NDJSON:
  - `{"text":"fragmento"}\n` — fragmentos de la respuesta.
  - `{"done":true}\n` — fin correcto.
  - `{"error":"mensaje"}\n` — error (y se cierra el stream).

### Funciones clave usadas
- **extractArticle** (`lib/extractArticle.ts`): fetch a la URL, strip HTML, extrae título/descripción y texto (límite ~22k caracteres; si es poco texto se marca `thin`).
- **getOndaReplyStream** (`lib/ondaReply.ts`): OpenAI Chat Completions con `stream: true`, system + history + user; si hay `articleContext` se inyecta bloque "MODO NOTICIA" en el system.
- **getOndaReplyWithImage** (`lib/ondaReply.ts`): mismo modelo, mensaje de usuario con `image_url` + texto; sin streaming, respuesta completa.

---

## 4) FLUJO WHATSAPP — POST /api/webhook

- **Archivo:** `app/api/webhook/route.ts`.

### GET (verificación)
- Meta envía `hub.mode=subscribe`, `hub.verify_token`, `hub.challenge`.
- Si `mode === "subscribe"` y `token === process.env.WHATSAPP_VERIFY_TOKEN`, se responde con el `challenge` en texto plano (200).  
- Si no hay esos params, se devuelve un JSON de diagnóstico (estado del bot, URL del webhook, env vars presentes).

### POST (mensajes)
1. **Firma:** se lee el body en crudo y se verifica `x-hub-signature-256` con HMAC SHA256 usando `WHATSAPP_APP_SECRET` (o `META_APP_SECRET`). Si falla → 403.
2. **Payload:** se parsea JSON; se recorren `payload.entry[].changes[].value`.
3. **Filtros:** se ignoran solo los "status updates" (`value.statuses`). Se procesan `value.messages`; se ignoran mensajes `direction === "outbound"`.
4. **Por cada mensaje entrante** se obtiene: `from`, `text = msg.text?.body`, `type`, `imageId = msg.image?.id`, `audioId = msg.audio?.id`.
5. **Obtener respuesta según tipo:**
   - **Imagen:** `getWhatsAppMediaAsBase64(imageId, "image/jpeg")` → con el data URL se llama `getOndaReplyWithImage(text || "¿Qué ves...?", dataUrl, null, null, includeSources)`.
   - **Audio:** `getWhatsAppMediaAsBase64(audioId, "audio/ogg")` → `transcribeAudio(dataUrl)` → con el texto se llama `getOndaReply(transcribed, null, null, wantsSources(...))`.
   - **Texto:** `getOndaReply(text, null, null, includeSources)`.
6. **includeSources:** `wantsSources(userMessageForFormat)` (ej. si pide "fuentes", "referencias", etc.).
7. **Enviar respuesta:**  
   - Se parsea la respuesta con `parseResponseFormat(response)` (texto limpio, `sendAudio`, `guideId`).  
   - Siempre: `sendWhatsAppText(from, parsed.text)`.  
   - Si corresponde (vino audio, o `wantsAudio` o `parsed.sendAudio`) y el texto tiene ≤ 4000 caracteres: `generateSpeech(parsed.text)` y `sendWhatsAppAudio(from, audioBuffer)`.  
   - Si hay `parsed.guideId`: `getGuideImageBuffer(parsed.guideId)` y `sendWhatsAppImage(from, buffer, mimeType)`.
8. Cualquier error se registra; la respuesta HTTP es siempre 200 OK para no reintentar en exceso desde Meta.

---

## 5) ARCHIVOS CLAVE (una línea cada uno)

| Archivo | Descripción |
|--------|-------------|
| `app/page.tsx` | Home con enlace a `/chat` y mención del webhook `/api/webhook`. |
| `app/layout.tsx` | Layout raíz: fuentes, estilos globales, metadata. |
| `app/chat/page.tsx` | Página del chat: estado (mensajes, eje, menú), pickEje, handleMenuOption, handleSend, fetch a /api/chat/stream, lectura NDJSON. |
| `app/chat/components/ChatBubble.tsx` | Render de un mensaje (texto con negritas, imagen, guía, botón TTS). |
| `app/chat/components/EjeSelector.tsx` | Tabs para cambiar de Onda (A Mano, Civita, Profes). |
| `app/chat/components/Layout.tsx` | Layout opcional (contenedor centrado); no es usado por la página de chat actual. |
| `app/api/chat/stream/route.ts` | POST: recibe message/image/audio/eje/history; transcribe audio; extrae URL con extractArticle; con imagen usa getOndaReplyWithImage (chunks simulados); solo texto usa getOndaReplyStream; responde NDJSON. |
| `app/api/chat/route.ts` | POST alternativo sin stream: mismo body, devuelve JSON con respuesta completa (no usado por el front actual). |
| `app/api/webhook/route.ts` | GET: verificación del webhook de Meta; POST: firma, parseo de mensajes WhatsApp, imagen/audio/texto → getOndaReplyWithImage/getOndaReply, envío texto + opcional audio y guía. |
| `app/api/tts/route.ts` | POST: recibe `{ text }`, devuelve audio MP3 (TTS para el chat web). |
| `app/api/extract/route.ts` | Ruta API para extracción de artículo por URL (uso externo o pruebas). |
| `lib/ondaReply.ts` | getOndaReply, getOndaReplyStream, getOndaReplyWithImage; system prompt ONDA, ejes, fuentes, modo noticia; OpenAI gpt-4o-mini. |
| `lib/extractArticle.ts` | extractArticle(url): fetch HTML, strip tags, meta title/description, texto hasta ~22k caracteres, flag thin. |
| `lib/responseFormat.ts` | wantsAudio, wantsSources, wantsImage; parseResponseFormat (quita [ONDA_FORMATO:audio] y [ONDA_GUIA:id]); GUIDE_IDS. |
| `lib/transcribe.ts` | transcribeAudio(dataUrl/base64): Whisper vía OpenAI, escribe temporal y devuelve texto. |
| `lib/tts.ts` | generateSpeech(text): OpenAI TTS, devuelve Buffer MP3. |
| `lib/whatsapp.ts` | getWhatsAppMediaAsBase64(mediaId, mime); sendWhatsAppText, sendWhatsAppAudio, sendWhatsAppImage (Cloud API). |
| `lib/guides.ts` | getGuideImageBuffer(guideId): lee public/guides/{id}.png o .jpg y devuelve buffer + mimeType. |
| `lib/ondaStyles.ts` | Estilos (shell, header, bubble, input, tabs, etc.) según tema. |
| `lib/useOndaTheme.ts` | Hook que devuelve tema (colores, bordes, fuentes) para el chat. |
| `lib/ondaTheme.ts` | Definición del tipo y valores del tema Onda. |
| `content/shared.ts` | MAIN_WELCOME, EJE_CONFIGS, ORDERED_EJES, EJE_PROMPTS, EJE_SUGGESTIONS, EJE_MENU_OPTIONS, IA_SUBMENU_OPTIONS, FUENTES_ONDA_PARA_RESPUESTA, ONDA_MICROCOPY. |
| `content/types.ts` | EjeOnda, Message, EjeConfig, MenuOption, WorkflowState. |
| `content/raw/ondaRaw.ts` | RAW_A_MANO_FULL, RAW_CIVITA_FULL, RAW_PROFES_FULL (prompts largos por eje para el system). |
| `content/mano/prompt.ts`, `content/civita/prompt.ts`, `content/profes/prompt.ts` | Contenido específico por eje (si se usa además de shared). |
| `middleware.ts` | Middleware Next.js (si existe; revisar lógica de rutas/auth). |

---

## Diagrama de flujo general (resumen)

```mermaid
flowchart LR
  subgraph Web
    A[/] --> B[/chat]
    B --> C[ChatPage]
    C --> D[POST /api/chat/stream]
  end
  subgraph WhatsApp
    E[Meta] --> F[POST /api/webhook]
  end
  D --> G{image?}
  G -->|Sí| H[getOndaReplyWithImage]
  G -->|No| I{URL en message?}
  I -->|Sí| J[extractArticle]
  J --> K[getOndaReplyStream + articleContext]
  I -->|No| K
  H --> L[NDJSON stream]
  K --> L
  F --> M{type?}
  M -->|image| N[getWhatsAppMediaAsBase64 → getOndaReplyWithImage]
  M -->|audio| O[getWhatsAppMediaAsBase64 → transcribe → getOndaReply]
  M -->|text| P[getOndaReply]
  N --> Q[parseResponseFormat → sendWhatsAppText/Audio/Image]
  O --> Q
  P --> Q
```

---

Con esto se puede seguir "cómo funciona el código de ONDA completo con flujo" desde entradas (web y WhatsApp), pasando por estado y llamadas en el chat web, la API de stream y el webhook de WhatsApp, hasta la lista de archivos clave.
