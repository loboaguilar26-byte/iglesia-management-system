import { recordAudit } from "@/lib/audit";
import { canFully, requirePermission, type Actor } from "@/lib/authz";
import { zonedToUtc } from "@/lib/dates";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { parseInput } from "@/lib/validation";
import type { Prisma } from "@/generated/prisma/client";
import { coordinatedMinistryIds, eventScopeWhere, requireEventScope } from "../scope";
import { getChurchTimezone } from "../settings/service";
import { assertChapelAssignable } from "../chapels/service";
import { cancelSchema, eventSchema } from "./schema";
import { notifyScheduleChange } from "../notifications/service";

export async function listEventTypes() {
  return db.eventType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
}

const listSelect = {
  id: true,
  title: true,
  startsAt: true,
  endsAt: true,
  location: true,
  status: true,
  visibility: true,
  type: { select: { name: true } },
  ministry: { select: { id: true, name: true } },
  _count: { select: { attendances: true } },
} satisfies Prisma.EventSelect;

/** Eventos en un rango [from, to) visibles para el actor. */
export async function listEventsInRange(actor: Actor | null, from: Date, to: Date, extra: Prisma.EventWhereInput = {}) {
  const a = requirePermission(actor, "events:read");
  const scope = await eventScopeWhere(a, "events:read");
  return db.event.findMany({
    where: { AND: [scope ?? {}, extra, { startsAt: { lt: to }, endsAt: { gt: from } }] },
    orderBy: { startsAt: "asc" },
    select: listSelect,
  });
}

export async function listUpcomingEvents(actor: Actor | null, take = 50, extra: Prisma.EventWhereInput = {}) {
  const a = requirePermission(actor, "events:read");
  const scope = await eventScopeWhere(a, "events:read");
  return db.event.findMany({
    where: { AND: [scope ?? {}, extra, { endsAt: { gte: new Date() } }] },
    orderBy: { startsAt: "asc" },
    take,
    select: listSelect,
  });
}

export async function getEvent(actor: Actor | null, id: string) {
  await requireEventScope(actor, "events:read", id);
  const event = await db.event.findUnique({
    where: { id },
    include: {
      type: true,
      ministry: { select: { id: true, name: true } },
      responsibles: { include: { member: { select: { id: true, firstName: true, lastName: true } } } },
      _count: { select: { attendances: true } },
    },
  });
  if (!event) throw new AppError("NOT_FOUND", "Evento no encontrado.");
  return event;
}

async function assertCanUseMinistry(a: Actor, ministryId: string | null) {
  if (canFully(a, "events:create")) return;
  // Un coordinador solo crea eventos de los ministerios que coordina.
  if (!ministryId || !(await coordinatedMinistryIds(a)).includes(ministryId)) {
    throw new AppError("FORBIDDEN", "Solo puedes programar eventos de los ministerios que coordinas.", { ministryId: ["Selecciona uno de tus ministerios"] });
  }
}

async function toData(input: unknown) {
  const data = parseInput(eventSchema, input);
  const tz = await getChurchTimezone();
  const { responsibles, startsAt, endsAt, ...rest } = data;
  const type = await db.eventType.findUnique({ where: { id: rest.typeId } });
  if (!type) throw new AppError("VALIDATION_ERROR", undefined, { typeId: ["Tipo inválido"] });
  return { ...rest, startsAt: zonedToUtc(startsAt, tz), endsAt: zonedToUtc(endsAt, tz), responsibles: [...new Set(responsibles)] };
}

export async function createEvent(actor: Actor | null, input: unknown) {
  const a = requirePermission(actor, "events:create");
  const { responsibles, ...data } = await toData(input);
  await assertCanUseMinistry(a, data.ministryId);
  await assertChapelAssignable(db, data.chapelId);
  return db.$transaction(async (tx) => {
    const event = await tx.event.create({
      data: { ...data, responsibles: { create: responsibles.map((memberId) => ({ memberId })) } },
    });
    await recordAudit(tx, a, { action: "event.create", entityType: "Event", entityId: event.id, metadata: { title: data.title } });
    return event;
  });
}

export async function updateEvent(actor: Actor | null, id: string, input: unknown) {
  const a = await requireEventScope(actor, "events:update", id);
  const { responsibles, ...data } = await toData(input);
  if (!canFully(a, "events:update")) await assertCanUseMinistry(a, data.ministryId);
  const before = await db.event.findUnique({ where: { id }, select: { status: true, chapelId: true, startsAt: true, endsAt: true } });
  await assertChapelAssignable(db, data.chapelId, before?.chapelId);
  if (before?.status === "CANCELLED") throw new AppError("CONFLICT", "Un evento cancelado no se puede editar.");
  await db.$transaction(async (tx) => {
    await tx.event.update({ where: { id }, data });
    await tx.eventResponsible.deleteMany({ where: { eventId: id } });
    if (responsibles.length) await tx.eventResponsible.createMany({ data: responsibles.map((memberId) => ({ eventId: id, memberId })) });
    await recordAudit(tx, a, { action: "event.update", entityType: "Event", entityId: id });
  });
  if (before && (before.startsAt.getTime() !== data.startsAt.getTime() || before.endsAt.getTime() !== data.endsAt.getTime())) {
    await notifyScheduleChange(id, before.startsAt, before.endsAt).catch((error) => {
      console.warn("[notificaciones] No se pudo avisar el cambio de horario", error);
      return null;
    });
  }
}

export async function cancelEvent(actor: Actor | null, id: string, input: unknown) {
  const a = await requireEventScope(actor, "events:cancel", id);
  const { reason } = parseInput(cancelSchema, input);
  await db.$transaction(async (tx) => {
    const ev = await tx.event.findUnique({ where: { id }, select: { status: true } });
    if (!ev) throw new AppError("NOT_FOUND", "Evento no encontrado.");
    if (ev.status === "CANCELLED") throw new AppError("CONFLICT", "El evento ya está cancelado.");
    await tx.event.update({ where: { id }, data: { status: "CANCELLED", cancelledReason: reason } });
    await recordAudit(tx, a, { action: "event.cancel", entityType: "Event", entityId: id, metadata: { reason } });
  });
}

/** Opciones de ministerio para el formulario: todos (dirección) o solo los coordinados. */
export async function ministryOptionsFor(actor: Actor) {
  const ids = canFully(actor, "events:create") ? null : await coordinatedMinistryIds(actor);
  return db.ministry.findMany({
    where: { isActive: true, ...(ids ? { id: { in: ids } } : {}) },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}
