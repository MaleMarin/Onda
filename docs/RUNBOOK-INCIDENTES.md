# Runbook de incidentes — Onda / Precisar

## Checklist de diagnóstico rápido (primeros 5 minutos)

1. ¿El health endpoint responde?

   ```bash
   curl https://onda2026.vercel.app/api/admin/health | jq
   ```

2. ¿Cuál es el status?

   - ok → el problema es específico de un usuario
   - degraded → revisar circuit breakers y latencia
   - down → revisar proveedores de IA y KV

3. ¿Vercel está caído?

   <https://www.vercel-status.com/>

4. ¿OpenAI está caído?

   <https://status.openai.com/>

5. ¿Anthropic está caído?

   <https://status.anthropic.com/>

## Escenarios y soluciones

### OpenAI devuelve 429 (rate limit)

- El circuit breaker abre automáticamente tras 3 fallos
- El bot pasa a Anthropic/Gemini automáticamente
- Si persiste: revisar `SPENDING_ALERT_CRITICAL_USD` en Vercel env
- Acción: subir tier en OpenAI o reducir `SPENDING_ALERT_DAILY_USD`

### KV no responde

- Rate limiting y caché operan en fail-open (el bot sigue funcionando)
- Verificar en Vercel Dashboard → Storage → KV
- Acción: revisar variables `KV_REST_API_URL` / `KV_REST_API_TOKEN`

### WhatsApp no recibe mensajes

1. Verificar `WHATSAPP_WEBHOOK_SECRET` en Vercel env
2. Verificar en Meta Developers que el webhook apunta a: `https://onda2026.vercel.app/api/webhook`
3. Verificación GET (sustituye `TU_TOKEN`):

   ```bash
   curl -G "https://onda2026.vercel.app/api/webhook" \
     --data-urlencode "hub.mode=subscribe" \
     --data-urlencode "hub.verify_token=TU_TOKEN" \
     --data-urlencode "hub.challenge=test"
   ```

### Respuestas muy lentas (>10s)

- Verificar `GET /api/admin/spending` → modelos con alta latencia
- Verificar si el prompt optimizer está activándose (log: `[prompt] optimizado`)
- Acción: reducir `MAX_CONTEXT_CHARS` en `promptOptimizer.ts`

### Cold start de Vercel lento

- Normal en plan gratuito: hasta 15s en primera request
- Solución: Vercel Pro tiene warm functions
- Workaround: cron job externo que hace ping cada 5 min

## Contactos de escalada

- Vercel: <https://support.vercel.com>
- OpenAI: <https://platform.openai.com/support>
- Meta/WhatsApp: <https://developers.facebook.com/support>

## Post-mortem

Después de cada incidente de más de 30 minutos, documentar en `docs/POSTMORTEMS/` con: qué pasó, cuándo, impacto, causa raíz, solución aplicada, qué se mejora.
