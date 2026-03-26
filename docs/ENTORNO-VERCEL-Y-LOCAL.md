# Entorno: Vercel y `.env.local` (Onda / ondabot)

## Lo más simple (comandos fijos)

Usá **siempre estos mismos** en la carpeta del proyecto:

| Qué querés hacer | Comando |
|------------------|---------|
| Ver el bot en el navegador | `npm run dev` → abrí **http://localhost:3020** |
| Traer variables desde Vercel a tu Mac | `npm run env:pull` |
| Comprobar que el código no rompió nada | `npm test` |
| Subir cambios a GitHub (vos elegís el mensaje) | `git add -A && git commit -m "tu mensaje" && git push` |

**`env:pull`** sobrescribe `.env.local`. Si tenés claves que **solo** existen en tu Mac (no en Vercel), hacé un respaldo antes: `npm run env:local-backup`.

---

Evita que un pull borre claves que solo tenías en local (Anthropic, Firebase, Tavily, etc.): usá el flujo “seguro” más abajo con `npm run env:vercel-pull`.

---

## Regla de oro

**No elijas “Overwrite `.env.local`”** sin antes copiar de respaldo:

```bash
cp .env.local .env.local.respaldo-$(date +%Y%m%d-%H%M)
```

---

## Flujo seguro para traer variables desde Vercel

1. En la carpeta del repo (con `npx vercel link` ya hecho):

   ```bash
   npm run env:vercel-pull
   ```

   Eso genera **`.env.vercel.snapshot`** (no toca `.env.local`). Usa `npx vercel` para no depender del CLI instalado global.

2. Abrí **dos archivos** en el editor: tu `.env.local` y `.env.vercel.snapshot`.

3. **Copiá** desde el snapshot solo lo que quieras actualizar (por ejemplo tokens de WhatsApp rotados).

4. **Mantené** en `.env.local` las claves que **no** están en Vercel (Anthropic, Firebase, Tavily…) si las usás en local.

5. Borrá `.env.vercel.snapshot` cuando termines si no querés dejarlo en disco (está ignorado por git).

---

## Qué debería existir en Vercel (proyecto `onda2026`)

Configurá en **Settings → Environment Variables** las mismas claves para **Production**, **Preview** y **Development** (o al menos Production + la que uses para preview).

| Variable | Uso |
|----------|-----|
| `OPENAI_API_KEY` | Chat, visión, transcripción, TTS, imágenes |
| `WHATSAPP_VERIFY_TOKEN` | Verificación GET del webhook |
| `WHATSAPP_ACCESS_TOKEN` | Enviar mensajes por la API de Meta |
| `WHATSAPP_PHONE_NUMBER_ID` | ID del número de WhatsApp |
| `WHATSAPP_WEBHOOK_SECRET` | Validar firma de los **POST** del webhook |
| `WHATSAPP_APP_SECRET` o `META_APP_SECRET` | Recomendado; diagnóstico en GET `/api/webhook` |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Rate limit, auditoría, métricas, circuit breaker |
| `ANTHROPIC_API_KEY` | Orquestador “deep” con Claude |
| `GOOGLE_GENAI_API_KEY` / `GEMINI_API_KEY` | Gemini cuando aplica |
| `TAVILY_API_KEY` | Búsqueda web (si la usás) |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | RAG / admin Firestore |
| `ADMIN_SECRET` | `/api/admin/*`, login del dashboard |
| `SPENDING_ALERT_DAILY_USD`, `SPENDING_ALERT_CRITICAL_USD` | Umbrales de alerta de gasto (opcional; por defecto 5 y 20) |
| `SPENDING_ALERT_WEBHOOK_URL` | Notificación opcional (Slack/Discord) al superar umbral |
| `API_KEY` | Fallback de Gemini en `geminiService` si no usás las otras claves Google |

Si una variable **no** está en Vercel y hacés `vercel env pull` **sobre** `.env.local` con overwrite, **desaparecerá** del archivo local.

---

## Comandos útiles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Chat en http://localhost:3020 |
| `npm run env:pull` | Descarga env de Vercel a **`.env.local`** (sobrescribe) |
| `npm run env:vercel-pull` | Descarga env a **`.env.vercel.snapshot`** (no toca `.env.local`) |
| `npm run env:local-backup` | Copia de seguridad de `.env.local` con fecha en el nombre |
| `npm test` | Tests automáticos |

---

## Comprobar webhook

`https://TU-DOMINIO/api/webhook` (GET sin parámetros) → JSON con `env_check`. Para WhatsApp hace falta que el **POST** sea aceptado: **`WHATSAPP_WEBHOOK_SECRET`** correcto y URL de callback igual al dominio desplegado.

---

## Referencias

- Plantilla local: `example.env` (raíz del repo).
- WhatsApp: `docs/WHATSAPP-CONFIG.md`.
- Incidentes: `docs/RUNBOOK-INCIDENTES.md`.
