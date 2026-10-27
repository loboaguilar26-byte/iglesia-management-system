import { Decimal } from "decimal.js";
import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { canFully, requirePermission, type Actor } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatDateOnly, formatDateTime, MONTHS, toDateInput, zonedParts } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { formatMoney } from "@/lib/money";
import { parseInput } from "@/lib/validation";
import type { Report } from "@/modules/reports/service";
import { getSettingsInternal } from "@/modules/settings/service";
import { requireMinistryScope } from "../scope";

/*
 * Funciones del portal que el miembro usa por sí mismo (agenda, ministerios, oración,
 * aportaciones, asistencia y sus datos). Todo se filtra por actor.memberId; nunca se
 * recibe un id de miembro desde el cliente.
 */

function requireMember(actor: Actor | null) {
  const a = requirePermission(actor, "portal:access");
  if (!a.memberId) throw new AppError("NOT_FOUND", "Tu cuenta aún no está vinculada a una ficha de miembro. Pide a la secretaría que la vincule.");
  return { a, memberId: a.memberId };
}

async function myMinistryIds(memberId: string) {
  const rows = await db.ministryMembership.findMany({ where: { memberId, endDate: null }, select: { ministryId: true } });
  return rows.map((r) => r.ministryId);
}

/** Eventos que un miembro puede ver: públicos o de sus ministerios. */
async function visibleEventWhere(memberId: string) {
  return { OR: [{ visibility: "PUBLIC" as const }, { ministryId: { in: await myMinistryIds(memberId) } }] };
}

// ───── Agenda y confirmación de asistencia ─────

export const RSVP_LABEL = { GOING: "Asistiré", MAYBE: "Tal vez", NOT_GOING: "No podré" } as const;

export async function myAgenda(actor: Actor | null, days = 60) {
  const { memberId } = requireMember(actor);
  const now = new Date();
  const until = new Date(now.getTime() + days * 86400000);
  const events = await db.event.findMany({
    where: { status: "SCHEDULED", endsAt: { gte: now }, startsAt: { lte: until }, ...(await visibleEventWhere(memberId)) },
    orderBy: { startsAt: "asc" },
    take: 60,
    select: {
      id: true,
      title: true,
      description: true,
      startsAt: true,
      endsAt: true,
      location: true,
      type: { select: { name: true } },
      ministry: { select: { name: true } },
      rsvps: { where: { memberId }, select: { response: true } },
      _count: { select: { rsvps: { where: { response: "GOING" } } } },
    },
  });
  return events.map(({ rsvps, _count, ...e }) => ({ ...e, myResponse: rsvps[0]?.response ?? null, going: _count.rsvps }));
}

const rsvpSchema = z.object({ response: z.enum(["GOING", "MAYBE", "NOT_GOING"]) });

export async function setMyRsvp(actor: Actor | null, eventId: string, input: unknown) {
  const { memberId } = requireMember(actor);
  const { response } = parseInput(rsvpSchema, input);
  const event = await db.event.findFirst({
    where: { id: eventId, status: "SCHEDULED", endsAt: { gte: new Date() }, ...(await visibleEventWhere(memberId)) },
    select: { id: true },
  });
  if (!event) throw new AppError("NOT_FOUND", "El evento no está disponible para confirmar.");
  await db.eventRsvp.upsert({
    where: { eventId_memberId: { eventId, memberId } },
    update: { response },
    create: { eventId, memberId, response },
  });
}

/** Resumen de confirmaciones para el panel (sin nombres si no se pueden leer miembros). */
export async function eventRsvpSummary(actor: Actor | null, eventId: string) {
  const a = requirePermission(actor, "events:read");
  const counts = await db.eventRsvp.groupBy({ by: ["response"], where: { eventId }, _count: true });
  const going = canFullyRead(a)
    ? await db.eventRsvp.findMany({
        where: { eventId, response: "GOING" },
        orderBy: { updatedAt: "asc" },
        select: { member: { select: { id: true, firstName: true, lastName: true } } },
      })
    : [];
  const get = (r: keyof typeof RSVP_LABEL) => counts.find((c) => c.response === r)?._count ?? 0;
  return { going: get("GOING"), maybe: get("MAYBE"), notGoing: get("NOT_GOING"), people: going.map((g) => g.member) };
}

function canFullyRead(a: Actor) {
  return canFully(a, "members:read");
}

function icsEscape(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function icsDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Archivo .ics para agregar un evento al calendario del teléfono o la computadora. */
export async function myEventIcs(actor: Actor | null, eventId: string) {
  const { memberId } = requireMember(actor);
  const e = await db.event.findFirst({
    where: { id: eventId, status: "SCHEDULED", ...(await visibleEventWhere(memberId)) },
    select: { id: true, title: true, description: true, location: true, startsAt: true, endsAt: true, updatedAt: true },
  });
  if (!e) throw new AppError("NOT_FOUND", "Evento no encontrado.");
  const settings = await getSettingsInternal();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Eclaria//Portal del miembro//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.id}@eclaria`,
    `DTSTAMP:${icsDate(e.updatedAt)}`,
    `DTSTART:${icsDate(e.startsAt)}`,
    `DTEND:${icsDate(e.endsAt)}`,
    `SUMMARY:${icsEscape(e.title)}`,
    e.location ? `LOCATION:${icsEscape(e.location)}` : null,
    `DESCRIPTION:${icsEscape([e.description, settings.name].filter(Boolean).join("\n\n"))}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return { filename: `evento-${e.startsAt.toISOString().slice(0, 10)}.ics`, body: lines.join("\r\n") + "\r\n" };
}

// ───── Ministerios: explorar y solicitar unirse ─────

export async function myMinistriesOverview(actor: Actor | null) {
  const { memberId } = requireMember(actor);
  const [mine, catalog, requests] = await Promise.all([
    db.ministryMembership.findMany({
      where: { memberId, endDate: null, ministry: { isActive: true } },
      orderBy: { startDate: "asc" },
      select: {
        role: true,
        startDate: true,
        ministry: {
          select: {
            id: true,
            name: true,
            description: true,
            _count: { select: { memberships: { where: { endDate: null } } } },
            events: { where: { status: "SCHEDULED", endsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" }, take: 2, select: { id: true, title: true, startsAt: true } },
          },
        },
      },
    }),
    db.ministry.findMany({
      where: { isActive: true, memberships: { none: { memberId, endDate: null } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true, _count: { select: { memberships: { where: { endDate: null } } } } },
    }),
    db.ministryJoinRequest.findMany({
      where: { memberId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, status: true, message: true, responseNote: true, createdAt: true, reviewedAt: true, ministry: { select: { id: true, name: true } } },
    }),
  ]);
  const pendingIds = new Set(requests.filter((r) => r.status === "PENDING").map((r) => r.ministry.id));
  return { mine, catalog: catalog.map((m) => ({ ...m, pending: pendingIds.has(m.id) })), requests };
}

const joinSchema = z.object({ message: z.string().trim().max(500, "Máximo 500 caracteres").optional() });

export async function requestToJoinMinistry(actor: Actor | null, ministryId: string, input: unknown) {
  const { a, memberId } = requireMember(actor);
  const { message } = parseInput(joinSchema, input);
  const ministry = await db.ministry.findFirst({ where: { id: ministryId, isActive: true }, select: { id: true } });
  if (!ministry) throw new AppError("NOT_FOUND", "El ministerio no está disponible.");
  if (await db.ministryMembership.findFirst({ where: { ministryId, memberId, endDate: null }, select: { id: true } })) {
    throw new AppError("CONFLICT", "Ya participas en este ministerio.");
  }
  if (await db.ministryJoinRequest.findFirst({ where: { ministryId, memberId, status: "PENDING" }, select: { id: true } })) {
    throw new AppError("CONFLICT", "Ya tienes una solicitud pendiente para este ministerio.");
  }
  await db.$transaction(async (tx) => {
    const row = await tx.ministryJoinRequest.create({ data: { ministryId, memberId, message: message || null } });
    await recordAudit(tx, a, { action: "ministry.join_request", entityType: "Ministry", entityId: ministryId, metadata: { requestId: row.id } });
  });
}

export async function withdrawJoinRequest(actor: Actor | null, requestId: string) {
  const { memberId } = requireMember(actor);
  const updated = await db.ministryJoinRequest.updateMany({ where: { id: requestId, memberId, status: "PENDING" }, data: { status: "WITHDRAWN" } });
  if (!updated.count) throw new AppError("NOT_FOUND", "La solicitud ya no está pendiente.");
}

/** Solicitudes pendientes de un ministerio (para quien gestiona sus integrantes). */
export async function pendingJoinRequests(actor: Actor | null, ministryId: string) {
  await requireMinistryScope(actor, "ministries:manage_members", ministryId);
  return db.ministryJoinRequest.findMany({
    where: { ministryId, status: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: { id: true, message: true, createdAt: true, member: { select: { id: true, firstName: true, lastName: true, status: true } } },
  });
}

const reviewSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
});

export async function reviewJoinRequest(actor: Actor | null, requestId: string, input: unknown) {
  const request = await db.ministryJoinRequest.findUnique({ where: { id: requestId }, select: { id: true, ministryId: true, memberId: true, status: true } });
  if (!request) throw new AppError("NOT_FOUND", "Solicitud no encontrada.");
  const a = await requireMinistryScope(actor, "ministries:manage_members", request.ministryId);
  const { decision, note } = parseInput(reviewSchema, input);
  if (request.status !== "PENDING") throw new AppError("CONFLICT", "La solicitud ya fue atendida.");
  const tz = (await getSettingsInternal()).timezone;
  await db.$transaction(async (tx) => {
    const done = await tx.ministryJoinRequest.updateMany({
      where: { id: requestId, status: "PENDING" },
      data: { status: decision, responseNote: note || null, reviewedAt: new Date(), reviewedById: a.userId },
    });
    if (!done.count) throw new AppError("CONFLICT", "La solicitud ya fue atendida.");
    if (decision === "APPROVED") {
      const active = await tx.ministryMembership.findFirst({ where: { ministryId: request.ministryId, memberId: request.memberId, endDate: null } });
      if (!active) {
        const row = await tx.ministryMembership.create({
          data: { ministryId: request.ministryId, memberId: request.memberId, role: "MEMBER", startDate: new Date(`${toDateInput(new Date(), tz)}T00:00:00Z`) },
        });
        await recordAudit(tx, a, { action: "ministry.member_add", entityType: "Ministry", entityId: request.ministryId, metadata: { membershipId: row.id, memberId: request.memberId, role: "MEMBER", requestId } });
      }
    }
    await recordAudit(tx, a, { action: decision === "APPROVED" ? "ministry.join_approve" : "ministry.join_reject", entityType: "Ministry", entityId: request.ministryId, metadata: { requestId } });
  });
}

// ───── Peticiones de oración ─────

export const PRAYER_STATUS_LABEL = { OPEN: "Recibida", PRAYING: "En oración", ANSWERED: "Respondida", CLOSED: "Cerrada" } as const;

const prayerSchema = z.object({
  subject: z.string().trim().min(3, "Escribe un asunto breve").max(120, "Máximo 120 caracteres"),
  body: z.string().trim().min(10, "Cuéntanos un poco más (mínimo 10 caracteres)").max(2000, "Máximo 2000 caracteres"),
  shareWithTeam: z.preprocess((v) => v === true || v === "on" || v === "true", z.boolean()),
});

export async function myPrayerRequests(actor: Actor | null) {
  const { memberId } = requireMember(actor);
  return db.prayerRequest.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, subject: true, body: true, status: true, isConfidential: true, pastoralNote: true, createdAt: true, closedAt: true },
  });
}

export async function createPrayerRequest(actor: Actor | null, input: unknown) {
  const { a, memberId } = requireMember(actor);
  const data = parseInput(prayerSchema, input);
  const open = await db.prayerRequest.count({ where: { memberId, status: { in: ["OPEN", "PRAYING"] } } });
  if (open >= 10) throw new AppError("CONFLICT", "Tienes 10 peticiones abiertas. Cierra alguna antes de enviar otra.");
  await db.$transaction(async (tx) => {
    const row = await tx.prayerRequest.create({ data: { memberId, subject: data.subject, body: data.body, isConfidential: !data.shareWithTeam } });
    // La bitácora no guarda el contenido de la petición (dato sensible).
    await recordAudit(tx, a, { action: "prayer.create", entityType: "PrayerRequest", entityId: row.id, metadata: {} });
  });
}

export async function closeMyPrayerRequest(actor: Actor | null, id: string, answered: boolean) {
  const { memberId } = requireMember(actor);
  const updated = await db.prayerRequest.updateMany({
    where: { id, memberId, status: { in: ["OPEN", "PRAYING"] } },
    data: { status: answered ? "ANSWERED" : "CLOSED", closedAt: new Date() },
  });
  if (!updated.count) throw new AppError("NOT_FOUND", "La petición ya está cerrada.");
}

const prayerStatusFilter = z.enum(["OPEN", "PRAYING", "ANSWERED", "CLOSED"]).optional().catch(undefined);

/** Peticiones para el equipo pastoral. */
export async function listPrayerRequests(actor: Actor | null, status?: string) {
  requirePermission(actor, "prayer:read");
  const s = prayerStatusFilter.parse(status || undefined);
  const [rows, counts] = await Promise.all([
    db.prayerRequest.findMany({
      where: s ? { status: s } : { status: { in: ["OPEN", "PRAYING"] } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
      select: {
        id: true,
        subject: true,
        body: true,
        status: true,
        isConfidential: true,
        pastoralNote: true,
        createdAt: true,
        closedAt: true,
        member: { select: { id: true, firstName: true, lastName: true } },
        handledBy: { select: { name: true } },
      },
    }),
    db.prayerRequest.groupBy({ by: ["status"], _count: true }),
  ]);
  const count = (k: keyof typeof PRAYER_STATUS_LABEL) => counts.find((c) => c.status === k)?._count ?? 0;
  return { rows, counts: { OPEN: count("OPEN"), PRAYING: count("PRAYING"), ANSWERED: count("ANSWERED"), CLOSED: count("CLOSED") } };
}

const pastoralSchema = z.object({
  status: z.enum(["OPEN", "PRAYING", "ANSWERED", "CLOSED"]),
  pastoralNote: z.string().trim().max(1000, "Máximo 1000 caracteres").optional(),
});

export async function updatePrayerRequest(actor: Actor | null, id: string, input: unknown) {
  const a = requirePermission(actor, "prayer:manage");
  const data = parseInput(pastoralSchema, input);
  const closed = data.status === "ANSWERED" || data.status === "CLOSED";
  await db.$transaction(async (tx) => {
    const row = await tx.prayerRequest.findUnique({ where: { id }, select: { closedAt: true } });
    if (!row) throw new AppError("NOT_FOUND", "Petición no encontrada.");
    await tx.prayerRequest.update({
      where: { id },
      data: { status: data.status, pastoralNote: data.pastoralNote || null, handledById: a.userId, closedAt: closed ? (row.closedAt ?? new Date()) : null },
    });
    await recordAudit(tx, a, { action: "prayer.update", entityType: "PrayerRequest", entityId: id, metadata: { status: data.status } });
  });
}

// ───── Aportaciones del miembro ─────

export async function myGiving(actor: Actor | null, yearInput?: number) {
  const { memberId } = requireMember(actor);
  const settings = await getSettingsInternal();
  const tz = settings.timezone;
  const nowYear = zonedParts(new Date(), tz).year;
  const year = yearInput && yearInput >= 2000 && yearInput <= nowYear ? yearInput : nowYear;
  const [donations, firstDonation] = await Promise.all([
    db.donation.findMany({
      where: { memberId, status: "VALID", receivedAt: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } },
      orderBy: { receivedAt: "desc" },
      select: { id: true, receivedAt: true, amount: true, currency: true, reference: true, concept: { select: { name: true } }, method: { select: { name: true } } },
    }),
    db.donation.findFirst({ where: { memberId, status: "VALID" }, orderBy: { receivedAt: "asc" }, select: { receivedAt: true } }),
  ]);
  const monthly = Array.from({ length: 12 }, () => new Decimal(0));
  const byConcept = new Map<string, Decimal>();
  let total = new Decimal(0);
  for (const d of donations) {
    const amount = new Decimal(d.amount.toString());
    monthly[d.receivedAt.getUTCMonth()] = monthly[d.receivedAt.getUTCMonth()]!.plus(amount);
    byConcept.set(d.concept.name, (byConcept.get(d.concept.name) ?? new Decimal(0)).plus(amount));
    total = total.plus(amount);
  }
  const firstYear = firstDonation ? firstDonation.receivedAt.getUTCFullYear() : nowYear;
  return {
    year,
    years: Array.from({ length: nowYear - Math.min(firstYear, nowYear) + 1 }, (_, i) => nowYear - i),
    currency: settings.currency,
    total: total.toFixed(2),
    count: donations.length,
    monthly: monthly.map((v, i) => ({ label: MONTHS[i]!.slice(0, 3).toLowerCase(), value: v.toNumber() })),
    byConcept: [...byConcept.entries()].map(([name, v]) => ({ name, total: v.toFixed(2), share: total.isZero() ? 0 : v.div(total).times(100).toDecimalPlaces(0).toNumber() })).sort((x, y) => Number(y.total) - Number(x.total)),
    donations: donations.map((d) => ({ ...d, amount: d.amount.toString() })),
  };
}

/** Constancia anual de aportaciones del propio miembro (mismo formato que la de tesorería). */
export async function myGivingStatement(actor: Actor | null, yearInput?: number): Promise<Report> {
  const { a, memberId } = requireMember(actor);
  const g = await myGiving(a, yearInput);
  const settings = await getSettingsInternal();
  const member = await db.member.findUniqueOrThrow({ where: { id: memberId }, select: { firstName: true, lastName: true } });
  const cur = settings.currency;
  await db.$transaction((tx) => recordAudit(tx, a, { action: "portal.statement_export", entityType: "Member", entityId: memberId, metadata: { year: g.year } }));
  return {
    title: `Constancia de aportaciones ${g.year}`,
    church: settings.name,
    generatedAt: formatDateTime(new Date(), settings.timezone),
    generatedBy: `${member.firstName} ${member.lastName} (portal del miembro)`,
    period: `${member.firstName} ${member.lastName} · enero – diciembre ${g.year}`,
    filters: [],
    columns: [
      { key: "fecha", label: "Fecha" },
      { key: "concepto", label: "Concepto" },
      { key: "metodo", label: "Método" },
      { key: "referencia", label: "Referencia" },
      { key: "monto", label: "Monto", align: "right" },
    ],
    rows: [...g.donations].reverse().map((d) => ({
      fecha: formatDateOnly(d.receivedAt),
      concepto: d.concept.name,
      metodo: d.method.name,
      referencia: d.reference ?? "",
      monto: formatMoney(d.amount, cur),
    })),
    totals: { fecha: `${g.count} aportaciones`, monto: formatMoney(g.total, cur) },
    notes: [
      "Constancia informativa de aportaciones registradas a tu nombre (excluye anuladas y anónimas).",
      "No es un comprobante fiscal (CFDI).",
    ],
  };
}

// ───── Asistencia del miembro ─────

export async function myAttendance(actor: Actor | null, page = 1) {
  const { memberId } = requireMember(actor);
  const tz = (await getSettingsInternal()).timezone;
  const pageSize = 20;
  const now = new Date();
  const since = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const [recent12, total, history, all] = await Promise.all([
    db.attendance.findMany({ where: { memberId, event: { startsAt: { gte: since } } }, select: { status: true, event: { select: { startsAt: true } } } }),
    db.attendance.count({ where: { memberId } }),
    db.attendance.findMany({
      where: { memberId },
      orderBy: { event: { startsAt: "desc" } },
      skip: (Math.max(1, page) - 1) * pageSize,
      take: pageSize,
      select: { status: true, event: { select: { id: true, title: true, startsAt: true, type: { select: { name: true } } } } },
    }),
    db.attendance.findMany({ where: { memberId }, orderBy: { event: { startsAt: "desc" } }, take: 200, select: { status: true } }),
  ]);

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1, label: MONTHS[d.getMonth()]!.slice(0, 3).toLowerCase(), value: 0, stack: 0 };
  });
  for (const r of recent12) {
    const p = zonedParts(r.event.startsAt, tz);
    const m = months.find((x) => x.year === p.year && x.month === p.month);
    if (!m) continue;
    if (r.status === "PRESENT") m.value++;
    else m.stack++;
  }
  let streak = 0;
  for (const r of all) {
    if (r.status !== "PRESENT") break;
    streak++;
  }
  let best = 0;
  let run = 0;
  for (const r of all) {
    run = r.status === "PRESENT" ? run + 1 : 0;
    best = Math.max(best, run);
  }
  const present12 = recent12.filter((r) => r.status === "PRESENT").length;
  return {
    streak,
    best,
    present12,
    recorded12: recent12.length,
    rate12: recent12.length ? Math.round((present12 / recent12.length) * 100) : null,
    months: months.map(({ label, value, stack }) => ({ label, value, stack })),
    history,
    meta: { page: Math.max(1, page), pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

// ───── Mis datos (derecho de acceso, LFPDPPP) ─────

/** Exporta en JSON todo lo que el sistema guarda de la persona, excepto notas pastorales internas. */
export async function myDataExport(actor: Actor | null) {
  const { a, memberId } = requireMember(actor);
  const member = await db.member.findUniqueOrThrow({
    where: { id: memberId },
    select: {
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      joinDate: true,
      birthDate: true,
      status: true,
      position: true,
      createdAt: true,
      updatedAt: true,
      chapel: { select: { name: true } },
      ministryMemberships: { select: { role: true, startDate: true, endDate: true, ministry: { select: { name: true } } } },
      attendances: { select: { status: true, event: { select: { title: true, startsAt: true } } } },
      donations: { where: { status: "VALID" }, select: { receivedAt: true, amount: true, currency: true, concept: { select: { name: true } }, method: { select: { name: true } } } },
      givingReports: { select: { status: true, amount: true, receivedAt: true, createdAt: true } },
      rsvps: { select: { response: true, updatedAt: true, event: { select: { title: true, startsAt: true } } } },
      prayerRequests: { select: { subject: true, body: true, status: true, createdAt: true } },
      joinRequests: { select: { status: true, createdAt: true, ministry: { select: { name: true } } } },
    },
  });
  await db.$transaction((tx) => recordAudit(tx, a, { action: "portal.data_export", entityType: "Member", entityId: memberId, metadata: {} }));
  return {
    exportedAt: new Date().toISOString(),
    notice: "Copia de tus datos personales conforme al derecho de acceso (LFPDPPP). Las notas pastorales internas no se incluyen.",
    account: { name: a.name, email: a.email },
    ...member,
    donations: member.donations.map((d) => ({ ...d, amount: d.amount.toString() })),
    givingReports: member.givingReports.map((r) => ({ ...r, amount: r.amount.toString() })),
  };
}
