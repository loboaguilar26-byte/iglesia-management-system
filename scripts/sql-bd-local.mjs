// Genera el SQL que crea (o repara) el usuario y la base de datos de DATABASE_URL en el
// PostgreSQL local. Lo usa scripts/preparar-bd.cmd; no muestra la contraseña en pantalla.
import { readFileSync } from "node:fs";

const env = readFileSync(".env", "utf8").replace(/^﻿/, "");
const line = env.split(/\r?\n/).find((l) => /^\s*DATABASE_URL\s*=/.test(l));
if (!line) {
  console.error("No se encontró DATABASE_URL en .env");
  process.exit(1);
}
const url = new URL(line.replace(/^\s*DATABASE_URL\s*=\s*/, "").replace(/^["']|["']$/g, "").trim());
const user = decodeURIComponent(url.username);
const password = decodeURIComponent(url.password);
const database = url.pathname.slice(1);
if (!/^[a-z_][a-z0-9_]*$/i.test(user) || !/^[a-z_][a-z0-9_]*$/i.test(database)) {
  console.error("Usuario o base de datos con caracteres no soportados en DATABASE_URL");
  process.exit(1);
}
const pw = password.replace(/'/g, "''");

process.stdout.write(`DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = '${user}') THEN
    ALTER ROLE "${user}" WITH LOGIN CREATEDB PASSWORD '${pw}';
  ELSE
    CREATE ROLE "${user}" WITH LOGIN CREATEDB PASSWORD '${pw}';
  END IF;
END $$;
SELECT 'CREATE DATABASE "${database}" OWNER "${user}"'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${database}') \\gexec
ALTER DATABASE "${database}" OWNER TO "${user}";
\\echo Usuario "${user}" y base "${database}" listos.
`);
