import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

// Las pruebas E2E usan la base de pruebas (nunca la de desarrollo) y el build de producción.
export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL, trace: "retain-on-failure", locale: "es-MX", timezoneId: "America/Mexico_City" },
  projects: [
    { name: "escritorio", use: { ...devices["Desktop Chrome"] }, grepInvert: /@movil/ },
    { name: "movil", use: { ...devices["Pixel 7"] }, grep: /@movil/ },
  ],
  webServer: {
    // Se invoca Next directamente: a través de pnpm, en Windows el servidor no se cierra al terminar.
    command: `node node_modules/next/dist/bin/next start --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "",
      BETTER_AUTH_URL: baseURL,
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "",
      // Cada prueba simula una IP distinta (ver e2e/helpers.ts) para aislar el límite de intentos.
      AUTH_IP_HEADERS: "x-forwarded-for",
    },
  },
});
