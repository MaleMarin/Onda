import path from "path";
import { defineConfig } from "vitest/config";

/**
 * Suite opcional: pruebas que hablan con red, servidor local o servicios reales.
 * Ejecutar: npm run test:integration
 * No forma parte de `npm test` (unitarios rápidos, sin hang en CI/Cursor).
 */
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/integration/**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
    passWithNoTests: true,
    testTimeout: 60_000,
    hookTimeout: 30_000,
    teardownTimeout: 10_000,
    pool: "forks",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
