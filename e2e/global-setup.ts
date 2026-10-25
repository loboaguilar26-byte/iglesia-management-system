import "dotenv/config";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

/**
 * Prepara la base de pruebas: migra, vacía, siembra y crea usuarios con contraseñas aleatorias
 * de esta ejecución (se guardan en e2e/.data/, ignorado por git).
 */
export default async function globalSetup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url || !/test/i.test(new URL(url).pathname)) {
    throw new Error("TEST_DATABASE_URL debe apuntar a una base cuyo nombre contenga 'test'.");
  }
  execSync("pnpm exec prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
  mkdirSync("e2e/.data", { recursive: true });
  execSync("pnpm exec tsx e2e/prepare-db.ts", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url, E2E_OUTPUT: "e2e/.data/users.json" },
  });
  // Marca de tiempo para depurar ejecuciones.
  writeFileSync("e2e/.data/last-run.txt", new Date().toISOString());
}
