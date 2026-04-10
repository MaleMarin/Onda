# Baseline aprobado (`approved.json`)

Este archivo es la **referencia de regresión** para `npm run evals:ci` cuando `EVALS_COMPARE_BASELINE=1`.

- **Origen:** copia de `artifacts/evals/ci-smoke/latest.json` tras una corrida CI exitosa.
- **Actualizar:** `npm run evals:approve` (solo cuando el cambio de puntuaciones o casos sea **intencional**, p. ej. nuevos datasets o ajuste de umbrales).
- **CI:** `.github/workflows/evals.yml` ejecuta evals con comparación contra este baseline y falla el job si hay regresión (`EVALS_FAIL_ON_REGRESSION=1`).

No edites `approved.json` a mano salvo emergencia; regenerá con el flujo anterior para mantener consistencia.
