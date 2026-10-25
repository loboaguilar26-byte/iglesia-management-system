import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // server-only lanza error fuera de React Server Components; en pruebas no aplica.
      "server-only": fileURLToPath(new URL("./tests/support/empty.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/support/global-setup.ts"],
    setupFiles: ["tests/support/env.ts"],
    // Las pruebas de integración comparten una base de datos: se ejecutan en serie.
    fileParallelism: false,
    testTimeout: 20000,
  },
});
