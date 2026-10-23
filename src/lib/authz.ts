import type { Permission, RoleKey } from "./permissions";
import { AppError } from "./errors";

/** Usuario autenticado que ejecuta una operación. Los servicios lo reciben siempre. */
export type Actor = {
  userId: string;
  name: string;
  email: string;
  roles: RoleKey[];
  permissions: ReadonlySet<Permission>;
  ipAddress?: string | null;
};

export function can(actor: Actor | null | undefined, permission: Permission): boolean {
  return !!actor && actor.permissions.has(permission);
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
