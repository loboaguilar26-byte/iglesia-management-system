import { expect, login, pageStatus, test, testUsers, uniqueIp } from "./helpers";

test.describe("usuarios y permisos", () => {
  test("el administrador crea un usuario que luego puede entrar", async ({ page, browser }) => {
    const { admin } = testUsers();
    await login(page, admin);
    await page.getByRole("link", { name: "Usuarios y roles" }).first().click();
    await page.getByRole("link", { name: "Nuevo usuario" }).click();

    const email = `tesorero-${Date.now()}@e2e.test`;
    const password = `Tesorero-${Date.now()}`;
    await page.getByLabel("Nombre completo").fill("Tesorero E2E");
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña inicial").fill(password);
    await page.getByLabel(/Tesorero/).check();
    await page.getByRole("button", { name: "Crear usuario" }).click();
    await expect(pageStatus(page)).toHaveText("Usuario creado correctamente.");
    await expect(page.getByRole("heading", { name: "Tesorero E2E" })).toBeVisible();

    const other = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": uniqueIp() } });
    const otherPage = await other.newPage();
    await login(otherPage, { email, password });
    // El tesorero no administra usuarios: el menú no muestra la opción.
    await expect(otherPage.getByRole("link", { name: "Usuarios y roles" })).toHaveCount(0);
    await other.close();
  });

  test("validaciones del formulario de usuario", async ({ page }) => {
    await login(page, testUsers().admin);
    await page.goto("/admin/usuarios/nuevo");
    await page.getByLabel("Contraseña inicial").fill("corta");
    await page.getByRole("button", { name: "Crear usuario" }).click();
    await expect(page.getByText("Escribe el nombre")).toBeVisible();
    await expect(page.getByText("Mínimo 10 caracteres", { exact: true })).toBeVisible();
    await expect(page.getByText("Asigna al menos un rol")).toBeVisible();
  });

  test("un administrador no puede editar sus propios roles", async ({ page }) => {
    const { admin } = testUsers();
    await login(page, admin);
    await page.goto("/admin/usuarios");
    await page.getByRole("link", { name: admin.name }).first().click();
    await expect(page.getByText("no puedes modificar tus propios roles")).toBeVisible();
    await expect(page.getByRole("button", { name: "Guardar roles" })).toHaveCount(0);
  });

  test("la secretaria no accede a usuarios ni por URL", async ({ page }) => {
    await login(page, testUsers().secretary);
    await expect(page.getByRole("link", { name: "Usuarios y roles" })).toHaveCount(0);
    // Con renderizado en streaming el estado HTTP ya se envió; se verifica el contenido.
    await page.goto("/admin/usuarios");
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
    await expect(page.getByText(testUsers().admin.email)).toHaveCount(0);
  });

  test("la API exige sesión y permisos", async ({ page, request }) => {
    const anonymous = await request.get("/api/v1/users");
    expect(anonymous.status()).toBe(401);
    expect(await anonymous.json()).toMatchObject({ error: { code: "UNAUTHENTICATED" } });

    await login(page, testUsers().secretary);
    const forbidden = await page.request.get("/api/v1/users");
    expect(forbidden.status()).toBe(403);
    const me = await page.request.get("/api/v1/me");
    const body = await me.json();
    expect(body.data.roles).toEqual(["SECRETARY"]);
    expect(body.data.permissions).not.toContain("finance:read");
  });

  test("navegación móvil @movil", async ({ page }) => {
    await login(page, testUsers().admin);
    await page.getByRole("button", { name: "Abrir menú" }).click();
    await page.getByRole("link", { name: "Usuarios y roles", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Usuarios y roles" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });
});
