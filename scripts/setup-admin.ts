/**
 * Crea el primer administrador de forma interactiva.
 * Solo funciona si todavía no existe ningún usuario; después, los usuarios se crean desde el panel.
 *
 *   pnpm setup:admin
 */
import "dotenv/config";
import { createInterface } from "node:readline";
import { recordAudit } from "../src/lib/audit";
import { db } from "../src/lib/db";
import { AppError } from "../src/lib/errors";
import { insertUserWithPassword } from "../src/modules/users/service";
import { createUserSchema } from "../src/modules/users/schema";
import { seedBase } from "../prisma/seed-base";

// Entrada sin TTY (p. ej. canalizada): se leen líneas en orden.
const pipedLines = process.stdin.isTTY ? null : createInterface({ input: process.stdin })[Symbol.asyncIterator]();

/**
 * Lee una línea de la terminal en modo crudo, carácter por carácter.
 * Con `hidden` muestra "*" en lugar del texto. Soporta retroceso y Ctrl-C.
 */
async function ask(question: string, hidden = false): Promise<string> {
  process.stdout.write(question);
  if (pipedLines) {
    const { value } = await pipedLines.next();
    process.stdout.write(hidden ? "\n" : `${value ?? ""}\n`);
    return value ?? "";
  }
  return new Promise((resolve) => {
    let value = "";
    process.stdin.setRawMode(true);
    process.stdin.setEncoding("utf8");
    process.stdin.resume();
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") {
          process.stdin.off("data", onData);
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (char === "\u0003") {
          process.stdout.write("\nCancelado.\n");
          process.exit(130);
        }
        if (char === "\u007f" || char === "\b") {
          if (value.length > 0) {
            value = [...value].slice(0, -1).join("");
            process.stdout.write("\b \b");
          }
          continue;
        }
        if (char < " ") continue; // ignora otras teclas de control
        value += char;
        process.stdout.write(hidden ? "*" : char);
      }
    };
    process.stdin.on("data", onData);
  });
}

async function main() {
  if ((await db.user.count()) > 0) {
    console.error("Ya existen usuarios. Crea nuevos administradores desde el panel (Usuarios).");
    process.exitCode = 1;
    return;
  }
  await seedBase();

  console.log("Configuración del primer administrador\n");
  const name = await ask("Nombre completo: ");
  const email = await ask("Correo electrónico: ");
  const password = await ask("Contraseña (mín. 10 caracteres): ", true);
  const confirm = await ask("Confirmar contraseña: ", true);
  if (password !== confirm) {
    console.error("Las contraseñas no coinciden.");
    process.exitCode = 1;
    return;
  }

  const parsed = createUserSchema.safeParse({ name, email, password, roles: ["ADMIN"] });
  if (!parsed.success) {
    for (const issue of parsed.error.issues) console.error(`- ${issue.path.join(".")}: ${issue.message}`);
    process.exitCode = 1;
    return;
  }

  await db.$transaction(async (tx) => {
    if ((await tx.user.count()) > 0) throw new AppError("CONFLICT", "Ya existen usuarios.");
    const userId = await insertUserWithPassword(tx, parsed.data, null);
    await recordAudit(tx, null, {
      action: "user.setup_admin",
      entityType: "User",
      entityId: userId,
      metadata: { email: parsed.data.email },
    });
  });
  console.log(`\nAdministrador creado: ${parsed.data.email}. Ya puedes iniciar sesión en /login.`);
}

main()
  .catch((e) => {
    console.error(e instanceof AppError ? e.message : e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
