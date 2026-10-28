/**
 * Crea un administrador o repara uno existente, sin preguntas:
 *
 *   pnpm admin <correo> <contraseña> ["Nombre completo"]
 *
 * - Si el correo no existe, crea el usuario con rol ADMIN.
 * - Si ya existe, lo activa, le asigna ADMIN y le pone la contraseña indicada.
 * Pensado para desarrollo local y para recuperar el acceso cuando se olvida la contraseña.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { recordAudit } from "../src/lib/audit";
import { db } from "../src/lib/db";
import { normalizeEmail } from "../src/lib/text";
import { createUserSchema, passwordSchema } from "../src/modules/users/schema";
import { insertUserWithPassword } from "../src/modules/users/service";
import { seedBase } from "../prisma/seed-base";

async function main() {
  const [rawEmail, password, name = "Administrador"] = process.argv.slice(2);
  if (!rawEmail || !password) {
    console.error('Uso: pnpm admin <correo> <contraseña> ["Nombre completo"]');
    process.exitCode = 1;
    return;
  }
  const passwordCheck = passwordSchema.safeParse(password);
  if (!passwordCheck.success) {
    console.error(`Contraseña: ${passwordCheck.error.issues[0].message}`);
    process.exitCode = 1;
    return;
  }

  await seedBase();
  const email = normalizeEmail(rawEmail);
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });

  if (!existing) {
    const parsed = createUserSchema.safeParse({ name, email, password, roles: ["ADMIN"] });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) console.error(`- ${issue.path.join(".")}: ${issue.message}`);
      process.exitCode = 1;
      return;
    }
    await db.$transaction(async (tx) => {
      const userId = await insertUserWithPassword(tx, parsed.data, null);
      await recordAudit(tx, null, { action: "user.setup_admin", entityType: "User", entityId: userId, metadata: { email } });
    });
    console.log(`Administrador creado: ${email}. Inicia sesión en /login.`);
    return;
  }

  const admin = await db.role.findUniqueOrThrow({ where: { key: "ADMIN" }, select: { id: true } });
  const passwordHash = await hashPassword(password);
  await db.$transaction(async (tx) => {
    const userId = existing.id;
    await tx.user.update({ where: { id: userId }, data: { isActive: true } });
    await tx.userRole.upsert({
      where: { userId_roleId: { userId, roleId: admin.id } },
      update: {},
      create: { userId, roleId: admin.id },
    });
    const credential = await tx.account.findFirst({ where: { userId, providerId: "credential" }, select: { id: true } });
    if (credential) {
      await tx.account.update({ where: { id: credential.id }, data: { password: passwordHash } });
    } else {
      await tx.account.create({
        data: { id: randomUUID(), accountId: userId, providerId: "credential", userId, password: passwordHash },
      });
    }
    await tx.session.deleteMany({ where: { userId } });
    await recordAudit(tx, null, { action: "user.setup_admin", entityType: "User", entityId: userId, metadata: { email } });
  });
  console.log(`Usuario existente actualizado: ${email} ahora es ADMIN con la contraseña indicada.`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
