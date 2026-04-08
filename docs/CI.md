# CI y evaluaciones — qué corre dónde

## Resumen

| Flujo | Dónde | Bloquea PR | API keys |
|-------|--------|------------|----------|
| **verify** | `.github/workflows/ci.yml` — `tsc`, Vitest, `next build` | Sí (job estándar) | No |
| **validate-quick** | mismo workflow, después de `verify` — Playwright (`test:e2e`), `npm run evals:ci` | Sí (segundo job) | No |
| **evals-full** | `.github/workflows/evals-full.yml` — `npm run evals` (datasets completos) | No (manual o cron) | Sí: `OPENAI_API_KEY` en secrets |

En GitHub: en **branch protection** podés exigir que pasen los checks `verify` y `validate-quick`. El workflow **Evals full** no debe ser obligatorio en cada push.

## Artefactos de evals (sin confusión)

| Comando | Carpeta de salida | Contenido típico |
|---------|-------------------|------------------|
| `npm run evals` / `evals:deterministic` | `artifacts/evals/` | `latest.json`, `latest.md`, `history/` — **run completo** |
| `npm run evals:ci` | `artifacts/evals/ci-smoke/` | Mismo formato, **solo** dataset smoke (fixtures, barato) |

`npm run evals:report` regenera el Markdown desde **`artifacts/evals/latest.json`** (full), no desde `ci-smoke`.

## Scripts locales

```bash
npm run test          # Vitest
npm run test:e2e      # Playwright (levanta dev en 3020)
npm run evals:ci      # Smoke sin modelo
npm run evals         # Full (requiere OPENAI_API_KEY salvo casos con fixture)
```

## Notas

- En algunos entornos sandbox, `tsx` puede fallar; en CI real de GitHub suele estar bien.
- Playwright en CI instala **Firefox** (`npx playwright install --with-deps firefox`), alineado a `playwright.config.ts`.
