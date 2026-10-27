import { Decimal } from "decimal.js";
import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { requirePermission, type Actor } from "@/lib/authz";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { parseInput } from "@/lib/validation";

/*
 * Portal del miembro: todas las consultas se filtran por la ficha vinculada al usuario
 * (actor.memberId). Nunca recibe un id de miembro desde el cliente.
 */

function requireMember(actor: Actor | null) {
  const a = requirePermission(actor, "portal:access");
  if (!a.memberId) throw new AppError("NOT_FOUND", "Tu cuenta aún no está vinculada a una ficha de miembro. Pide a la secretaría que la vincule.");
  return { a, memberId: a.memberId };
}

export async function getMyPortal(actor: Actor | null) {
  const { memberId } = requireMember(actor);
  const now = new Date();
  const since90 = new Date(now.getTime() - 90 * 86400000);
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));

  const member = await db.member.findUnique({
    where: { id: memberId },
    select: {
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      joinDate: true,
      status: true,
      position: true,
      ministryMemberships: {
        where: { endDate: null, ministry: { isActive: true } },
        select: { role: true, startDate: true, ministry: { select: { id: true, name: true, description: true } } },
      },
    },
  });
  if (!member) throw new AppError("NOT_FOUND", "No se encontró tu ficha de miembro.");
  const ministryIds = member.ministryMemberships.map((m) => m.ministry.id);

  const [attendance, recent, upcoming, announcements, donations, yearTotal] = await Promise.all([
    db.attendance.groupBy({ by: ["status"], where: { memberId, event: { startsAt: { gte: since90 } } }, _count: true }),
    db.attendance.findMany({
      where: { memberId },
      orderBy: { event: { startsAt: "desc" } },
      take: 12,
      select: { status: true, event: { select: { id: true, title: true, startsAt: true } } },
    }),
    // Próximos eventos: los públicos y los de sus ministerios.
    db.event.findMany({
      where: { status: "SCHEDULED", endsAt: { gte: now }, OR: [{ visibility: "PUBLIC" }, { ministryId: { in: ministryIds } }] },
      orderBy: { startsAt: "asc" },
      take: 8,
      select: { id: true, title: true, startsAt: true, endsAt: true, location: true, ministry: { select: { name: true } }, type: { select: { name: true } } },
    }),
    db.announcement.findMany({
      where: { status: "PUBLISHED", visibility: "PUBLIC", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
      take: 4,
      select: { id: true, title: true, body: true, isFeatured: true, publishedAt: true },
    }),
    db.donation.findMany({
      where: { memberId, status: "VALID" },
      orderBy: { receivedAt: "desc" },
      take: 12,
      select: { id: true, receivedAt: true, amount: true, currency: true, concept: { select: { name: true } } },
    }),
    db.donation.aggregate({ where: { memberId, status: "VALID", receivedAt: { gte: yearStart } }, _sum: { amount: true }, _count: true }),
  ]);

  const present = attendance.find((x) => x.status === "PRESENT")?._count ?? 0;
  const absent = attendance.find((x) => x.status === "ABSENT")?._count ?? 0;
  return {
    member,
    attendance: {
      present90: present,
      recorded90: present + absent,
      rate90: present + absent ? Math.round((present / (present + absent)) * 100) : null,
      recent,
    },
    upcoming,
    announcements,
    giving: {
      recent: donations.map((d) => ({ ...d, amount: d.amount.toString() })),
      yearTotal: new Decimal(yearTotal._sum.amount?.toString() ?? 0).toFixed(2),
      yearCount: yearTotal._count,
      year: now.getUTCFullYear(),
    },
  };
}

const contactSchema = z.object({
  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .refine((v) => !v || /^[+\d][\d\s()-]{6,}$/.test(v), "Teléfono inválido")
    .transform((v) => (v ? v : null)),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .refine((v) => !v || z.email().safeParse(v).success, "Correo inválido")
    .transform((v) => (v ? v : null)),
});

/** El miembro corrige sus propios datos de contacto (derecho de rectificación). */
export async function updateMyContact(actor: Actor | null, input: unknown) {
  const { a, memberId } = requireMember(actor);
  const data = parseInput(contactSchema, input);
  if (data.email) {
    const taken = await db.member.findFirst({ where: { email: { equals: data.email, mode: "insensitive" }, id: { not: memberId } }, select: { id: true } });
    if (taken) throw new AppError("CONFLICT", "Ese correo ya está registrado por otra persona.", { email: ["Correo en uso"] });
  }
  await db.$transaction(async (tx) => {
    const before = await tx.member.findUniqueOrThrow({ where: { id: memberId }, select: { phone: true, email: true } });
    await tx.member.update({ where: { id: memberId }, data: { ...data, updatedById: a.userId } });
    const changed = (["phone", "email"] as const).filter((k) => before[k] !== data[k]);
    await recordAudit(tx, a, { action: "portal.contact_update", entityType: "Member", entityId: memberId, metadata: { changed } });
  });
}
