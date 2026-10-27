/**
 * Seed base (seguro en cualquier entorno): roles, permisos, catálogos y configuración inicial.
 * Es idempotente. No crea usuarios ni datos personales.
 *
 * Los permisos de cada rol solo se asignan cuando el rol se crea por primera vez, para no
 * sobrescribir ajustes hechos por la iglesia. `pnpm db:seed -- --reset-permissions` los restablece.
 */
import { db } from "../src/lib/db";
import { PERMISSIONS, ROLES, ROLE_KEYS, type Permission } from "../src/lib/permissions";

const EVENT_TYPES = [
  "Culto",
  "Reunión de oración",
  "Estudio bíblico",
  "Ensayo",
  "Reunión administrativa",
  "Actividad juvenil",
  "Actividad infantil",
  "Otro",
];
const DONATION_CONCEPTS = ["Diezmo", "Ofrenda", "Misiones", "Construcción", "Otro"];
const PAYMENT_METHODS = ["Efectivo", "Transferencia", "Depósito bancario", "Terminal (tarjeta)", "Otro"];

export async function seedBase({ resetPermissions = false } = {}) {
  // Permisos que no existían antes de esta ejecución: se conceden a los roles que los incluyen por
  // defecto, sin tocar los ajustes previos de la iglesia.
  const existingKeys = new Set((await db.permission.findMany({ select: { key: true } })).map((p) => p.key));
  const newPermissions = new Set<Permission>();
  for (const [key, description] of Object.entries(PERMISSIONS)) {
    if (!existingKeys.has(key)) newPermissions.add(key as Permission);
    await db.permission.upsert({ where: { key }, update: { description }, create: { key, description } });
  }
  const permissionIds = new Map(
    (await db.permission.findMany({ select: { id: true, key: true } })).map((p) => [p.key as Permission, p.id]),
  );

  for (const key of ROLE_KEYS) {
    const def = ROLES[key];
    const existing = await db.role.findUnique({ where: { key } });
    const role = await db.role.upsert({
      where: { key },
      update: { name: def.name, description: def.description, isSystem: true },
      create: { key, name: def.name, description: def.description, isSystem: true },
    });
    if (!existing || resetPermissions) {
      await db.rolePermission.deleteMany({ where: { roleId: role.id } });
      await db.rolePermission.createMany({
        data: [...new Set(def.permissions)].map((p) => ({ roleId: role.id, permissionId: permissionIds.get(p)! })),
      });
    } else if (existingKeys.size > 0) {
      const added = [...new Set(def.permissions)].filter((p) => newPermissions.has(p));
      if (added.length) {
        await db.rolePermission.createMany({
          data: added.map((p) => ({ roleId: role.id, permissionId: permissionIds.get(p)! })),
          skipDuplicates: true,
        });
      }
    }
  }

  for (const name of EVENT_TYPES) await db.eventType.upsert({ where: { name }, update: {}, create: { name } });
  for (const name of DONATION_CONCEPTS) await db.donationConcept.upsert({ where: { name }, update: {}, create: { name } });
  for (const name of PAYMENT_METHODS) await db.paymentMethod.upsert({ where: { name }, update: {}, create: { name } });

  await db.churchSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", name: "IgleTech" },
  });
}
