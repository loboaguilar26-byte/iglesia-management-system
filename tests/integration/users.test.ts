import { beforeEach, describe, expect, it } from "vitest";
import type { Actor } from "@/lib/authz";
import { db } from "@/lib/db";
import { createUser, listUsers, setUserActive, updateUserRoles } from "@/modules/users/service";
import { createTestUser, resetDatabase, TEST_PASSWORD } from "../support/db";

const newUser = (roles: string[] = ["SECRETARY"]) => ({
  name: "Ana Prueba",
  email: `Ana.${Math.random().toString(36).slice(2, 8)}@Example.test`,
  password: TEST_PASSWORD,
  roles,
});

async function expectCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ code });
}

describe("servicio de usuarios", () => {
  let admin: Actor;

  beforeEach(async () => {
    await resetDatabase();
    admin = await createTestUser(["ADMIN"], "Admin Prueba");
  });

  it("el administrador crea usuarios, normaliza el correo y queda auditado", async () => {
    const input = newUser();
    const user = await createUser(admin, input);
    expect(user.email).toBe(input.email.toLowerCase());
    expect(user.roles.map((r) => r.key)).toEqual(["SECRETARY"]);

    const account = await db.account.findFirst({ where: { userId: user.id } });
    expect(account?.providerId).toBe("credential");
    expect(account?.password).not.toContain(TEST_PASSWORD); // se guarda el hash, no el texto

    const log = await db.auditLog.findFirst({ where: { action: "user.create", entityId: user.id } });
    expect(log?.actorId).toBe(admin.userId);
    expect(JSON.stringify(log?.metadata)).not.toContain(TEST_PASSWORD);
  });

  it("rechaza correos duplicados y datos inválidos", async () => {
    const input = newUser();
    await createUser(admin, input);
    await expectCode(createUser(admin, { ...input, email: input.email.toUpperCase() }), "CONFLICT");
    await expect(createUser(admin, { ...newUser(), password: "corta" })).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      details: { password: expect.any(Array) },
    });
    await expectCode(createUser(admin, { ...newUser(), roles: ["SUPERADMIN"] }), "VALIDATION_ERROR");
  });

  it("sin sesión responde 401 y sin permiso 403", async () => {
    const secretary = await createTestUser(["SECRETARY"]);
    await expectCode(listUsers(null, {}), "UNAUTHENTICATED");
    await expectCode(listUsers(secretary, {}), "FORBIDDEN");
    await expectCode(createUser(secretary, newUser()), "FORBIDDEN");
  });

  it("el pastor puede consultar usuarios pero no asignar roles", async () => {
    const pastor = await createTestUser(["PASTOR"]);
    const target = await createTestUser(["SECRETARY"]);
    const { meta } = await listUsers(pastor, {});
    expect(meta.total).toBe(3);
    await expectCode(updateUserRoles(pastor, target.userId, { roles: ["ADMIN"] }), "FORBIDDEN");
  });

  it("nadie puede modificar sus propios roles y el intento queda auditado", async () => {
    await expectCode(updateUserRoles(admin, admin.userId, { roles: ["ADMIN", "TREASURER"] }), "FORBIDDEN");
    const denied = await db.auditLog.findFirst({ where: { action: "roles.self_assign_denied" } });
    expect(denied?.actorId).toBe(admin.userId);
    const roles = await db.userRole.findMany({ where: { userId: admin.userId } });
    expect(roles).toHaveLength(1);
  });

  it("asigna roles a otro usuario y registra antes/después", async () => {
    const target = await createTestUser(["SECRETARY"]);
    const updated = await updateUserRoles(admin, target.userId, { roles: ["TREASURER"] });
    expect(updated.roles.map((r) => r.key)).toEqual(["TREASURER"]);
    const log = await db.auditLog.findFirst({ where: { action: "user.roles_update" } });
    expect(log?.metadata).toEqual({ before: ["SECRETARY"], after: ["TREASURER"] });
  });

  it("protege al último usuario activo que puede asignar roles", async () => {
    // Con la matriz inicial solo el administrador desactiva usuarios; se simula una matriz ajustada
    // donde el pastor también puede hacerlo, para comprobar la protección en el servicio.
    const pastorRole = await db.role.findUniqueOrThrow({ where: { key: "PASTOR" } });
    const perm = await db.permission.findUniqueOrThrow({ where: { key: "users:deactivate" } });
    await db.rolePermission.create({ data: { roleId: pastorRole.id, permissionId: perm.id } });
    const pastor = await createTestUser(["PASTOR"]);

    await expectCode(setUserActive(pastor, admin.userId, { isActive: false }), "CONFLICT");
    expect(await db.user.findUnique({ where: { id: admin.userId } })).toMatchObject({ isActive: true });

    await createTestUser(["ADMIN"], "Admin Dos");
    await setUserActive(pastor, admin.userId, { isActive: false });
    expect(await db.user.findUnique({ where: { id: admin.userId } })).toMatchObject({ isActive: false });
  });

  it("un administrador puede quitar el rol a otro mientras él conserve el suyo", async () => {
    const admin2 = await createTestUser(["ADMIN"], "Admin Dos");
    await updateUserRoles(admin2, admin.userId, { roles: ["PASTOR"] });
    // admin2 queda como único administrador y no puede modificarse a sí mismo.
    await expectCode(updateUserRoles(admin2, admin2.userId, { roles: [] }), "FORBIDDEN");
  });

  it("desactivar conserva el registro y cierra sesiones", async () => {
    const target = await createTestUser(["SECRETARY"]);
    await db.session.create({
      data: { id: "s1", token: "t1", userId: target.userId, expiresAt: new Date(Date.now() + 3600_000) },
    });
    await setUserActive(admin, target.userId, { isActive: false });
    expect(await db.user.findUnique({ where: { id: target.userId } })).toMatchObject({ isActive: false });
    expect(await db.session.count({ where: { userId: target.userId } })).toBe(0);
    await expectCode(setUserActive(admin, admin.userId, { isActive: false }), "FORBIDDEN");
  });
});
