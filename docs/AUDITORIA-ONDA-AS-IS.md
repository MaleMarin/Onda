# AUDITORÍA AS-IS — BOT ONDA (SOLO LECTURA)

**Fecha:** 2025-03-19  
**Regla 0:** Sin cambios de código. Solo inspección y documentación.

---

## A) ARQUITECTURA

### Flujo global (qué llama a qué)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CHAT WEB (Next.js)                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Cliente (app/chat/page.tsx)                                                    │
│    → localStorage: onda_visited, onda_chat_restore, onda_preferida,             │
│                    onda_ultimo_tema                                              │
│    → Eje activo: state currentEje (A_MANO | CIVITA | PROFES), enviado en body   │
│    → POST /api/chat/stream { message, image?, audio?, eje, history }             │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  app/api/chat/stream/route.ts                                                    │
│    1. Valida body (message / image / audio); eje en VALID_EJES                  │
│    2. Si audio → transcribeAudio() [lib/transcribe.ts, Whisper]                  │
│    3. Si URL en mensaje o history → extractArticle(firstUrl) [lib/extractArticle] │
│    4. extraContext = Promise.all([ searchWeb (Tavily 8s),                       │
│                                    getRagContext + searchPrivateDocs (8s) ])   │
│    5. Si imagen → getOndaReplyWithImage(..., canal no pasado = web)             │
│       → respuesta completa, luego chunkText() a NDJSON                          │
│    6. Si solo texto → getOndaReplyStream(..., articleContext, extraContext)     │
│    7. NDJSON: { text }, { tema? }, { done: true } o { error }                   │
│    8. generateTemaFromExchange() → opcional { tema }                            │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  lib/ondaReply.ts                                                                │
│    • buildOndaSystemContent() / system inline: SYSTEM_PROMPT_FUSIONADO           │
│      + EJE_PROMPTS[eje] + FRASES_BLINDAJE_POR_EJE[eje] + INTUICION_* +          │
│      + (includeSourcesList → FUENTES_*) + (articleContext → NOTICIA_SYSTEM)     │
│      + (extraContext → CONTEXTO_DE_ACTUALIDAD)                                   │
│    • classifyIntent(query, eje, extraContextLength) → "deep"|"simple"|"docs"    │
│    • getOrchestratorRoute(intent) → "claude"|"gpt-mini"|"gemini"                │
│    • runStream(route, system, history, userText) → chunks                       │
│    • Fallback: tryFallbackGpt4o() si falla la ruta primaria                     │
└─────────────────────────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           WHATSAPP (Webhook)                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Meta → POST /api/webhook (x-hub-signature-256; body JSON)                       │
│    verifyWebhookSignature(rawBody, signature)                                    │
│    payload.entry[].changes[].value.messages[]                                   │
│    Ignora: statuses, direction===outbound                                        │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  app/api/webhook/route.ts                                                        │
│    Por cada mensaje entrante (from, text, type: text|image|audio):              │
│    • type===image → getWhatsAppMediaAsBase64(id) → getOndaReplyWithImage(        │
│        text|"¿Qué ves...", dataUrl, null, null, wantsSources(), "whatsapp" )   │
│    • type===audio → getWhatsAppMediaAsBase64(id) → transcribeAudio() →          │
│        getOndaReply(transcribed, null, null, wantsSources(), null, "whatsapp")  │
│    • type===text → getOndaReply(text, null, null, includeSources, null,         │
│        "whatsapp")                                                               │
│    parseResponseFormat(response) → sendWhatsAppText(parsed.text);               │
│    si shouldSendAudio → generateSpeech() → sendWhatsAppAudio();                  │
│    si parsed.guideId → getGuideImageBuffer() → sendWhatsAppImage()               │
│    Errores → recordError(auditStore)                                             │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**No existe `sessionStore.ts`.** WhatsApp no usa sesión ni historial: cada mensaje se procesa con `eje = null`, `history = null`. El estado (eje, preferencias, restauración) solo existe en el cliente web vía localStorage.

### Guardrails y fallbacks (resumen)

- **OpenAI/Claude/Gemini fallan:** Fallback a GPT-4o en `ondaReply`; en stream web se envía lo ya generado + mensaje de interrupción o `error` en NDJSON.
- **extractArticle:** Siempre se devuelve algo (aunque sea meta); paywall/thin → párrafo fijo “No pude acceder al texto completo (posible paywall)…”.
- **Audio:** Web → 400 con mensaje según “muy corto” o genérico; WhatsApp → “No pude transcribir el audio. ¿Me lo escribes por texto?”.
- **Imagen:** Web → `error` NDJSON; WhatsApp → mensajes fijos de “no procesar” / “falló el análisis”.
- **Sesión:** No aplica en servidor; WhatsApp sin historial.

Textos exactos que puede ver el usuario: ver sección F más abajo (detalle de fallbacks).

### Dónde se decide

| Decisión              | Dónde                                                                 |
|-----------------------|-----------------------------------------------------------------------|
| Eje/onda activo       | **Web:** cliente (`currentEje`) → body `eje` en POST. **WhatsApp:** siempre `null` (sin eje). |
| Intent                | `lib/ondaReply.ts`: `classifyIntent()` (LLM con fallback heurístico) → `deep` \| `simple` \| `docs`. |
| Tono/persona          | System prompt en `ondaReply.ts`: `SYSTEM_PROMPT_FUSIONADO` + `EJE_PROMPTS[eje]` + `FRASES_BLINDAJE_POR_EJE`; si `canal === "whatsapp"` se añade `INSTRUCCION_WHATSAPP` y `BLINDAJE_WHATSAPP_POR_EJE`. |
| Formato de respuesta  | Modelo genera texto; marcadores `[ONDA_FORMATO:audio]`, `[ONDA_GUIA:xxx]`, `[ONDA_SUGERENCIAS: ...]` parseados en `lib/responseFormat.ts` (web: ChatBubble; WhatsApp: parseResponseFormat antes de enviar). |
| Fallback de errores   | `ondaReply`: tryFallbackGpt4o. stream/route: mensaje parcial + “_La conexión se interrumpió..._” o `error` en NDJSON. webhook: mensajes fijos (“No pude procesar…”, “No pude transcribir…”, etc.). |

---

## B) PERSONALIDAD Y REGLAS (AS-IS)

Extraído/parafraseado de `lib/ondaReply.ts` y `content/shared.ts`.

### Quién es ONDA

- **Rol:** Asistente de Alfabetización Mediática e Informacional (AMI) de la Fundación Precisar (www.precisar.net).
- **Misión:** Empoderar a las personas para navegar el mundo digital con pensamiento crítico y sin miedo.
- **Estilo:** Coach, no solo fact-checker; enseña a identificar por qué algo puede ser engañoso. Humano al centro; la IA es herramienta, la persona tiene el criterio final. Fresco, empoderador, paciente y empático.
- **Presentación:** No mencionar Botpress, Knowledge Base, nodos de IA ni lenguaje técnico; voz humana y pedagógica.

### Qué puede y qué NO puede hacer

- **Puede:** Analizar noticias, mensajes, cadenas (texto, audio, imágenes, links); explicar en simple; enseñar uso de IA y prompts; activar kits de emergencia; sugerir desconexión digital sin moralizar; fomentar pensamiento crítico.
- **No puede / no debe:** Emitir opiniones sobre política, religión o ideologías; usar la palabra “pruebas” (sí “evidencias”); decir “no tengo acceso directo a enlaces” o “no puedo abrir el artículo”; dar la impresión de haber leído documentos externos no compartidos en el chat; inventar cláusulas o análisis de políticas no pegadas; decir “no tengo información en tiempo real” cuando existe CONTEXTO_DE_ACTUALIDAD; acortar respuestas sin que el usuario pida brevedad (prohibición de brevedad salvo petición explícita).

### Neutralidad / sesgo / “sin opiniones”

- **Filtro de auditoría (paso cero):** Verificar: (1) neutralidad política, (2) rigor de derechos, (3) tono y cercanía, (4) blindaje ante provocaciones, (5) cero alucinaciones.
- **Constitución:** Neutralidad radical; información objetiva, datos institucionales; no aceptar provocaciones; responder con educación, cercanía y firmeza; redirigir al propósito de la Onda.
- **Frases de blindaje por eje:** Definidas en `FRASES_BLINDAJE_POR_EJE` y en WhatsApp `BLINDAJE_WHATSAPP_POR_EJE` (A Mano, Civita, Profes) para consulta política, provocación o falta de datos verificados.

### Cómo cita fuentes

- Si usa información de CONTEXTO_DE_ACTUALIDAD (RAG/búsqueda web): marcar con [1], [2], [3] en el texto; al final sección obligatoria `### 📚 Fuentes de Autoridad` con formato `[N] Medio: "Título" (URL)`.
- Prohibido “Se dice que”, “Muchos expertos opinan”; sustituir por atribución explícita.
- Si hay discrepancia entre documentos internos y búsqueda web, mencionarla en el cuerpo.
- Cuando no usa información externa, no inventar números [1][2] ni incluir la sección.
- Medios y recursos: cada mención con URL en formato Markdown `[Nombre](https://...)`.

### Cómo responde cuando no sabe

- Para algo muy específico de Precisar no hallado en registros: frase exacta “No he hallado evidencias verificables en mis registros oficiales.”
- Para el resto: responder con lo que sepa y, si conviene, sugerir fuentes de la lista oficial.
- Mandato no alucinación: si no hay datos verificables para una conexión intuitiva, cerrar con mensaje de transparencia tipo “He analizado el contexto global pero no existen fuentes oficiales suficientes para establecer una conexión verificable en este momento.”

### Lenguaje

- Neutralidad de género (“te damos la bienvenida”, “¿Empezamos?”).
- Español neutro internacional (no argentino ni voseo): “quieres”, “puedes”, “sabes”, “tienes”.
- Cercano y comprensible; términos en inglés explicados.
- Ortografía correcta; no repetir errores del usuario; corregir de forma natural.
- Estilo editorial: como editora de noticias; clara, directa, jerarquía visual; negritas solo para instituciones, conceptos técnicos AMI y números de evidencia [1][2]; línea en blanco entre párrafos.

---

## C) CONOCIMIENTO Y HERRAMIENTAS (AS-IS)

### Modelos y dónde se usan

| Uso              | Modelo / servicio   | Dónde                          |
|------------------|--------------------|--------------------------------|
| Respuesta estándar (simple) | GPT-4o-mini        | `ondaReply`: route `gpt-mini`  |
| Análisis profundo (deep)    | Claude 3.5 Sonnet  | `ondaReply`: route `claude`    |
| Contexto muy largo (docs)   | Gemini 1.5 Pro     | `ondaReply`: route `gemini`    |
| Fallback cuando falla ruta  | GPT-4o             | `tryFallbackGpt4o`             |
| Eje Profes (getModelForEje) | GPT-4o             | Solo para visión con imagen compleja |
| Clasificador de intent     | GPT-4o-mini        | `classifyIntent()`             |
| Complejidad de imagen      | GPT-4o-mini        | `classifyImageComplexity()`    |
| Tema (memoria temática)     | GPT-4o-mini        | `generateTemaFromExchange()`    |
| Transcripción              | Whisper (whisper-1)| `lib/transcribe.ts`            |
| TTS                         | OpenAI tts-1 (voz alloy) | `lib/tts.ts` → WhatsApp y opcional web |
| Embeddings RAG              | text-embedding-3-small | `lib/firebaseRag.ts`        |

### Inputs soportados

- **Web:** texto, imagen (data URL), audio (data URL); opcional URL en mensaje o en historial reciente.
- **WhatsApp:** texto, imagen (descargada vía API a base64), audio (ogg descargado → Whisper).

### Qué hace con links y límites

- **Flujo:** En `chat/stream` se obtiene la primera URL del mensaje actual o del historial (`getUrlFromMessageOrHistory`) → `extractArticle(url)`.
- **extractArticle** (`lib/extractArticle.ts`): GET con User-Agent estándar; siempre lee HTML; extrae `<title>`, og:title, meta description; `stripHtml` → texto plano; máximo 22.000 caracteres; `thin = text.length < 1500`.
- **Límites:** Paywall/403: se devuelve igual `ok: true` con el HTML disponible (solo meta si no hay cuerpo); el prompt NOTICIA_SYSTEM_BLOCK indica “No pude acceder al texto completo (posible paywall)” y pedir primer párrafo. No hay cache explícito; cada request hace fetch.
- **Fallback:** Si `extractArticle` falla (`ok: false`), se construye `articleContext` con host + URL y meta vacía para no dejar sin contexto.

### Memoria (estado persistente)

- **Redis/KV:** No se usa para sesión de chat. `@vercel/kv` solo en `lib/auditStore.ts`: listas `onda_usage`, `onda_feedback`, `onda_errors` (rpush + ltrim, últimas 500); para métricas y errores, no para historial ni eje.
- **Web:** Todo en **localStorage**: `onda_visited`, `onda_chat_restore` (JSON con mensajes, eje, savedAt), `onda_preferida`, `onda_ultimo_tema`. Restore válido &lt; 7 días; “misma sesión” mismo día y &lt; 12 h desde savedAt; si no, se borra solo `onda_chat_restore`, se mantienen preferida y tema para saludo.
- **WhatsApp:** Sin memoria entre mensajes; sin historial ni eje; cada mensaje es independiente.

---

## D) FLUJOS POR ONDA (AS-IS)

### Estado inicial y bienvenidas (solo web; WhatsApp no tiene “welcome” por Onda)

| Prioridad | Condición                         | Saludo / comportamiento (content/shared.ts) |
|-----------|------------------------------------|---------------------------------------------|
| 1         | Tema guardado (`onda_ultimo_tema`) | getWelcomeWithTema: “¿Seguimos trabajando en [tema] o buscamos nuevas evidencias hoy?” |
| 2         | Onda preferida (`onda_preferida`)  | getWelcomeWithPreferredEje: “¿Quieres continuar ahí o exploramos una nueva hoy?” |
| 3         | Nuevo día / &gt; 12 h              | getGreetingNewDay: “¡Hola de nuevo hoy! … ¿Qué onda activamos hoy?” |
| 4         | Primera vez (no `onda_visited`)    | getMainWelcome() con las 3 Ondas y opciones (textos, audios, imágenes, links). |

Por eje, al elegir Onda en web: `WELCOME_A_MANO`, `WELCOME_CIVITA` (pide país), `WELCOME_PROFES` (definidos en shared.ts). En backend, el “estado inicial” es solo el system prompt: `EJE_PROMPTS[eje]` + bloques RAW_*_FULL por eje.

### Menú / quick actions

- **Web:** `EJE_MENU_OPTIONS` (A_MANO, CIVITA, PROFES) con opciones por eje; A_MANO incluye submenú IA (`IA_SUBMENU_OPTIONS`). Cada ítem tiene `intro` (3 preguntas) e `internalPrompt`. Chips de sugerencias: `[ONDA_SUGERENCIAS: p1 | p2 | p3]` parseados en el cliente; fallback `PILDORAS_INTUICION[eje]` y `EJE_SUGGESTIONS`.
- **WhatsApp:** No hay menú ni quick replies; el usuario escribe libre y el bot responde con `eje = null` y sin historial.

### Flujo típico

- **Web:** Usuario elige Onda → se envía `eje` + `history` en cada POST. Si hay URL → articleContext; en paralelo extraContext (web + RAG + Firebase). classifyIntent → route → stream o respuesta completa (imagen). Cliente guarda mensajes, opcional tema y restore en localStorage.
- **WhatsApp:** Mensaje → getOndaReply(..., "whatsapp") con bloque INSTRUCCION_WHATSAPP y BLINDAJE_WHATSAPP; respuesta única; parseResponseFormat; envío texto, opcional audio y guía.

### Reglas especiales por eje

- **A Mano:** Vida digital cotidiana, criterio e IA; no reemplazar estudio; detectar engaños; blindaje ante política/provocación según FRASES_BLINDAJE y BLINDAJE_WHATSAPP.
- **Civita:** Vida pública, instituciones, apartidario; preguntar país para ejemplos; no opinar sobre figuras políticas; marco legal e institucional.
- **Profes:** Docencia e IA crítica; no hacer la tarea por el estudiante; actividades con reflexión y transparencia de prompts; protocolos de seguridad y bienestar.

### Mensajes duplicados

- En el prompt: si el usuario hace clic en una sugerencia que el bot ofreció, no repetir la misma pregunta; avanzar (REGLA_PREGUNTAS_SEGUIMIENTO en shared). No se observa en el código un “strict mode” ni montaje específico que cause duplicados; la posible repetición sería por comportamiento del modelo, no por lógica de enrutado.

---

## E) INTENTS (AS-IS)

### Lista de intents (clasificador de orquestador)

| Intent  | Nombre exacto | Descripción (ondaReply) |
|---------|----------------|--------------------------|
| simple  | `simple`       | Saludos, agradecimientos, preguntas cortas o factuales. |
| deep    | `deep`         | Análisis complejo, ética, periodismo, educación/Profes, reflexión, ensayo, o mensaje largo (&gt;200 caracteres). |
| docs    | `docs`         | Solo si extraContextLength ≥ 12_000 (mucho contexto inyectado). |

No hay otros intents con nombre (p. ej. “verificar_noticia”, “pedir_fuentes”); “fuentes” solo activa `includeSourcesList` vía `wantsSources()` en las rutas, no un intent distinto.

### Cómo se detectan

- **Primero:** Si `extraContextLength >= 12000` y hay `GOOGLE_GENERATIVE_AI_API_KEY` → `docs`.
- **Luego:** Llamada a **classifyIntent** con GPT-4o-mini (system: clasificador deep/simple/docs; user: extraContextLength, eje, mensaje hasta 400 caracteres); respuesta una palabra.
- **Fallback** si la llamada falla: `classifyIntentFallback()`:
  - Si extraContext ≥ 12k y hay API key Google → `docs`.
  - Si eje === PROFES → `deep`.
  - Keywords: `etica|ética|periodismo|análisis profundo|...|reflexión|...|verificar en profundidad|fuentes y rigor` o longitud &gt; 200 → `deep`.
  - Saludos cortos (regex) o mensaje corto (≤80 caracteres, ≤8 palabras, sin ?) → `simple`.
  - Por defecto → `simple`.

### Qué handler ejecuta cada intent

- **simple** → route `gpt-mini` (GPT-4o-mini), salvo que no haya ANTHROPIC/Google y se use fallback.
- **deep** → route `claude` (Claude 3.5 Sonnet) si hay ANTHROPIC_API_KEY; si no, `gpt-mini`.
- **docs** → route `gemini` (Gemini 1.5 Pro) si hay GOOGLE_GENERATIVE_AI_API_KEY; si no, `gpt-mini`.

Todos pasan por `runComplete` (WhatsApp) o `runStream` (web); mismo system prompt y historial (en web); el “handler” es la elección de modelo.

### Parámetros y formato de respuesta

- Parámetros: `userText`, `eje`, `history` (solo web), `includeSourcesList`, `articleContext`, `canal`, `extraContext`.
- La respuesta es texto generado por el modelo; el formato (audio, guía, sugerencias) se extrae después con `parseResponseFormat()` desde marcadores en el texto.

---

## F) GUARDRAILS Y FALLBACKS — DETALLE (AS-IS)

### OpenAI falla / timeout

- **ondaReply:** try/catch en getOndaReply y getOndaReplyStream; fallback `tryFallbackGpt4o(systemContent, historyForApi, userText)`.
- **Stream:** Si hay `partialSoFar` se envía lo generado + “_La conexión se interrumpió; aquí va lo que pude generar. Puedes preguntar de nuevo para seguir._”; si no hay texto aún, `getOndaReplyStream` intenta fallback GPT-4o y luego `EMERGENCY_ONDA_REPLY`; el route envía un `error` con mensaje breve (ya no el texto fijo “Uy, se cortó la conexión…”). Ver `docs/AUDITORIA-INTEGRACION-ONDABOT.md`.
- **WhatsApp:** catch en getOndaReply/getOndaReplyWithImage no define mensaje concreto; el webhook no envía otro mensaje al usuario en ese catch (solo log). Si sendWhatsAppText falla, se registra en recordError.

### extractArticle falla / thin / 403

- **Falla (ok: false):** Se construye articleContext con `host` desde URL, `text: ""`, `thin: true`, `meta: { title: "", description: "" }` para no romper; el modelo recibe MODO NOTICIA con “contenido disponible” mínimo.
- **Thin o 403:** Siempre se devuelve `ok: true` con el HTML leído; el prompt indica usar título/descripción/host y terminar con el párrafo exacto `FALLBACK_PAYWALL`: “No pude acceder al texto completo del enlace (posible paywall). Si pegas el primer párrafo, lo explico mejor. Mientras tanto, aquí va una explicación basada en el título/descripción disponibles.”
- **Prohibido en prompt:** Decir “no tengo acceso directo a enlaces” o “no puedo abrir el artículo”.

### Audio no transcribe

- **Web (stream):** transcribeAudio lanza → Response.json 400 con mensaje: si el error incluye “muy corto” → “El audio es muy corto. Graba al menos un par de segundos y vuelve a intentar.”; si no → “No pude transcribir el audio. Puedes probar con otro formato o enviarlo por texto.”
- **WhatsApp:** catch → `response = "No pude transcribir el audio. ¿Me lo escribes por texto?"`; además `recordError(...)`.

### Imagen no se procesa

- **Web:** En el catch del start() del stream, si hay imagen: `fallbackMsg = "No pude analizar la imagen. Puedes probar con otra más liviana o contarme por texto qué ves."`; se envía `{ error: fallbackMsg }`.
- **WhatsApp:** Si getWhatsAppMediaAsBase64 no devuelve dataUrl: “No pude procesar la imagen. ¿Puedes enviarla de nuevo?”. Si getOndaReplyWithImage lanza: “Uy, falló el análisis de la imagen. Intenta en un ratito.”.

### Sesión no existe

- **Web:** No hay sesión en servidor; el cliente envía `eje` y `history` que él mismo mantiene. Si no hay historial, se envía `history: []`.
- **WhatsApp:** No hay concepto de sesión; cada mensaje es aislado. No hay mensaje específico “sesión no existe”.

### Textos exactos de fallback que ve el usuario

- “Enviá un mensaje de texto, una imagen o un audio.” (400 body inválido)
- “El audio es muy corto. Graba al menos un par de segundos y vuelve a intentar.”
- “No pude transcribir el audio. Puedes probar con otro formato o enviarlo por texto.”
- “_La conexión se interrumpió; aquí va lo que pude generar. Puedes preguntar de nuevo para seguir._”
- Mensaje de error de stream si no hubo ningún chunk (texto actualizado en código; ver `app/api/chat/stream/route.ts`).
- “No pude analizar la imagen. Puedes probar con otra más liviana o contarme por texto qué ves.”
- “Algo falló en el servidor. Intenta de nuevo en un momento.” (500 genérico)
- WhatsApp: “No pude procesar la imagen. ¿Puedes enviarla de nuevo?”; “No pude descargar el audio. ¿Puedes enviar un mensaje de texto?”; “No pude transcribir el audio. ¿Me lo escribes por texto?”; “Uy, falló el análisis de la imagen. Intenta en un ratito.”
- En respuestas del modelo (no código): “Ups, no tengo una respuesta en este momento.” (cuando completion.message.content es null/empty); “No pude acceder al texto completo del enlace (posible paywall)…” (FALLBACK_PAYWALL en prompt).

---

## E) LISTA DE PROBLEMAS OBSERVADOS (SOLO OBSERVACIÓN, SIN SOLUCIÓN)

1. **WhatsApp sin eje ni historial:** Todas las llamadas a getOndaReply/getOndaReplyWithImage desde el webhook usan `eje = null` y `history = null`, por lo que el comportamiento en WhatsApp no varía por “Onda” y no hay contexto de conversación previa.

2. **No existe sessionStore:** El enunciado pedía revisar `src/lib/sessionStore.ts`; en el repo no hay tal archivo. La “sesión” es solo cliente (localStorage) en web y nula en WhatsApp.

3. **RAG genérico vacío:** `lib/rag.ts` getRagContext() siempre devuelve ""; solo Firebase RAG (`searchPrivateDocs`) aporta contexto cuando Firestore y el índice vectorial están configurados.

4. **Búsqueda web con timeout silencioso:** Si Tavily supera 8 s, se usa "" y se sigue con RAG/PDFs; el usuario no recibe indicación de que “no se pudo buscar en la web en esta ocasión”.

5. **Webhook devuelve 200 ante errores internos:** En el catch general del POST del webhook se hace `return new Response("OK", 200)`, por lo que Meta considera el mensaje entregado aunque no se haya respondido al usuario.

6. **WhatsApp: respuesta ante fallo de getOndaReply:** Si getOndaReply(text) lanza, se hace solo console.error y `response` queda null; no se asigna mensaje de fallback al usuario ni recordError para ese caso.

7. **Truncado de texto en WhatsApp:** sendWhatsAppText trunca a 4096 caracteres con “…”; no hay aviso al usuario de que la respuesta fue recortada.

8. **TTS en WhatsApp:** Se envía audio si `wantsAudio(userMessageForFormat)` o si el usuario envió audio; el texto para TTS se limita a 2048 caracteres en lib/tts.ts, pero la decisión de enviar audio no tiene en cuenta ese límite antes de generar (podría fallar o cortar sin aviso).

9. **Clasificador de intent en español:** El system del clasificador está en español pero pide una sola palabra en minúsculas (deep/simple/docs); posible fragilidad si el modelo responde con variantes o tildes.

10. **Doble envío posible en webhook:** Se envía texto y luego, si shouldSendAudio, audio; si parsed.guideId, imagen. No hay control de “solo uno” si el usuario pide “en audio” y además hay guía; el usuario podría recibir texto + audio + imagen en un mismo turno.

11. **Restore y timezone:** La regla “misma sesión” usa “mismo día calendario” y &lt; 12 h desde savedAt; depende de la zona horaria del cliente y puede ser confusa en viajes o usuarios en distintas zonas.

12. **extractArticle sin cache:** Cada petición con la misma URL vuelve a hacer fetch; en picos o con enlaces muy usados podría ser coste o rate-limit.

13. **Uso de @vercel/kv:** auditStore usa KV para usage/feedback/errors; si el proyecto se despliega fuera de Vercel sin KV, las escrituras fallan en silencio (solo console.error) y no hay persistencia alternativa.

14. **Mensaje de error 400 en español con voseo:** “Enviá un mensaje de texto…” usa “Enviá” (voseo), mientras que las reglas de personalidad piden español neutro sin voseo.

15. **Eje en body del chat:** El eje lo decide solo el cliente; un cliente manipulado podría enviar un eje que no coincida con la “Onda” que el usuario cree tener seleccionada (no hay validación de coherencia servidor).
