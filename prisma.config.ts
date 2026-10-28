import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // `prisma generate` no necesita conexión (p. ej. al compilar en Vercel);
    // migraciones y seed fallarán con un error de conexión claro si falta DATABASE_URL.
    url: process.env.DATABASE_URL ?? "",
  },
});
