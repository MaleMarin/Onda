# Auditoría Final — Onda / Precisar

Fecha: 6 de julio de 2026

---

## 1. Estado general

**Calificación de madurez: 8/10**

Onda es un producto conversacional dual (web + WhatsApp) con arquitectura sólida para un despliegue inicial en producción: seguridad perimetral en el webhook, compliance Meta documentado, orquestación multi-modelo con circuit breaker, y una capa de calidad conversacional (intents, voz por eje, memoria, emoción) bien integrada en `lib/ondaReply.ts`. La suite de **282 tests unitarios** y **104 casos de evaluación en CI** dan confianza para iterar sin regresiones graves. Los puntos débiles no son de diseño conceptual sino de **cableado incompleto** (`rag_used` en UI, `ONDA_LIMIT_MESSAGES` sin uso), **fail-open deliberado sin KV** (dedupe, rate limit, compliance) y **deuda operativa** (purge sin cron, módulos admin sin tests). Para los primeros 100 usuarios de WhatsApp el riesgo principal es desplegar sin KV o sin plantillas HSM aprobadas; a 1000 mensajes/día el cuello de botella será costo/latencia de LLM, no el webhook.

---

## 2. Estado por capa

| # | Capa | Estado | Archivos | Hallazgo |
|---|------|--------|----------|----------|
| 1 | HMAC obligatorio en webhook WA | ✅ OK | `lib/verifyWebhookSignature.ts`, `app/api/webhook/route.ts`, `tests/unit/webhookHandshake.test.ts` | HMAC-SHA256 con `timingSafeEqual`; sin secret → 503; firma inválida → 401. Fail-closed en autenticación. |
| 2 | Rate limiting sliding window | ⚠️ Mejorable | `lib/rateLimiter.ts`, `app/api/webhook/route.ts`, `app/api/chat/stream/route.ts` | WA 20 req/min, web 30 req/min por IP. Sin KV → fail-open (sin límite). Comentario dice "sliding window" pero implementa ventana fija (INCR + TTL). |
| 3 | Validación de imágenes y audio | ✅ OK | `lib/validateMedia.ts`, `tests/unit/validateMedia.test.ts` | Imagen: sharp, 5 MB, jpeg/png/webp. Audio: ffprobe, 10 MB, 120 s. Si ffmpeg no disponible → duración no medida (fail-open). |
| 4 | TTL retención + endpoint purga | 🔄 Parcial | `lib/auditStore.ts`, `lib/sessionMemory.ts`, `docs/POLITICA-RETENCION-DATOS.md`, `app/api/admin/purge/route.ts` | TTLs documentados (30–180 días). Purge manual vía admin; **sin cron automático**. `purgeExpiredRecords` requiere `kv.del` (TODO en código). |
| 5 | Alertas de gasto API | ✅ OK | `lib/spendingAlert.ts`, `app/api/usage/route.ts`, `app/api/admin/spending/route.ts` | Contador diario en KV; umbrales `SPENDING_ALERT_DAILY_USD` / `CRITICAL`; webhook opcional. Sin KV → $0 registrado. |
| 6 | Protección prompt injection | ✅ OK | `lib/promptSafety.ts`, `lib/ondaReply.ts`, `tests/unit/promptSafety.test.ts` | Heurística pre-LLM + guard al inicio del system prompt + `sanitizeExternalContent` en RAG/artículos. |
| 7 | Opt-out/opt-in keywords | ✅ OK | `lib/waCompliance.ts`, `content/shared.ts`, `tests/unit/waCompliance*.test.ts` | PARAR, ALTO, STOP, etc. Sin KV → opt-out no persiste (fail-open, riesgo Meta). |
| 8 | Ventana 24 h | ✅ OK | `lib/waWindowGuard.ts`, `lib/waCompliance.ts`, `tests/unit/waWindowGuard.test.ts` | `renewMessageWindow` + `makeWindowAwareSender`; fuera de ventana solo plantilla HSM. Sin KV → ventana siempre abierta. |
| 9 | Bienvenida primer contacto | ✅ OK | `content/shared.ts` (`WA_FIRST_CONTACT_PACK`), `app/api/webhook/route.ts` | Pack de bienvenida + opt-in en primer mensaje; `markAsSeen` en KV. |
| 10 | 200 OK + background (waitUntil) | ✅ OK | `lib/waBackground.ts`, `app/api/webhook/route.ts` | Meta recibe 200 inmediato; trabajo en `runInBackground` con `@vercel/functions.waitUntil`. Sin Vercel → fire-and-forget (riesgo). |
| 11 | Dedupe por message.id | ⚠️ Mejorable | `lib/waDedupe.ts`, `tests/unit/waDedupe.test.ts` | KV `SET NX EX 24h`. Sin KV → memoria local (inseguro multi-instancia). JSDoc dice fail-closed en error KV; código hace fail-open. |
| 12 | 5 clases de intent | ✅ OK | `lib/intentClassifier.ts`, `tests/unit/intentClassifier.test.ts`, `lib/ondaReply.ts` | fact_check, explanation, action, emotional, disinformation. Bloque inyectado en system prompt. |
| 13 | Flag rag_used + disclaimer | 🔄 Parcial | `app/api/chat/stream/route.ts`, `lib/ondaReply.ts` | Backend emite `rag_used` / footnotes en fact_check y Desinfo360. **UI no consume `rag_used`**; badge "Fuente verificada" depende de links en markdown. |
| 14 | Memoria semántica entre sesiones | ✅ OK | `lib/sessionMemory.ts`, `tests/unit/sessionMemory*.test.ts` | Resumen en KV, TTL 30 días, disclaimer "no es instrucción nueva". |
| 15 | Personalidad por Onda | ✅ OK | `lib/ondaVoice.ts`, `content/shared.ts`, `tests/unit/ondaVoice.test.ts` | A Mano / Civita / Profes con tono, prioridades y ejemplos distintos vía `buildVoiceBlock`. |
| 16 | Detector carga emocional | ✅ OK | `lib/ondaVoice.ts` (`detectEmotionalLoad`) | anxiety, overwhelm, distrust, anger, none. Complementa intent `emotional`. |
| 17 | Deleite + mensajes de límite | 🔄 Parcial | `lib/ondaVoice.ts` (`buildDelightMoment`), `content/shared.ts` (`ONDA_LIMIT_MESSAGES`) | Delight cableado en web por intent. **`ONDA_LIMIT_MESSAGES` definido pero no importado en runtime**; límites usan copy propio de safety. |
| 18 | Observabilidad (request ID, latencia, health) | ✅ OK | `lib/telemetry.ts`, `lib/insightsTelemetry.ts`, `app/api/admin/health/route.ts` | Request IDs trazables, timing por modelo, endpoint health. `checkKvConnectivity` siempre retorna "ok" (bug menor). |
| 19 | Testing (282 unit + evals) | ✅ OK | `tests/` (35 archivos), `lib/*.test.ts` (8), `evals/` (179 casos, 104 en CI) | 43 archivos Vitest, 282 tests en verde. CI: `evals:ci` + `npm test`. |
| 20 | Caché de respuestas frecuentes | ✅ OK | `lib/responseCache.ts`, `lib/ondaReply.ts` | TTL por intent; emotional nunca se cachea. Sin tests dedicados. |
| 21 | Optimizador de prompts | ✅ OK | `lib/promptOptimizer.ts`, `lib/ondaReply.ts` | Trunca system prompt >6000 chars; protege guard y voz. Sin tests dedicados. |
| 22 | Métricas de costo por Onda/canal | ✅ OK | `lib/spendingAlert.ts`, `lib/impactMetrics.ts`, `app/admin/dashboard/page.tsx` | Costo estimado por conversación; dashboard admin. Sin tests en impactMetrics. |
| 23 | Circuit breaker por proveedor | ✅ OK | `lib/circuitBreaker.ts`, `lib/ondaReply.ts`, `tests/unit/circuitBreaker.test.ts` | CLOSED/OPEN/HALF_OPEN; 3 fallos → OPEN; 60 s recovery. Global por proveedor (afecta a todos los usuarios). |
| 24 | OfflineBanner + runbook | ✅ OK | `app/chat/components/OfflineBanner.tsx`, `ChatPageContent.tsx`, `docs/RUNBOOK-INCIDENTES.md` | Poll a health; banner si degraded/down. Runbook con escenarios y rotación de secrets. |
| 25 | Dashboard de impacto donantes | ✅ OK | `lib/impactMetrics.ts`, `app/admin/dashboard/page.tsx`, `app/api/admin/metrics` | Métricas ejecutivas diarias en KV. |
| 26 | Accesibilidad WCAG | 🔄 Parcial | `ChatPageContent.tsx`, `ChatBubble.tsx`, `InclusionSettingsPanel.tsx`, `lib/chatI18n.ts` | ARIA roles, tabs, teclado, panel inclusión. Sin auditoría WCAG automatizada en CI. |
| 27 | Scripts generación/verificación secrets | ✅ OK | `scripts/generate-secrets.ts`, `scripts/verify-env.ts`, `package.json` | `npm run secrets:generate`, `npm run env:verify`; build con verify opcional (`|| true`). |

**Resumen:** 18 ✅ OK · 3 ⚠️ Mejorable · 0 ❌ Falta · 6 🔄 Parcial

---

## 3. System prompt — análisis de coherencia

### ¿El guard de seguridad está al inicio?

**Sí.** En `lib/ondaReply.ts`, `PROMPT_INJECTION_SYSTEM_GUARD` es el primer bloque del system prompt, antes del canal (WA/web), el cuerpo normativo (`ONDA_SYSTEM_BODY`) y cualquier contexto dinámico. Además, `lib/promptSafety.ts` filtra el input del usuario **antes** de llamar al modelo (jailbreak, prompt leak, roleplay, inyección de roles).

### ¿La voz por Onda se diferencia realmente?

**Sí, con matices.** `buildVoiceBlock` en `lib/ondaVoice.ts` añade tono, prioridades y ejemplos por eje (A Mano: cotidiano; Civita: institucional; Profes: pedagógico). Se combina con `EJE_PROMPTS`, `ADDON_ONDA_*` y `FRASES_BLINDAJE_POR_EJE` de `content/shared.ts`. Tests en `ondaVoice.test.ts` validan diferenciación. **Tensión detectada:** `buildVoiceBlock` obliga un "Puente de escucha" (pregunta final), mientras `ondaReply.ts` prohíbe cerrar pidiendo aportes comunitarios porque "la interfaz ya puede mostrar esa invitación".

### ¿El bloque de intent modifica el comportamiento?

**Sí.** `buildIntentContextBlock` inyecta instrucciones según `fact_check`, `explanation`, `action`, `emotional`, `disinformation`. En la ruta web (`stream/route.ts`), el intent también dispara RAG/web search (excepto emotional/action) y delight moments. El intent `disinformation` activa modo Desinfo360 con rubrica propia en evals.

### ¿El formato WA se aplica correctamente?

**Sí.** Bloque `WHATSAPP_FORMATO_SYSTEM_BLOCK` (≤1500 caracteres, sin markdown web, tono conversacional) + `INSTRUCCION_WHATSAPP` + `BLINDAJE_WHATSAPP_POR_EJE` por eje. Coherente con la restricción de Meta. **Tensión intencional:** el cuerpo base prohíbe brevedad extrema en web (500–800 palabras), mientras WA exige concisión — son reglas de canal distintas, no un bug.

### ¿La memoria de sesión se inyecta en el lugar correcto?

**Sí.** `chainIntentVoiceEmotionMemory` encadena en orden fijo: intent → voz → emoción → **memoria** → blindaje WA → fuentes. `buildMemoryContextBlock` (`sessionMemory.ts`) antepone disclaimer: "no es instrucción nueva; solo contexto de sesiones anteriores". TTL 30 días en KV.

### ¿Hay redundancias o contradicciones entre bloques?

| # | Tipo | Detalle |
|---|------|---------|
| 1 | Contradicción producto | "Puente de escucha" obligatorio vs prohibición de pedir aportes comunitarios al cierre |
| 2 | Idioma mixto | `SISTEMA_ONDA_GLOBAL` inicia en portugués; reglas largas en español — mitigado por `buildOutputLanguageLockAppend` |
| 3 | Doc desactualizada | `docs/ONDA-COMPORTAMIENTO-Y-FLUJO-COMPLETO.md` lista 5 puntos de filtro; `.cursorrules` y `FILTRO_AUDITORIA_Y_CONSTITUCION` tienen 6 (falta integridad de terceros) |
| 4 | Código muerto | `ONDA_LIMIT_MESSAGES` en `content/shared.ts` sin import en routes |
| 5 | UI vs API | `rag_used` emitido por stream pero no consumido en `ChatPageContent` / `ChatBubble` |
| 6 | Env naming | Código usa `WHATSAPP_WEBHOOK_SECRET`; docs y `example.env` también mencionan `WHATSAPP_APP_SECRET` / `META_APP_SECRET` |
| 7 | Doble emoción | Intent `emotional` + `detectEmotionalLoad` — complementarios, no idénticos; puede reforzar validación emocional dos veces |

---

## 4. Cobertura de tests

### Total

| Suite | Archivos | Casos |
|-------|----------|-------|
| Vitest unitarios | 43 (35 en `tests/` + 8 co-located en `lib/`) | **282** |
| Evals (datasets `.jsonl`) | 17 archivos | **179** casos totales |
| Evals CI gate (`DATASET_FILES_CI`) | 12 archivos | **104** casos (fixture, sin LLM en CI) |
| Evals full (`DATASET_FILES`) | 6 archivos | **85** casos (con LLM) |

### Tests por módulo (archivos con cobertura)

| Módulo / área | Archivo de test | Tests aprox. |
|---------------|-----------------|--------------|
| promptSafety | `tests/unit/promptSafety.test.ts` | 16 |
| intentClassifier | `tests/unit/intentClassifier.test.ts` | 6 |
| ondaVoice | `tests/unit/ondaVoice.test.ts` | 28 |
| sessionMemory | `tests/unit/sessionMemory*.test.ts` | 13 |
| waCompliance | `tests/unit/waCompliance*.test.ts` | 17 |
| waDedupe | `tests/unit/waDedupe.test.ts` | 7 |
| waWindowGuard | `tests/unit/waWindowGuard.test.ts` | 7 |
| validateMedia | `tests/unit/validateMedia.test.ts` | 16 |
| circuitBreaker | `tests/unit/circuitBreaker.test.ts` | 3 |
| webhook HMAC | `tests/unit/webhookHandshake.test.ts`, `lib/verifyWebhookSignature.test.ts` | 15 |
| waSession / templates / queue | `waSession`, `waTemplates`, `waMessageQueue` | 20 |
| disinfo360 prompt order | `tests/unit/disinfo360PromptOrder.test.ts` | 17 |
| transparency / risk modes | `ondaReplyTransparency`, `transparencyMode`, `riskModes` | 21 |
| env example vars | `tests/unit/envExampleVars.test.ts` | 25 |
| regression prompts | `tests/regression/promptRegression.test.ts` | 2 |
| evals judges | `evals/judges/*.test.ts`, `evals/regression.test.ts` | ~15 |

### Módulos auditados SIN tests dedicados

| Módulo | Riesgo |
|--------|--------|
| `lib/responseCache.ts` | Medio — lógica de TTL y heurísticas temporales sin validar |
| `lib/promptOptimizer.ts` | Medio — truncado de prompts críticos sin test |
| `lib/telemetry.ts` (core) | Bajo — `insightsTelemetry` sí tiene tests |
| `lib/spendingAlert.ts` | Alto — umbrales y webhook sin test |
| `lib/impactMetrics.ts` | Alto — métricas de donantes sin test |
| `lib/auditStore.ts` | Alto — purge/GDPR delete sin test |
| `lib/rateLimiter.ts` | Medio — usado en producción, sin test directo |
| `lib/ondaReply.ts` | Medio — parcialmente cubierto por transparency/disinfo360 |
| `lib/searchWeb.ts`, `lib/rag.ts`, `lib/firebaseRag.ts` | Medio — RAG/web sin tests unitarios |

### Evals de regresión: ¿cubren las 5 clases de intent?

**Parcialmente.** Los datasets cubren safety, neutralidad, disinfo360, transparencia, multiformato, WhatsApp, emergencia y las 3 Ondas — pero **no hay un dataset dedicado por cada intent**. Cobertura indirecta:

| Intent | Cobertura en evals |
|--------|-------------------|
| `fact_check` | Casos en `disinfo_360.jsonl`, `scams_screenshots.jsonl`, `links_paywall.jsonl` |
| `disinformation` | `disinfo_360.jsonl` (10 casos), rubrica `disinfo360Rubric.ts` |
| `emotional` | `emergency_kit.jsonl` (10 casos) — kits de crisis, no emoción cotidiana |
| `action` | Pocos casos explícitos; algunos en `a-mano.core.jsonl` |
| `explanation` | Mayoría de casos core por Onda (default intent) |

**Recomendación:** crear `evals/datasets/intent_coverage.jsonl` con 5+ casos por intent.

---

## 5. Variables de entorno

### Críticas (producción — sin ellas el bot degrada o falla)

| Variable | Uso | En `.env.example` | En `example.env` | `env:verify` |
|----------|-----|-------------------|------------------|--------------|
| `OPENAI_API_KEY` | Chat, TTS, Whisper, visión | ✅ | ✅ | ✅ crítica |
| `KV_REST_API_URL` | Dedupe, rate limit, sesión, cache, métricas | ✅ | ✅ | ✅ crítica |
| `KV_REST_API_TOKEN` | Idem | ✅ | ✅ | ✅ crítica |
| `WHATSAPP_ACCESS_TOKEN` | Envío WA | ✅ | ✅ | ✅ crítica |
| `WHATSAPP_PHONE_NUMBER_ID` | Envío WA | ✅ | ✅ | ✅ crítica |
| `WHATSAPP_VERIFY_TOKEN` | Handshake GET webhook | ✅ | ✅ | ✅ crítica |
| `WHATSAPP_WEBHOOK_SECRET` | Firma HMAC POST | ✅ | ✅ | ✅ crítica |
| `WHATSAPP_LOG_PEPPER` | Hash teléfonos en logs | ✅ | ✅ | ✅ crítica |
| `WHATSAPP_DIAG_TOKEN` | Protección GET diagnóstico | ✅ | ✅ | ✅ crítica |
| `ADMIN_SECRET` | Panel admin, purge | ❌ | ✅ | ✅ crítica |

### Importantes (producción WA completa — opcionales en verify)

| Variable | Uso | En `.env.example` | En `example.env` |
|----------|-----|-------------------|------------------|
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Admin Meta / diagnóstico | ✅ | ✅ |
| `META_APP_SECRET` | Alias de webhook secret | ✅ | ✅ |
| `WHATSAPP_APP_SECRET` | Usado en `waWebhookEnv.ts` | ❌ | ✅ |
| `GRAPH_VERSION` | Versión Graph API (default v24.0) | ✅ | ✅ |
| `WHATSAPP_TEMPLATE_REACTIVATION` | Fuera de ventana 24h | ✅ | ✅ |
| `WHATSAPP_TEMPLATE_WELCOME_OPTIN` | Primer contacto | ✅ | ✅ |
| `WHATSAPP_TEMPLATE_SERVICE_NOTICE` | Avisos de servicio | ✅ | ✅ |
| `WHATSAPP_TEMPLATE_LANGUAGE` | Idioma plantillas (default es) | ✅ | ✅ |

### Opcionales (funcionalidad degradada sin ellas)

| Variable | Uso | En `.env.example` | En `example.env` |
|----------|-----|-------------------|------------------|
| `ANTHROPIC_API_KEY` | Fallback Claude (deep) | ❌ | ✅ |
| `GOOGLE_GENERATIVE_AI_API_KEY` / `GEMINI_API_KEY` / etc. | Fallback Gemini | ❌ | comentado |
| `TAVILY_API_KEY` | Búsqueda web (prioridad 1) | ✅ | ✅ |
| `SERPER_API_KEY` | Búsqueda web (prioridad 2) | comentado | comentado |
| `FIREBASE_*` | RAG privado Precisar | ❌ | comentado |
| `SPENDING_ALERT_DAILY_USD` | Umbral alerta (default 5) | ❌ | comentado |
| `SPENDING_ALERT_CRITICAL_USD` | Umbral crítico (default 20) | ❌ | comentado |
| `SPENDING_ALERT_WEBHOOK_URL` | Slack/Discord alertas | ❌ | comentado |
| `WHATSAPP_LOG_DEBUG` | Preview texto en logs (solo dev) | ✅ | ✅ |
| `KV_REST_API_READ_ONLY_TOKEN` | Vercel linking | ✅ | ❌ |
| `KV_URL` | Vercel linking | ✅ | ❌ |
| `NEXT_PUBLIC_ONDA_PUBLIC_URL` | URL canónica chat | ❌ | comentado |
| `NEXT_PUBLIC_ONDA_ORANGE` | Color UI | ❌ | comentado |
| `OPENAI_TTS_VOICE` / `OPENAI_TTS_MODEL` | Voz "Escuchar" | ❌ | comentado |
| `NODE_ENV` | production / development | implícito | implícito |
| `CI` | Flag CI en evals | implícito | implícito |

### Coherencia entre `.env.example` y `example.env`

| Aspecto | Estado |
|---------|--------|
| Variables WhatsApp core (12 críticas del test) | ✅ Ambos las incluyen (`envExampleVars.test.ts` las valida) |
| Secrets de privacidad (LOG_PEPPER, DIAG_TOKEN) | ✅ Documentados en ambos con instrucciones `secrets:generate` |
| `ADMIN_SECRET` | ⚠️ Solo en `example.env`; **falta en `.env.example`** |
| `ANTHROPIC_API_KEY`, Firebase, spending | ⚠️ Solo en `example.env` |
| `WHATSAPP_APP_SECRET` | ⚠️ Solo en `example.env` |
| `KV_READ_ONLY` / `KV_URL` | ⚠️ Solo en `.env.example` |
| Estilo de valores | `.env.example` = vacío; `example.env` = placeholders dev (`sk-...`, `EAAxxxx`) |
| Heurística anti-secretos | Test valida que `.env.example` no contiene tokens reales |

---

## 6. Deuda técnica encontrada

### Código legacy / sin documentar

- `buildOndaSystemContent()` en `ondaReply.ts` — builder simplificado sin intent/voz/emoria; ruta que lo usaba eliminada (`docs/REPORTE-SALUD-CODIGO.md`).
- `lib/rag.ts` — stub con TODO para Pinecone/Supabase Vector.
- `WA_TECHNICAL_REPLY_PT` — mensaje de error técnico siempre en portugués, independiente del locale de sesión.
- `WA_IMAGE_VALIDATION_REPLY` — usa voseo ("Podés"), inconsistente con reglas de español neutro.

### Funciones duplicadas

- `kvConfigured()` / `isKvConfigured()` — copy-paste en `rateLimiter`, `waCompliance`, `waDedupe`, `waSession`, `responseCache`, `spendingAlert` (6+ módulos).
- Normalización de teléfono — `waCompliance.phoneKey` vs `waMessageQueue.normalizePhoneForLock`.
- Validación de audio — potencialmente ejecutada en webhook y de nuevo en `transcribe.ts`.
- Chequeo de ventana 24h — en `waCompliance`, `waWindowGuard` y checks inline en route para TTS/imágenes.

### TODOs pendientes en código

| Archivo | Línea | Descripción |
|---------|-------|-------------|
| `lib/auditStore.ts` | 119 | `rewriteList` necesita `kv.del` para purga física |
| `lib/auditStore.ts` | 247 | `deleteUserData` no-op sin KV/`del` |
| `lib/rag.ts` | 11 | Futuro vector store Pinecone/Supabase |

### Artefactos definidos pero no cableados

- `ONDA_LIMIT_MESSAGES` en `content/shared.ts` — exportado, nunca importado en routes.
- `rag_used` / `web_search_used` — emitidos por API, no consumidos en UI.

### Bugs menores detectados

- `lib/telemetry.ts` `checkKvConnectivity` — retorna `"ok"` incluso si respuesta ≠ `"PONG"`.
- `lib/waDedupe.ts` — JSDoc documenta fail-closed en error KV; implementación es fail-open (memoria).

---

## 7. Riesgos de producción

### ¿Qué puede fallar en los primeros 100 usuarios de WA?

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| **KV no configurado** | Media (si ops olvida) | Alto | Dedupe roto → respuestas duplicadas; opt-out no persiste; locks ineficaces. Verificar con `npm run env:verify` antes de deploy. |
| **Plantillas HSM no aprobadas** | Alta (Meta tarda 24–48h) | Alto | Usuarios fuera de ventana 24h reciben silencio. Configurar `WHATSAPP_TEMPLATE_REACTIVATION`. |
| **Lock 25s por teléfono** | Media | Medio | Mensajes rápidos consecutivos del mismo usuario se descartan sin aviso. |
| **Cold start Vercel** | Alta (plan free) | Medio | Primera respuesta hasta 15s; usuario puede reenviar → dedupe salva si KV OK. |
| **Error técnico en PT** | Baja | Bajo | `WA_TECHNICAL_REPLY_PT` confunde usuarios hispanohablantes. |
| **Secrets faltantes** | Media | Alto | Sin `WHATSAPP_LOG_PEPPER` → hashes predecibles; sin `WHATSAPP_DIAG_TOKEN` → métricas expuestas. |

### ¿Qué pasa si el volumen sube a 1000 mensajes/día?

| Dimensión | Análisis |
|-----------|----------|
| **Rate limit** | 20 msg/min/usuario = 1200/hr por número. Promedio ~42 msg/hr total → sin problema. |
| **KV** | ~1000 writes/día (dedupe + window + lock + session) → trivial para Upstash. |
| **Costo API** | ~1000 llamadas LLM/día + Whisper/TTS → principal driver de costo. Alertas en `spendingAlert.ts`. |
| **Circuit breaker** | 3 fallos de proveedor → OPEN para **todos** los usuarios. Monitorear health. |
| **Caché** | `responseCache` reduce llamadas repetidas; emotional nunca cacheado. |
| **Serverless timeout** | Cadenas largas (LLM + TTS + imagen) pueden truncarse incluso con `waitUntil`. |
| **Audit store** | LIST cap 50k; sin purge automático → crecimiento lineal. |

### Single points of failure

1. **Vercel KV (Upstash, São Paulo)** — dedupe, compliance, sesión, cache, métricas, circuit breaker, spending. Todo fail-open sin KV.
2. **OpenAI API** — proveedor primario; fallback a Anthropic/Gemini vía circuit breaker.
3. **Vercel serverless** — cold starts, timeouts, dependencia de `waitUntil`.
4. **Meta WhatsApp API** — ventana 24h, plantillas, rate limits de Meta (independiente de Onda).
5. **Firebase/Firestore** — RAG privado; sin él el bot funciona pero sin evidencias internas Precisar.

---

## Anexo: stack confirmado

| Componente | Tecnología |
|------------|------------|
| Framework | Next.js 14 App Router |
| Hosting | Vercel |
| KV | Upstash KV via `@vercel/kv` (São Paulo) |
| RAG | Firebase/Firestore |
| LLM primario | OpenAI (gpt-4o-mini + gpt-4o) |
| Fallback | Anthropic Claude, Google Gemini |
| Imágenes | sharp |
| Audio | ffmpeg-static + ffprobe |
| Tests | Vitest 4.x (282 tests) |
| Evals | Custom runner + heurísticas + baseline CI (104 casos) |

---

*Auditoría read-only. Generada a partir de lectura de código fuente, tests, evals, documentación operativa y ejecución de `npm test` (282/282 en verde).*
