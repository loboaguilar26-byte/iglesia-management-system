import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { requirePermission, type Actor } from "@/lib/authz";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { parseInput } from "@/lib/validation";

export const FOLLOWUP_KINDS = ["CALL", "VISIT", "MESSAGE", "MEETING", "OTHER"] as const;
export const FOLLOWUP_KIND_LABEL: Record<(typeof FOLLOWUP_KINDS)[number], string> = {
  CALL: "Llamada",
  VISIT: "Visita",
  MESSAGE: "Mensaje",
  MEETING: "Reunión",
  OTHER: "Otro",
};

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");

const schema = z
  .object({
    kind: z.enum(FOLLOWUP_KINDS),
    contactedOn: date,
    notes: z.string().trim().max(2000).optional().transform((v) => (v ? v : null)),
    nextAction: z.string().trim().max(200).optional().transform((v) => (v ? v : null)),
    nextActionOn: z.union([date, z.literal("")]).optional().transform((v) => (v ? v : null)),
  })
  .refine((d) => !d.nextActionOn || d.nextActionOn >= d.contactedOn, { message: "Debe ser posterior al contacto", path: ["nextActionOn"] });

const asDate = (s: string) => new Date(`${s}T00:00:00Z`);

export async function addFollowUp(actor: Actor | null, memberId: string, input: unknown) {
  const a = requirePermission(actor, "followup:write");
  const d = parseInput(schema, input);
  if (d.contactedOn > new Date(Date.now() + 86400000).toISOString().slice(0, 10)) {
    throw new AppError("VALIDATION_ERROR", undefined, { contactedOn: ["No puede ser una fecha futura"] });
  }
  const member = await db.member.findUnique({ where: { id: memberId }, select: { id: true } });
  if (!member) throw new AppError("NOT_FOUND", "Persona no encontrada.");
  await db.$transaction(async (tx) => {
    const row = await tx.followUp.create({
      data: {
        memberId,
        kind: d.kind,
        contactedOn: asDate(d.contactedOn),
        notes: d.notes,
        nextAction: d.nextAction,
        nextActionOn: d.nextActionOn ? asDate(d.nextActionOn) : null,
        createdById: a.userId,
      },
    });
    await recordAudit(tx, a, { action: "followup.create", entityType: "Member", entityId: memberId, metadata: { followUpId: row.id, kind: d.kind } });
  });
}

export async function memberFollowUps(actor: Actor | null, memberId: string) {
  requirePermission(actor, "followup:read");
  return db.followUp.findMany({
    where: { memberId },
    orderBy: [{ contactedOn: "desc" }, { createdAt: "desc" }],
    take: 30,
    include: { createdBy: { select: { name: true } } },
  });
}

/**
 * Tablero de seguimiento: visitantes sin contactar, próximas acciones y visitantes recientes.
 * `today` es la fecha (YYYY-MM-DD) en la zona horaria de la iglesia.
 */
export async function followUpBoard(actor: Actor | null, today: string) {
  requirePermission(actor, "followup:read");
  const todayDate = asDate(today);
  const in7 = new Date(todayDate.getTime() + 7 * 86400000);
  const since60 = new Date(todayDate.getTime() - 60 * 86400000);

  const [uncontacted, recentVisitors, latestPerMember] = await Promise.all([
    db.member.findMany({
      where: { status: "VISITOR", followUps: { none: {} } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, firstName: true, lastName: true, phone: true, email: true, createdAt: true },
    }),
    db.member.findMany({
      where: { status: "VISITOR", createdAt: { gte: since60 } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        _count: { select: { followUps: true, attendances: { where: { status: "PRESENT" } } } },
      },
    }),
    // Último contacto de cada persona con próxima acción en los próximos 7 días o vencida.
    db.followUp.findMany({
      where: { nextActionOn: { not: null, lte: in7 } },
      orderBy: [{ memberId: "asc" }, { contactedOn: "desc" }, { createdAt: "desc" }],
      distinct: ["memberId"],
      take: 100,
      include: { member: { select: { id: true, firstName: true, lastName: true, status: true } } },
    }),
  ]);

  // Solo cuenta como pendiente si no hubo un contacto posterior a esa acción.
  const later = latestPerMember.length
    ? await db.followUp.groupBy({ by: ["memberId"], where: { memberId: { in: latestPerMember.map((f) => f.memberId) } }, _max: { contactedOn: true } })
    : [];
  const pending = latestPerMember
    .filter((f) => {
      const last = later.find((l) => l.memberId === f.memberId)?._max.contactedOn;
      return !last || last.getTime() <= f.contactedOn.getTime();
    })
    .map((f) => ({ ...f, overdue: f.nextActionOn! < todayDate }))
    .sort((x, y) => x.nextActionOn!.getTime() - y.nextActionOn!.getTime());

  return { uncontacted, pending, recentVisitors };
}
