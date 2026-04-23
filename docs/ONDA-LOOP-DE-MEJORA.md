# ONDA — Loop de mejora con Insights

Este documento enlaza la telemetría agregada (`lib/insightsTelemetry.ts`, listas `onda_events:YYYY-MM-DD`) con decisiones de producto y contenido **sin** usar el texto completo de las conversaciones (privacidad por diseño).

## Cómo interpretar los insights

1. **Top tags** (`GET /api/insights/summary?range=7d`): agrupan temas (estafa, cadena_whatsapp, civita_institución, etc.). Son heurísticos; no sustituyen lectura cualitativa de políticas o evals.
2. **Top intents** (`detected_intent`): orientan si la gente pide verificación, pasos, o contexto institucional.
3. **Formato y fuentes**: `format_counts` y `sources_requested_pct` muestran si el canal pide más infografía/audio o evidencias explícitas.
4. **Fricción**: `friction_buckets` y `top_errors` señalan días o códigos (`stream_failed`, `stream_partial`, errores de proveedor) para priorizar ingeniería.
5. **Latencia**: `avg_latency_ms` ayuda a ver si el cuello de botella es contexto (RAG/web) o modelo.

## Cómo decidir cambios

| Señal en datos | Posible acción (ejemplos) |
|----------------|---------------------------|
| Mucho `estafa` + `link_noticia` | Refinar menú A Mano o guías visibles; no cambiar modelo sin hipótesis. |
| Alto `stream_partial` | Revisar timeouts y streaming; tests de carga en `app/api/chat/stream`. |
| Bajo `sources_requested_pct` en temas sensibles | Ajustar **copy** de la UI o sugerencias, no forzar fuentes en todas las respuestas. |
| Picos `civita_institucion` | Actualizar `content/shared` o FAQs institucionales; validar neutralidad. |

**Regla:** cambios de **prompt/modelo** solo con ticket + evals (`npm run evals:ci`) y revisión editorial (`.cursor/rules`).

## Cómo medir si mejoró

1. **Antes / después**: guardar un export CSV (`GET /api/insights/export.csv?range=30d`) antes del cambio y comparar a los 14–30 días la misma métrica (error rate, latencia, tag dominante).
2. **Evals deterministas**: `EVALS_MODE=deterministic npm run evals` — deben seguir verdes tras toques de prompt.
3. **Métricas de impacto existentes**: `lib/impactMetrics.ts` y `lib/auditStore` complementan insights (no duplicar PII).

## Variables de entorno

- `INSIGHTS_SECRET`: token obligatorio en producción para `/api/insights/*`.
- `TELEMETRY_TTL_DAYS`: retención aproximada de la lista diaria en Redis (por defecto 30).
- `KV_REST_API_URL` / `KV_REST_API_TOKEN`: mismas credenciales que `auditStore`; sin KV, los eventos solo viven en memoria del proceso (útil en dev).

## Herramientas

- Resumen JSON: `GET /api/insights/summary?range=7d|30d` con header `Authorization: Bearer $INSIGHTS_SECRET` (en `NODE_ENV=development` el endpoint permite acceso sin token).
- CSV agregado: `GET /api/insights/export.csv?range=30d`.
- Informes Markdown: `npm run insights:report` → `docs/INSIGHTS-WEEKLY.md` y `docs/INSIGHTS-MONTHLY.md`.

## Opt-out y privacidad

- Web: el usuario puede enviar `insightsOptOut: true` en el cuerpo del POST, `telemetry: false`, o texto tipo “no guardar analítica”.
- WhatsApp: si el número está en opt-out de compliance (`lib/waCompliance`), no se registran eventos de insights.
