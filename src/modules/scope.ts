import { canFully, requirePermission, type Actor } from "@/lib/authz";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { Permission } from "@/lib/permissions";

/**
 * Alcance del rol Coordinador (docs/permisos.md, regla 5): cuando un permiso le llega solo por
 * ese rol, se limita a los ministerios que coordina (participación vigente como COORDINATOR)
 * y a los eventos de esos ministerios o donde es responsable.
 */
export async function coordinatedMinistryIds(actor: Actor): Promise<string[]> {
  if (!actor.memberId) return [];
  const rows = await db.ministryMembership.findMany({
    where: { memberId: actor.memberId, role: "COORDINATOR", endDate: null, ministry: { isActive: true } },
    select: { ministryId: true },
  });
  return rows.map((r) => r.ministryId);
}

/** Verifica el permiso y, si es acotado, que el ministerio esté entre los coordinados. */
export async function requireMinistryScope(actor: Actor | null, permission: Permission, ministryId: string) {
  const a = requirePermission(actor, permission);
  if (canFully(a, permission)) return a;
  if (!(await coordinatedMinistryIds(a)).includes(ministryId)) throw new AppError("FORBIDDEN");
  return a;
}

/** Filtro de eventos visibles para un permiso acotado; `undefined` = sin restricción. */
export async function eventScopeWhere(actor: Actor, permission: Permission) {
  if (canFully(actor, permission)) return undefined;
  const ministryIds = await coordinatedMinistryIds(actor);
  return {
    OR: [
      { ministryId: { in: ministryIds } },
      ...(actor.memberId ? [{ responsibles: { some: { memberId: actor.memberId } } }] : []),
    ],
  };
}

export async function requireEventScope(actor: Actor | null, permission: Permission, eventId: string) {
  const a = requirePermission(actor, permission);
  const where = await eventScopeWhere(a, permission);
  if (!where) return a;
  const found = await db.event.count({ where: { id: eventId, ...where } });
  if (!found) throw new AppError("FORBIDDEN");
  return a;
}

/** Filtro de miembros visibles para un permiso acotado: integrantes vigentes de sus ministerios. */
export async function memberScopeWhere(actor: Actor, permission: Permission) {
  if (canFully(actor, permission)) return undefined;
  const ministryIds = await coordinatedMinistryIds(actor);
  return { ministryMemberships: { some: { ministryId: { in: ministryIds }, endDate: null } } };
}
