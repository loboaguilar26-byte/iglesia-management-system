import { expect, login, pageAlert, pageStatus, test, testUsers } from "./helpers";

test.describe("acceso al panel", () => {
  test("un visitante sin sesión es enviado al login", async ({ page }) => {
    await page.goto("/admin/usuarios");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fusuarios/);
    await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
  });

  test("credenciales incorrectas muestran un error genérico", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Correo electrónico").fill(testUsers().admin.email);
    await page.getByLabel("Contraseña").fill("contraseña-incorrecta");
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(pageAlert(page)).toHaveText("Correo o contraseña incorrectos.");
  });

  test("inicio y cierre de sesión", async ({ page }) => {
    const { admin } = testUsers();
    await login(page, admin);
    await expect(page.getByRole("heading", { name: `Bienvenido, ${admin.name}` })).toBeVisible();
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("la recuperación responde igual exista o no el correo", async ({ page }) => {
    await page.goto("/recuperar");
    await page.getByLabel("Correo electrónico").fill("no-existe@e2e.test");
    await page.getByRole("button", { name: "Enviar enlace" }).click();
    await expect(pageStatus(page)).toContainText("Si el correo está registrado");
  });

  test("un enlace de restablecimiento sin token se rechaza", async ({ page }) => {
    await page.goto("/restablecer");
    await expect(pageAlert(page)).toContainText("no es válido");
  });

  test("demasiados intentos fallidos se bloquean temporalmente", async ({ page }) => {
    await page.goto("/login");
    for (let i = 0; i < 6; i++) {
      await page.getByLabel("Correo electrónico").fill("ataque@e2e.test");
      await page.getByLabel("Contraseña").fill(`intento-${i}`);
      await page.getByRole("button", { name: "Iniciar sesión" }).click();
      await expect(pageAlert(page)).toBeVisible();
    }
    await expect(pageAlert(page)).toContainText("Demasiados intentos");
  });
});
