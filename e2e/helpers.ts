import { readFileSync } from "node:fs";
import { test as base, expect, type Page } from "@playwright/test";

type TestUser = { name: string; email: string; password: string };

let ipCounter = 0;
/** IP de documentación (RFC 5737) única por contexto, para aislar el límite de intentos entre pruebas. */
export function uniqueIp() {
  ipCounter += 1;
  return `198.51.100.${(process.pid + ipCounter) % 250}`;
}

export const test = base.extend({
  context: async ({ context }, provide) => {
    await context.setExtraHTTPHeaders({ "x-forwarded-for": uniqueIp() });
    await provide(context);
  },
});
export { expect };

export function testUsers(): { admin: TestUser; secretary: TestUser } {
  return JSON.parse(readFileSync("e2e/.data/users.json", "utf8"));
}

/** Alerta de la página (excluye el anunciador de rutas de Next.js, que también usa role="alert"). */
export const pageAlert = (page: Page) => page.getByRole("main").getByRole("alert");
export const pageStatus = (page: Page) => page.getByRole("main").getByRole("status");

export async function login(page: Page, user: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(user.email);
  await page.getByLabel("Contraseña").fill(user.password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}
