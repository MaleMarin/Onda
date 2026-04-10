# Tests de integración (opcional)

Este directorio es para pruebas que dependen de **red**, **servidor local** u otros servicios. **No** se ejecutan con `npm test`; usá:

```bash
npm run test:integration
```

Configuración: `vitest.integration.config.ts` (timeouts más largos, `passWithNoTests` si aún no hay archivos).
