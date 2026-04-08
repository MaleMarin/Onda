# Evaluaciones Onda (evals/)

Capa local para medir calidad de respuestas (claridad, precisión, neutralidad, utilidad, seguridad, consistencia entre canales) sin depender de servicios externos de evaluación.

## Qué mide

- **Juez heurístico (siempre):** reglas por `must_include` / `must_not_include`, longitud, estructura, canal (WhatsApp más breve), términos de riesgo, patrones de inyección y algo de lenguaje partidista en Civita.
- **Juez LLM (opcional):** por defecto está **apagado** (evita costo). Activar con `EVALS_LLM_JUDGE=1` y `OPENAI_API_KEY`. Si falla la API o el parseo, se sigue solo con heurística.

## Modos

| Modo | Comportamiento |
|------|----------------|
| `deterministic` | `getOndaReply` con contexto congelado (campo `context` del caso + snippets simulados de web/RAG salvo que desactives mocks vía código). |
| `integration` | Web: `POST /api/chat/stream` al `EVALS_BASE_URL`. WhatsApp: `getOndaReply` con `canal: whatsapp` (misma lógica que el producto). |

## Correr

```bash
# Requiere OPENAI_API_KEY (u otro proveedor según orquestador) salvo que uses solo fixtures
npm run evals                  # alias determinista
npm run evals:deterministic
npm run evals:integration      # en web hace falta `npm run dev` en paralelo (puerto 3020 por defecto)

# Regenerar solo el Markdown desde el último JSON
npm run evals:report

# CI barato: solo `evals/datasets/ci-smoke.core.jsonl` con fixture_reply (sin llamadas al modelo)
npm run evals:ci
```

Salida:

- **Full** (`npm run evals`): `artifacts/evals/latest.json`, `latest.md`, `history/run-*.json`
- **Smoke CI** (`npm run evals:ci`): `artifacts/evals/ci-smoke/latest.json` (y mismos nombres ahí) — **no pisa** el informe full.

Ver también [docs/CI.md](../docs/CI.md).

Variables útiles:

- `EVALS_BASE_URL` — default `http://127.0.0.1:3020`
- `EVALS_FIXTURE_REPLY=1` — si el caso define `fixture_reply`, no llama al modelo para ese caso
- `EVALS_LLM_JUDGE=1` — mezcla juicio LLM con heurística
- `EVALS_FAIL_ON_REGRESSION=1` — exit code 1 si el informe marca regresión
- `EVALS_DATASET_MODE=ci` — usa solo datasets listados en `DATASET_FILES_CI` (`evals/config.ts`), pensado para `npm run evals:ci`

**Separación de costos:** `npm run evals:ci` valida juez + regresión sobre textos fijos. `npm run evals` sigue midiendo respuestas reales del modelo (requiere API keys y tiempo).

## Agregar casos

1. Editá o creá un `.jsonl` en `evals/datasets/` (una línea = un JSON por caso).
2. Campos típicos: `id`, `onda` (`a-mano` \| `civita` \| `profes`), `channel`, `category`, `difficulty`, `input`, `context`, `must_include`, `must_not_include`, `expectations` (`*_min` 1–5), `risk_tags`, `pair_id` (para cruzar web/WhatsApp), `fixture_reply` (opcional, con `EVALS_FIXTURE_REPLY=1`).

Regenerar los núcleos por defecto (opcional):

```bash
node scripts/generate-eval-datasets.mjs
```

## Regresiones

Antes de escribir `latest.json`, se lee la corrida anterior. Se marcan:

- caída de media global o de medias de dimensiones vigiladas;
- un caso que pasaba y ahora falla, o dimensiones críticas por Onda (ver `evals/config.ts`).

## Tests unitarios del juez

```bash
npx vitest run evals/judges/heuristicJudge.test.ts
```

## Limitaciones

- Las heurísticas no sustituyen juicio humano ni un panel de revisión.
- La consistencia cross-channel depende de que existan **dos** casos con el mismo `pair_id` (web y WhatsApp).
- Modo integración web depende de red, rate limits y del servidor local.

## Siguiente fase sugerida

- Umbral de fallo en CI (`EVALS_FAIL_ON_REGRESSION` + caché del último JSON aprobado).
- Playwright mínimo solo para smoke del endpoint si hace falta fuera del fetch en `tsx`.
- Más casos con `fixture_reply` para correr sin API en pipelines.
