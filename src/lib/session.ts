import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";
import type { Actor } from "./authz";
import { db } from "./db";
import type { Permission, RoleKey } from "./permissions";

/** Carga roles y permisos efectivos de un usuario activo. */
export async function loadActor(userId: string, ipAddress?: string | null): Promise<Actor | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      roles: {
        select: {
          role: { select: { key: true, permissions: { select: { permission: { select: { key: true } } } } } },
        },
      },
    },
  });
  if (!user?.isActive) return null;
  const permissions = new Set<Permission>();
  for (const { role } of user.roles) {
    for (const rp of role.permissions) permissions.add(rp.permission.key as Permission);
  }
  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    roles: user.roles.map((r) => r.role.key as RoleKey),
    permissions,
    ipAddress,
  };
}

/** IP del cliente para auditoría; solo se leen los encabezados declarados como confiables. */
function clientIp(h: Headers) {
  for (const name of process.env.AUTH_IP_HEADERS?.split(",") ?? []) {
    const value = h.get(name.trim())?.split(",").pop()?.trim();
    if (value) return value;
  }
  return null;
}

/** Actor de la petición actual (cookie de sesión), o null. El token bearer para móvil llega en la fase 9. */
export async function getActorFromHeaders(h: Headers): Promise<Actor | null> {
  const session = await auth.api.getSession({ headers: h });
  if (!session) return null;
  return loadActor(session.user.id, clientIp(h));
}

/** Deduplicado por petición: layout y página comparten la misma lectura. */
export const getActor = cache(async (): Promise<Actor | null> => getActorFromHeaders(await headers()));

/** Para páginas del panel: redirige al login si no hay sesión válida. */
export async function requirePageActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect("/login");
  return actor;
}
