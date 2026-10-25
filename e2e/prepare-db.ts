import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { db } from "../src/lib/db";
import { insertUserWithPassword } from "../src/modules/users/service";
import { seedBase } from "../prisma/seed-base";

async function main() {
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await db.$executeRawUnsafe(
    `TRUNCATE TABLE ${tables.map((t) => `"public"."${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`,
  );
  await seedBase();

  const password = () => `E2e-${randomBytes(9).toString("base64url")}`;
  const users = {
    admin: { name: "Admin E2E", email: "admin@e2e.test", password: password(), roles: ["ADMIN" as const] },
    secretary: { name: "Secretaria E2E", email: "secretaria@e2e.test", password: password(), roles: ["SECRETARY" as const] },
  };
  for (const u of Object.values(users)) {
    await db.$transaction((tx) => insertUserWithPassword(tx, u, null));
  }
  writeFileSync(process.env.E2E_OUTPUT!, JSON.stringify(users, null, 2));
}

main().finally(() => db.$disconnect());
