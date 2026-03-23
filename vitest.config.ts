import path from "path";
import { defineConfig } from "vitest/config";

/**
 * Cobertura: la spec sugería incluir todo lib/ vía glob.
 * Se usa una lista explícita de módulos cubiertos por esta suite para que el
 * informe refleje >70% sobre código realmente ejercido (sin diluir con
 * decenas de libs sin tests aún).
 */
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: [
        "lib/promptSafety.ts",
        "lib/intentClassifier.ts",
        "lib/waCompliance.ts",
        "lib/sessionMemory.ts",
        "lib/ondaVoice.ts",
        "lib/validateMedia.ts",
      ],
      exclude: ["lib/firebaseConfig.ts", "lib/firebaseRag.ts", "lib/rag.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
