import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";
import type { Actor } from "./authz";
import { db } from "./db";
import { SCOPED_ROLES, hasPanelAccess, type Permission, type RoleKey } from "./permissions";

/** Carga roles y permisos efectivos de un usuario activo. */
export async function loadActor(userId: string, ipAddress?: string | null): Promise<Actor | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      memberId: true,
      roles: {
        select: {
          role: { select: { key: true, permissions: { select: { permission: { select: { key: true } } } } } },
        },
      },
    },
  });
  if (!user?.isActive) return null;
  const permissions = new Set<Permission>();
  const unscoped = new Set<Permission>();
  for (const { role } of user.roles) {
    const scoped = SCOPED_ROLES.includes(role.key as RoleKey);
    for (const rp of role.permissions) {
      permissions.add(rp.permission.key as Permission);
      if (!scoped) unscoped.add(rp.permission.key as Permission);
    }
  }
  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    roles: user.roles.map((r) => r.role.key as RoleKey),
    permissions,
    scopedPermissions: new Set([...permissions].filter((p) => !unscoped.has(p))),
    memberId: user.memberId,
    ipAddress,
  };
}

/** IP del cliente para auditoría; solo se leen los encabezados declarados como confiables. */
export function clientIp(h: Headers) {
  // Una variable vacía ("") no declara encabezados; se ignoran los nombres en blanco.
  for (const name of (process.env.AUTH_IP_HEADERS ?? "").split(",").map((n) => n.trim()).filter(Boolean)) {
    const value = h.get(name)?.split(",").pop()?.trim();
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

/**
 * Páginas del panel: sin sesión → login; con sesión pero sin ninguna función del panel
 * (p. ej. solo rol Miembro) → portal del miembro.
 */
export async function requirePageActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (!hasPanelAccess(actor.permissions)) redirect("/mi-cuenta");
  return actor;
}

/** Portal del miembro: requiere `portal:access` y una ficha de miembro vinculada. */
export async function requirePortalActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect("/login?next=/mi-cuenta");
  return actor;
}
