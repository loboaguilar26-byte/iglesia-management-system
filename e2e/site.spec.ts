import { expect, login, pageAlert, test, testUsers } from "./helpers";

test.describe("sitio público", () => {
  test("las páginas públicas cargan sin iniciar sesión", async ({ page }) => {
    for (const [path, heading] of [
      ["/", null],
      ["/nosotros", "Quiénes somos"],
      ["/horarios", "Horarios de reunión"],
      ["/eventos", "Eventos"],
      ["/comunicados", "Comunicados"],
      ["/contacto", "Ubicación y contacto"],
      ["/privacidad", "Aviso de privacidad"],
    ] as const) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
      if (heading) await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    }
  });

  test("el sitio público no muestra datos personales ni enlaces del panel @movil", async ({ page }) => {
    await page.goto("/");
    const html = await page.content();
    expect(html).not.toContain("@e2e.test");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });
});

test.describe("módulos del panel", () => {
  test("registrar una persona y encontrarla sin acentos", async ({ page }) => {
    await login(page, testUsers().secretary);
    await page.goto("/admin/miembros/nuevo");
    await page.getByLabel("Nombre(s)").fill("Ramón");
    await page.getByLabel("Apellidos").fill("Ibáñez Prueba");
    await page.getByRole("button", { name: "Registrar" }).click();
    await expect(page.getByRole("heading", { name: "Ramón Ibáñez Prueba" })).toBeVisible();
    await page.goto("/admin/miembros?q=ramon+ibanez");
    await expect(page.getByRole("link", { name: /Ibáñez Prueba, Ramón/ }).first()).toBeVisible();
  });

  test("validaciones del formulario de miembro", async ({ page }) => {
    await login(page, testUsers().secretary);
    await page.goto("/admin/miembros/nuevo");
    await page.getByLabel("Correo electrónico").fill("no-es-correo");
    await page.getByRole("button", { name: "Registrar" }).click();
    await expect(pageAlert(page)).toContainText("Revisa los datos");
    await expect(page.getByText("Escribe el nombre")).toBeVisible();
  });

  test("el administrador no ve tesorería", async ({ page }) => {
    await login(page, testUsers().admin);
    await expect(page.getByRole("link", { name: "Tesorería" })).toHaveCount(0);
    await page.goto("/admin/tesoreria");
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
    const api = await page.request.get("/api/v1/reports/ingresos?desde=2026-01-01&hasta=2026-12-31&format=xlsx");
    expect(api.status()).toBe(403);
  });
});
