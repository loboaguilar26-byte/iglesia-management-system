import "dotenv/config";
import { execSync } from "node:child_process";

/** Aplica las migraciones a la base de pruebas antes de ejecutar la suite. */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("Define TEST_DATABASE_URL para ejecutar las pruebas.");
  if (!/test/i.test(new URL(url).pathname)) {
    throw new Error("TEST_DATABASE_URL debe apuntar a una base cuyo nombre contenga 'test'.");
  }
  execSync("pnpm exec prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
}
