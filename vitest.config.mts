import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Mirrors the "@/*" -> "./*" path mapping in tsconfig.json.
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "features/**/lib/**/*.ts",
        "features/finance/utils.ts",
        "lib/utils/**/*.ts",
      ],
    },
  },
});
