# Auditoría de integración — ONDA (web + WhatsApp)

Documento único que alinea **código**, **variables** y **documentación** tras las revisiones de marzo 2026.  
Si otro doc del repo contradice esto, **prevalece este archivo** salvo que se actualice explícitamente.

---

## 1. Roles de los números (WhatsApp / Meta)

| Rol | Número (ejemplo proyecto) | Qué es |
|-----|---------------------------|--------|
| **Número del bot (FROM / Business)** | `+56 9 9155 3279` (ONDA) | Al que la gente **escribe** para hablar con el bot. Debe estar **conectado a la misma app** en Meta que tiene el webhook. |
| **Phone Number ID en Vercel** | `886309674569527` | ID de **ese** número de negocio en Meta. Va en `WHATSAPP_PHONE_NUMBER_ID`. **No** confundir con el ID del número de prueba de sandbox. |
| **Número de prueba Meta (sandbox)** | `+1 555 157 6862` | Solo en modo desarrollo; su Phone Number ID suele ser `918128831381165`. Sirve para pruebas si **no** tenés aún el 3279 en la app. |
| **Destinatario de prueba (Paso 3 API)** | Ej. `+56 9 7725 1396` | **Tu** celular: número desde el que **enviás** mensajes **al bot**. Meta pide verificarlo con código por WhatsApp. **No** es el número del bot. |

**Error frecuente:** Agregar el **3279** como “destinatario” en el Paso 3. El destinatario es quien **escribe** al bot (tu 1396), no el número ONDA.

**Por qué no hay logs en Vercel:** Si escribís al 3279 pero en Meta el “Desde” / la app solo tiene el **+1 555…**, los mensajes al 3279 pueden no pasar por **esta** app → el webhook no se llama → logs vacíos. Solución: que el **Phone Number ID** en Vercel coincida con el número al que realmente escribís (copiar ID desde Meta → WhatsApp → el número activo).

---

## 2. Variables de entorno (Vercel / `.env`)

| Variable | Origen |
|----------|--------|
| `WHATSAPP_VERIFY_TOKEN` | Lo definís vos; **mismo** valor en Meta (webhook) y en Vercel. Ej. documentado: `onda_verify_precisar_2026`. |
| `WHATSAPP_ACCESS_TOKEN` | Meta → token temporal o permanente (Configuración del negocio / usuario del sistema). **Nunca** commitear el valor real. |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta → **Phone number ID** del número **FROM** que usás (ONDA real: `886309674569527` si el número es +56 9 9155 3279). |
| `WHATSAPP_APP_SECRET` | Opcional; si está mal, el POST del webhook puede devolver 403. |
| `OPENAI_API_KEY` | Obligatorio para chat web y WhatsApp. |

---

## 3. Web (Precisar)

- **API:** `POST /api/chat/stream` — texto, imagen, audio (data URL webm).
- **Audio:** `lib/transcribe.ts` — webm/ogg → WAV 16 kHz mono con `ffmpeg-static` antes de Whisper; mínimo ~12 KB; códigos `TRANSCRIBE_ERROR` en errores.
- **Errores de stream:** Si fallan stream y fallback GPT-4o, `getOndaReplyStream` emite respuesta de emergencia ONDA (`EMERGENCY_ONDA_REPLY`). El route ya no usa el texto “Uy, se cortó la conexión…” como único fallback vacío.

---

## 4. WhatsApp

- **Webhook:** `GET` verificación; `POST` mensajes — `app/api/webhook/route.ts`.
- **Logs:** `[webhook] POST recibido` en cada POST (producción) para diagnosticar si Meta llama.

---

## 5. Documentos del repo a mantener alineados

- `ACTUALIZAR-PHONE-ID.md` — ID `886309674569527` para ONDA.
- `docs/WHATSAPP-CONFIG.md` — tabla de datos y advertencia sobre tokens viejos.
- `SOLUCION-ERROR-META.md` — **sin** tokens reales pegados (solo placeholders).
- `EXPLICACION-NUMEROS.md` — distinguir sandbox vs número ONDA real vs destinatario.

---

## 6. Checklist rápido “no responde WhatsApp”

1. ¿`WHATSAPP_PHONE_NUMBER_ID` en Vercel = ID del número al que escribís en Meta (misma fila en Prueba de API)?
2. ¿Webhook verificado y campo **`messages`** suscrito?
3. ¿Tu número personal agregado y verificado en **Paso 3** (destinatario)?
4. ¿`WHATSAPP_APP_SECRET` vacío o igual al App Secret de Meta?
5. ¿Logs en Vercel al enviar un mensaje?

---

*Última revisión: marzo 2026.*
