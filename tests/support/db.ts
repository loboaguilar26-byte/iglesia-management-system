import { randomUUID } from "node:crypto";
import { seedBase } from "../../prisma/seed-base";
import type { Actor } from "@/lib/authz";
import { db } from "@/lib/db";
import type { RoleKey } from "@/lib/permissions";
import { loadActor } from "@/lib/session";
import { insertUserWithPassword } from "@/modules/users/service";

/** Vacía todas las tablas (TRUNCATE no dispara los triggers por fila de auditoría) y vuelve a sembrar. */
export async function resetDatabase() {
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
  await seedBase();
}

export const TEST_PASSWORD = `Prueba-${randomUUID().slice(0, 8)}!`;

export async function createTestUser(roles: RoleKey[], name = "Usuario Prueba"): Promise<Actor> {
  const email = `${roles.join("-").toLowerCase() || "sinrol"}-${randomUUID().slice(0, 6)}@example.test`;
  const id = await db.$transaction((tx) =>
    insertUserWithPassword(tx, { name, email, password: TEST_PASSWORD, roles }, null),
  );
  const actor = await loadActor(id);
  if (!actor) throw new Error("No se pudo cargar el actor de prueba");
  return actor;
}
