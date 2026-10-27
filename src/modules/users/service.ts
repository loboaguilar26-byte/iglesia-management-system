import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { recordAudit } from "@/lib/audit";
import { requirePermission, type Actor } from "@/lib/authz";
import { db, type Tx } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { RoleKey } from "@/lib/permissions";
import { normalizeEmail } from "@/lib/text";
import { parseInput } from "@/lib/validation";
import { Prisma } from "@/generated/prisma/client";
import {
  createUserSchema,
  listUsersSchema,
  setActiveSchema,
  updateRolesSchema,
  type CreateUserInput,
} from "./schema";

const userSelect = {
  id: true,
  name: true,
  email: true,
  isActive: true,
  createdAt: true,
  roles: { select: { role: { select: { key: true, name: true } } } },
  member: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.UserSelect;

type UserRow = Prisma.UserGetPayload<{ select: typeof userSelect }>;

export type UserDto = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
  roles: { key: RoleKey; name: string }[];
  member: { id: string; name: string } | null;
};

function toDto(u: UserRow): UserDto {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    isActive: u.isActive,
    createdAt: u.createdAt,
    roles: u.roles.map((r) => ({ key: r.role.key as RoleKey, name: r.role.name })),
    member: u.member ? { id: u.member.id, name: `${u.member.firstName} ${u.member.lastName}` } : null,
  };
}

/**
 * Vincula (o desvincula) la cuenta con una ficha de miembro. Necesario para el portal del
 * miembro y para el alcance del rol Coordinador.
 */
export async function linkUserMember(actor: Actor | null, userId: string, memberId: string | null) {
  const a = requirePermission(actor, "users:update");
  await db.$transaction(async (tx) => {
    if (memberId) {
      const member = await tx.member.findUnique({ where: { id: memberId }, select: { id: true, user: { select: { id: true } } } });
      if (!member) throw new AppError("VALIDATION_ERROR", "Persona no encontrada.", { memberId: ["Selecciona una persona"] });
      if (member.user && member.user.id !== userId) throw new AppError("CONFLICT", "Esa ficha ya está vinculada a otra cuenta.", { memberId: ["Ya vinculada"] });
    }
    await tx.user.update({ where: { id: userId }, data: { memberId } });
    await recordAudit(tx, a, { action: memberId ? "user.member_link" : "user.member_unlink", entityType: "User", entityId: userId, metadata: { memberId } });
  });
}

/** Crea una cuenta con rol Miembro (solo portal) vinculada a la ficha indicada. */
export async function createPortalAccount(actor: Actor | null, memberId: string, input: unknown) {
  const a = requirePermission(actor, "users:create");
  requirePermission(a, "roles:assign");
  const member = await db.member.findUnique({ where: { id: memberId }, select: { firstName: true, lastName: true, status: true, isMinor: true, user: { select: { id: true } } } });
  if (!member) throw new AppError("NOT_FOUND", "Persona no encontrada.");
  if (member.user) throw new AppError("CONFLICT", "Esta persona ya tiene acceso al portal.");
  if (member.status === "INACTIVE") throw new AppError("CONFLICT", "No se crean accesos para personas inactivas.");
  if (member.isMinor) throw new AppError("CONFLICT", "No se crean cuentas para menores de edad.");
  const raw = (input ?? {}) as Record<string, unknown>;
  const data = parseInput(createUserSchema, { name: `${member.firstName} ${member.lastName}`, email: raw.email, password: raw.password, roles: ["MEMBER"] });
  return db.$transaction(async (tx) => {
    const userId = await insertUserWithPassword(tx, data, a.userId);
    await tx.user.update({ where: { id: userId }, data: { memberId } });
    await recordAudit(tx, a, { action: "user.portal_create", entityType: "User", entityId: userId, metadata: { memberId } });
    return userId;
  });
}

export async function listUsers(actor: Actor | null, input: unknown) {
  requirePermission(actor, "users:read");
  const { page, pageSize, q } = parseInput(listUsersSchema, input ?? {});
  const where: Prisma.UserWhereInput = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};
  const [rows, total] = await Promise.all([
    db.user.findMany({
      where,
      select: userSelect,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.user.count({ where }),
  ]);
  return { data: rows.map(toDto), meta: { page, pageSize, total } };
}

export async function getUser(actor: Actor | null, userId: string): Promise<UserDto> {
  requirePermission(actor, "users:read");
  const user = await db.user.findUnique({ where: { id: userId }, select: userSelect });
  if (!user) throw new AppError("NOT_FOUND", "Usuario no encontrado.");
  return toDto(user);
}

async function roleIdsByKey(tx: Tx, keys: RoleKey[]) {
  const roles = await tx.role.findMany({ where: { key: { in: keys } }, select: { id: true, key: true } });
  if (roles.length !== new Set(keys).size) throw new AppError("VALIDATION_ERROR", "Rol inválido.");
  return roles;
}

/**
 * Crea usuario + credencial. Uso interno (servicio y `setup:admin`); no verifica permisos.
 */
export async function insertUserWithPassword(
  tx: Tx,
  data: CreateUserInput,
  assignedById: string | null,
) {
  const email = normalizeEmail(data.email);
  if (await tx.user.findUnique({ where: { email }, select: { id: true } })) {
    throw new AppError("CONFLICT", "Ya existe un usuario con ese correo.");
  }
  const roles = await roleIdsByKey(tx, data.roles);
  const id = randomUUID();
  const passwordHash = await hashPassword(data.password);
  await tx.user.create({
    data: {
      id,
      name: data.name,
      email,
      emailVerified: false,
      accounts: {
        create: { id: randomUUID(), accountId: id, providerId: "credential", password: passwordHash },
      },
      roles: { create: roles.map((r) => ({ roleId: r.id, assignedById })) },
    },
  });
  return id;
}

export async function createUser(actor: Actor | null, input: unknown): Promise<UserDto> {
  const a = requirePermission(actor, "users:create");
  requirePermission(a, "roles:assign");
  const data = parseInput(createUserSchema, input);
  const id = await db.$transaction(async (tx) => {
    const userId = await insertUserWithPassword(tx, data, a.userId);
    await recordAudit(tx, a, {
      action: "user.create",
      entityType: "User",
      entityId: userId,
      metadata: { email: normalizeEmail(data.email), roles: data.roles },
    });
    return userId;
  });
  return getUser(a, id);
}

/** Usuarios activos (distintos de `excludeUserId`) que conservan `roles:assign`. */
async function otherActiveRoleAssigners(tx: Tx, excludeUserId: string) {
  return tx.user.count({
    where: {
      id: { not: excludeUserId },
      isActive: true,
      roles: { some: { role: { permissions: { some: { permission: { key: "roles:assign" } } } } } },
    },
  });
}

async function rolesGrantAssign(tx: Tx, keys: RoleKey[]) {
  if (keys.length === 0) return false;
  const count = await tx.rolePermission.count({
    where: { role: { key: { in: keys } }, permission: { key: "roles:assign" } },
  });
  return count > 0;
}

export async function updateUserRoles(actor: Actor | null, userId: string, input: unknown) {
  const a = requirePermission(actor, "roles:assign");
  const { roles } = parseInput(updateRolesSchema, input);

  if (userId === a.userId) {
    await recordAudit(db, a, {
      action: "roles.self_assign_denied",
      entityType: "User",
      entityId: userId,
      metadata: { requestedRoles: roles },
    });
    throw new AppError("FORBIDDEN", "No puedes modificar tus propios roles.");
  }

  await db.$transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id: userId }, select: userSelect });
    if (!target) throw new AppError("NOT_FOUND", "Usuario no encontrado.");

    const before = target.roles.map((r) => r.role.key as RoleKey);
    if (
      target.isActive &&
      !(await rolesGrantAssign(tx, roles)) &&
      (await otherActiveRoleAssigners(tx, userId)) === 0
    ) {
      throw new AppError("CONFLICT", "Debe quedar al menos un usuario activo que pueda asignar roles.");
    }

    const newRoles = await roleIdsByKey(tx, roles);
    await tx.userRole.deleteMany({ where: { userId } });
    if (newRoles.length) {
      await tx.userRole.createMany({
        data: newRoles.map((r) => ({ userId, roleId: r.id, assignedById: a.userId })),
      });
    }
    await recordAudit(tx, a, {
      action: "user.roles_update",
      entityType: "User",
      entityId: userId,
      metadata: { before, after: roles },
    });
  });
  return getUser(a, userId);
}

export async function setUserActive(actor: Actor | null, userId: string, input: unknown) {
  const a = requirePermission(actor, "users:deactivate");
  const { isActive } = parseInput(setActiveSchema, input);
  if (userId === a.userId) throw new AppError("FORBIDDEN", "No puedes cambiar el estado de tu propia cuenta.");

  await db.$transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id: userId }, select: { id: true, isActive: true } });
    if (!target) throw new AppError("NOT_FOUND", "Usuario no encontrado.");
    if (target.isActive === isActive) return;

    if (!isActive && (await otherActiveRoleAssigners(tx, userId)) === 0) {
      throw new AppError("CONFLICT", "Debe quedar al menos un usuario activo que pueda asignar roles.");
    }
    await tx.user.update({ where: { id: userId }, data: { isActive } });
    if (!isActive) await tx.session.deleteMany({ where: { userId } });
    await recordAudit(tx, a, {
      action: isActive ? "user.activate" : "user.deactivate",
      entityType: "User",
      entityId: userId,
    });
  });
  return getUser(a, userId);
}

export async function listRoles() {
  return db.role.findMany({ select: { key: true, name: true, description: true }, orderBy: { name: "asc" } });
}
