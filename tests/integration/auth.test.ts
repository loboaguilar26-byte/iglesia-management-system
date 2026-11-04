import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mailer";
import { createTestUser, resetDatabase, TEST_PASSWORD } from "../support/db";

vi.mock("@/lib/mailer", () => ({ sendMail: vi.fn(async () => ({ delivered: true })) }));

const signIn = (email: string, password: string) => auth.api.signInEmail({ body: { email, password } });

describe("autenticación", () => {
  let email: string;
  let userId: string;

  beforeEach(async () => {
    await resetDatabase();
    vi.mocked(sendMail).mockClear();
    const user = await createTestUser(["SECRETARY"]);
    email = user.email;
    userId = user.userId;
  });

  it("inicia sesión con credenciales correctas y crea una sesión", async () => {
    const result = await signIn(email, TEST_PASSWORD);
    expect(result.user.id).toBe(userId);
    expect(await db.session.count({ where: { userId } })).toBe(1);
  });

  it("rechaza contraseña incorrecta y correo inexistente con el mismo error", async () => {
    await expect(signIn(email, "incorrecta-123")).rejects.toMatchObject({ statusCode: 401 });
    await expect(signIn("nadie@example.test", "incorrecta-123")).rejects.toMatchObject({ statusCode: 401 });
  });

  it("un usuario inactivo no puede iniciar sesión", async () => {
    await db.user.update({ where: { id: userId }, data: { isActive: false } });
    await expect(signIn(email, TEST_PASSWORD)).rejects.toMatchObject({ statusCode: 403 });
    expect(await db.session.count({ where: { userId } })).toBe(0);
  });

  it("el registro público crea una cuenta solo con rol Miembro, sin verificar ni ficha", async () => {
    await auth.api.signUpEmail({
      body: { name: "X", email: "x@example.test", password: TEST_PASSWORD, role: "ADMIN", emailVerified: true } as never,
    });
    const user = await db.user.findUniqueOrThrow({
      where: { email: "x@example.test" },
      select: { emailVerified: true, memberId: true, roles: { select: { role: { select: { key: true } } } } },
    });
    expect(user.emailVerified).toBe(false);
    expect(user.memberId).toBeNull();
    expect(user.roles.map((r) => r.role.key)).toEqual(["MEMBER"]);
  });

  it("el registro público rechaza un correo que ya tiene cuenta", async () => {
    await expect(
      auth.api.signUpEmail({ body: { name: "X", email, password: TEST_PASSWORD } }),
    ).rejects.toBeTruthy();
    expect(await db.user.count({ where: { email } })).toBe(1);
  });

  it("el token de recuperación funciona una sola vez y cierra sesiones previas", async () => {
    await signIn(email, TEST_PASSWORD);
    await auth.api.requestPasswordReset({ body: { email, redirectTo: "/restablecer" } });
    expect(sendMail).toHaveBeenCalledOnce();
    const text = vi.mocked(sendMail).mock.calls[0][0].text;
    const token = new URL(text.match(/https?:\/\/\S+/)![0]).pathname.split("/").pop()!;

    const newPassword = "Nueva-contraseña-segura-1";
    await auth.api.resetPassword({ body: { token, newPassword } });
    expect(await db.session.count({ where: { userId } })).toBe(0);

    await expect(auth.api.resetPassword({ body: { token, newPassword: "Otra-contraseña-123" } })).rejects.toBeTruthy();
    await expect(signIn(email, TEST_PASSWORD)).rejects.toBeTruthy();
    await expect(signIn(email, newPassword)).resolves.toMatchObject({ user: { id: userId } });
  });

  it("solicitar recuperación para un correo inexistente no envía correo ni revela nada", async () => {
    const res = await auth.api.requestPasswordReset({ body: { email: "nadie@example.test", redirectTo: "/restablecer" } });
    expect(res).toMatchObject({ status: true });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("el token vencido no sirve", async () => {
    await auth.api.requestPasswordReset({ body: { email, redirectTo: "/restablecer" } });
    const text = vi.mocked(sendMail).mock.calls[0][0].text;
    const token = new URL(text.match(/https?:\/\/\S+/)![0]).pathname.split("/").pop()!;
    await db.verification.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    await expect(auth.api.resetPassword({ body: { token, newPassword: "Nueva-contraseña-segura-1" } })).rejects.toBeTruthy();
  });
});
