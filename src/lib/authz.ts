import type { Permission, RoleKey } from "./permissions";
import { AppError } from "./errors";

/** Usuario autenticado que ejecuta una operación. Los servicios lo reciben siempre. */
export type Actor = {
  userId: string;
  name: string;
  email: string;
  roles: RoleKey[];
  permissions: ReadonlySet<Permission>;
  /**
   * Permisos que el usuario tiene SOLO por roles acotados (Coordinador): el servicio debe
   * limitarlos a los ministerios/eventos asignados.
   */
  scopedPermissions?: ReadonlySet<Permission>;
  /** Ficha de miembro vinculada (necesaria para el alcance del Coordinador). */
  memberId?: string | null;
  ipAddress?: string | null;
};

export function can(actor: Actor | null | undefined, permission: Permission): boolean {
  return !!actor && actor.permissions.has(permission);
}

/** true si el actor tiene el permiso sin restricción de alcance. */
export function canFully(actor: Actor | null | undefined, permission: Permission): boolean {
  return can(actor, permission) && !actor!.scopedPermissions?.has(permission);
}

export function requireActor(actor: Actor | null | undefined): Actor {
  if (!actor) throw new AppError("UNAUTHENTICATED");
  return actor;
}

/** Lanza FORBIDDEN si el actor no tiene el permiso. Usar en cada servicio protegido. */
export function requirePermission(actor: Actor | null | undefined, permission: Permission): Actor {
  const a = requireActor(actor);
  if (!a.permissions.has(permission)) throw new AppError("FORBIDDEN");
  return a;
}
