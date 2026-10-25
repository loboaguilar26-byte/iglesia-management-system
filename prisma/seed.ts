import { db } from "../src/lib/db";
import { seedBase } from "./seed-base";

const resetPermissions = process.argv.includes("--reset-permissions");

seedBase({ resetPermissions })
  .then(() => console.log(`Seed base aplicado${resetPermissions ? " (permisos restablecidos)" : ""}.`))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
