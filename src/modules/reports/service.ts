import { Decimal } from "decimal.js";
import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { can, canFully, requirePermission, type Actor } from "@/lib/authz";
import { formatDate, formatDateOnly, formatDateTime, weekStartKey, zonedToUtc } from "@/lib/dates";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { formatMoney } from "@/lib/money";
import type { Permission } from "@/lib/permissions";
import { parseInput } from "@/lib/validation";
import { MEMBER_STATUS_LABEL } from "../members/schema";
import { coordinatedMinistryIds, eventScopeWhere } from "../scope";
import { donationSummary } from "../finance/service";
import { getSettingsInternal } from "../settings/service";

export const REPORT_TYPES = {
  miembros: { label: "Miembros", permission: "reports:members" },
  "asistencia-evento": { label: "Asistencia por evento", permission: "reports:attendance" },
  "asistencia-periodo": { label: "Asistencia por periodo", permission: "reports:attendance" },
  ministerios: { label: "Participación por ministerio", permission: "reports:ministries" },
  ingresos: { label: "Ingresos por periodo", permission: "reports:finance" },
  "asistencia-persona": { label: "Asistencia por persona", permission: "reports:attendance" },
  visitantes: { label: "Visitantes y seguimiento", permission: "reports:members" },
  cumpleanos: { label: "Cumpleaños del mes", permission: "reports:members" },
  constancia: { label: "Constancia de aportaciones", permission: "reports:finance" },
} as const satisfies Record<string, { label: string; permission: Permission }>;
export type ReportType = keyof typeof REPORT_TYPES;

/** Reporte tabular independiente del formato (pantalla, PDF, Excel). */
export type Report = {
  title: string;
  church: string;
  generatedAt: string;
  generatedBy: string;
  period?: string;
  filters: string[];
  columns: { key: string; label: string; align?: "right" }[];
  rows: Record<string, string | number>[];
  totals?: Record<string, string | number>;
  notes?: string[];
};

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");
const paramsSchema = z.object({
  desde: date.optional(),
  hasta: date.optional(),
  estado: z.enum(["VISITOR", "ACTIVE", "INACTIVE", ""]).optional(),
  evento: z.string().optional(),
  agrupar: z.enum(["semana", "mes"]).optional(),
  persona: z.string().optional(),
  anio: z.coerce.number().int().min(2000).max(2100).optional(),
  mes: z.coerce.number().int().min(1).max(12).optional(),
});

const MONTH_NAMES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export function availableReports(actor: Actor) {
  return (Object.entries(REPORT_TYPES) as [ReportType, (typeof REPORT_TYPES)[ReportType]][]).filter(([, r]) => can(actor, r.permission));
}

export async function buildReport(actor: Actor | null, type: string, input: unknown): Promise<Report> {
  if (!(type in REPORT_TYPES)) throw new AppError("NOT_FOUND", "Reporte no encontrado.");
  const def = REPORT_TYPES[type as ReportType];
  const a = requirePermission(actor, def.permission);
  const p = parseInput(paramsSchema, input ?? {});
  const settings = await getSettingsInternal();
  const tz = settings.timezone;
  const base = { title: def.label, church: settings.name, generatedAt: formatDateTime(new Date(), tz), generatedBy: a.name, filters: [] as string[] };
  const range = () => {
    if (!p.desde || !p.hasta) throw new AppError("VALIDATION_ERROR", "Indica el periodo (desde y hasta).", { desde: ["Requerido"], hasta: ["Requerido"] });
    if (p.hasta < p.desde) throw new AppError("VALIDATION_ERROR", "El periodo es inválido.", { hasta: ["Debe ser posterior"] });
    const from = zonedToUtc(p.desde, tz);
    const toDay = new Date(`${p.hasta}T00:00:00Z`);
    toDay.setUTCDate(toDay.getUTCDate() + 1);
    const to = zonedToUtc(toDay.toISOString().slice(0, 10), tz);
    return { from, to, label: `${formatDateOnly(new Date(`${p.desde}T00:00:00Z`))} – ${formatDateOnly(new Date(`${p.hasta}T00:00:00Z`))}` };
  };

  switch (type as ReportType) {
    case "asistencia-persona": {
      if (!p.persona) throw new AppError("VALIDATION_ERROR", "Selecciona a la persona.", { persona: ["Requerido"] });
      const r = range();
      const scope = await eventScopeWhere(a, "reports:attendance");
      const person = await db.member.findUnique({ where: { id: p.persona }, select: { firstName: true, lastName: true } });
      if (!person) throw new AppError("NOT_FOUND", "Persona no encontrada.");
      const records = await db.attendance.findMany({
        where: { memberId: p.persona, event: { AND: [scope ?? {}, { startsAt: { gte: r.from, lt: r.to } }] } },
        orderBy: { event: { startsAt: "asc" } },
        select: { status: true, event: { select: { title: true, startsAt: true, type: { select: { name: true } } } } },
      });
      const present = records.filter((x) => x.status === "PRESENT").length;
      return {
        ...base,
        period: `${person.firstName} ${person.lastName} · ${r.label}`,
        filters: canFully(a, "reports:attendance") ? [] : ["Solo eventos de tus ministerios"],
        columns: [{ key: "fecha", label: "Fecha" }, { key: "evento", label: "Evento" }, { key: "tipo", label: "Tipo" }, { key: "estado", label: "Asistencia" }],
        rows: records.map((x) => ({ fecha: formatDateTime(x.event.startsAt, tz), evento: x.event.title, tipo: x.event.type.name, estado: x.status === "PRESENT" ? "Presente" : "Ausente" })),
        totals: { fecha: "Total", evento: `Presente en ${present} de ${records.length} registros`, estado: records.length ? `${Math.round((present / records.length) * 100)}%` : "—" },
        notes: ["Solo eventos con asistencia registrada; los no capturados no cuentan como ausencia."],
      };
    }
    case "visitantes": {
      const r = range();
      const visitors = await db.member.findMany({
        where: { status: "VISITOR", createdAt: { gte: r.from, lt: r.to } },
        orderBy: { createdAt: "asc" },
        select: {
          firstName: true,
          lastName: true,
          createdAt: true,
          _count: { select: { attendances: { where: { status: "PRESENT" } }, followUps: true } },
          followUps: { orderBy: { contactedOn: "desc" }, take: 1, select: { contactedOn: true } },
        },
      });
      const contacted = visitors.filter((v) => v._count.followUps > 0).length;
      return {
        ...base,
        period: r.label,
        filters: ["Personas registradas como visitantes en el periodo"],
        columns: [
          { key: "nombre", label: "Nombre" },
          { key: "registro", label: "Registro" },
          { key: "asistencias", label: "Asistencias", align: "right" },
          { key: "contactos", label: "Contactos", align: "right" },
          { key: "ultimo", label: "Último contacto" },
        ],
        rows: visitors.map((v) => ({
          nombre: `${v.lastName}, ${v.firstName}`,
          registro: formatDate(v.createdAt, tz),
          asistencias: v._count.attendances,
          contactos: can(a, "followup:read") ? v._count.followUps : "—",
          ultimo: can(a, "followup:read") && v.followUps[0] ? formatDateOnly(v.followUps[0].contactedOn) : "—",
        })),
        totals: { nombre: `Total: ${visitors.length}`, contactos: can(a, "followup:read") ? `${contacted} contactados` : "—" },
      };
    }
    case "cumpleanos": {
      if (!canFully(a, "members:read")) throw new AppError("FORBIDDEN");
      const month = p.mes ?? Number(new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "numeric" }).format(new Date()));
      const rows = await db.$queryRaw<{ firstName: string; lastName: string; day: number; status: string }[]>`
        SELECT "firstName", "lastName", EXTRACT(DAY FROM "birthDate")::int AS day, status::text
        FROM member WHERE "birthDate" IS NOT NULL AND status <> 'INACTIVE' AND EXTRACT(MONTH FROM "birthDate") = ${month}
        ORDER BY day, "lastName"`;
      return {
        ...base,
        period: MONTH_NAMES[month - 1],
        columns: [{ key: "dia", label: "Día", align: "right" }, { key: "nombre", label: "Nombre" }, { key: "estado", label: "Estado" }],
        rows: rows.map((x) => ({ dia: x.day, nombre: `${x.firstName} ${x.lastName}`, estado: MEMBER_STATUS_LABEL[x.status as keyof typeof MEMBER_STATUS_LABEL] ?? x.status })),
        totals: { nombre: `Total: ${rows.length}` },
        notes: ["No incluye el año de nacimiento (minimización de datos)."],
      };
    }
    case "constancia": {
      if (!p.persona) throw new AppError("VALIDATION_ERROR", "Selecciona al donante.", { persona: ["Requerido"] });
      const year = p.anio ?? new Date().getUTCFullYear();
      const person = await db.member.findUnique({ where: { id: p.persona }, select: { firstName: true, lastName: true } });
      if (!person) throw new AppError("NOT_FOUND", "Persona no encontrada.");
      const donations = await db.donation.findMany({
        where: { memberId: p.persona, status: "VALID", receivedAt: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } },
        orderBy: { receivedAt: "asc" },
        select: { receivedAt: true, amount: true, reference: true, concept: { select: { name: true } }, method: { select: { name: true } } },
      });
      const total = donations.reduce((t, d) => t.plus(d.amount.toString()), new Decimal(0));
      const cur = settings.currency;
      return {
        ...base,
        title: `Constancia de aportaciones ${year}`,
        period: `${person.firstName} ${person.lastName} · enero – diciembre ${year}`,
        columns: [{ key: "fecha", label: "Fecha" }, { key: "concepto", label: "Concepto" }, { key: "metodo", label: "Método" }, { key: "referencia", label: "Referencia" }, { key: "monto", label: "Monto", align: "right" }],
        rows: donations.map((d) => ({ fecha: formatDateOnly(d.receivedAt), concepto: d.concept.name, metodo: d.method.name, referencia: d.reference ?? "", monto: formatMoney(d.amount.toString(), cur) })),
        totals: { fecha: `${donations.length} aportaciones`, monto: formatMoney(total.toFixed(2), cur) },
        notes: [
          "Constancia informativa de aportaciones registradas a nombre de la persona (excluye anuladas y anónimas).",
          "No es un comprobante fiscal (CFDI).",
        ],
      };
    }
    case "miembros": {
      const members = await db.member.findMany({
        where: p.estado ? { status: p.estado } : {},
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        select: { firstName: true, lastName: true, status: true, phone: true, email: true, joinDate: true, isMinor: true, ministryMemberships: { where: { endDate: null }, select: { ministry: { select: { name: true } } } } },
      });
      const counts = { ACTIVE: 0, VISITOR: 0, INACTIVE: 0 };
      members.forEach((m) => counts[m.status]++);
      return {
        ...base,
        filters: [p.estado ? `Estado: ${MEMBER_STATUS_LABEL[p.estado]}` : "Todos los estados"],
        columns: [
          { key: "nombre", label: "Nombre" },
          { key: "estado", label: "Estado" },
          { key: "telefono", label: "Teléfono" },
          { key: "correo", label: "Correo" },
          { key: "ingreso", label: "Ingreso" },
          { key: "ministerios", label: "Ministerios" },
        ],
        rows: members.map((m) => ({
          nombre: `${m.lastName}, ${m.firstName}`,
          estado: MEMBER_STATUS_LABEL[m.status],
          // Los datos de contacto de menores no se incluyen en reportes.
          telefono: m.isMinor ? "(menor)" : (m.phone ?? ""),
          correo: m.isMinor ? "(menor)" : (m.email ?? ""),
          ingreso: m.joinDate ? formatDateOnly(m.joinDate) : "",
          ministerios: m.ministryMemberships.map((x) => x.ministry.name).join(", "),
        })),
        totals: { nombre: `Total: ${members.length}`, estado: `Activos ${counts.ACTIVE} · Visitantes ${counts.VISITOR} · Inactivos ${counts.INACTIVE}` },
        notes: ["Documento confidencial: contiene datos personales. No lo compartas fuera del personal autorizado."],
      };
    }
    case "asistencia-evento": {
      if (!p.evento) throw new AppError("VALIDATION_ERROR", "Selecciona un evento.", { evento: ["Requerido"] });
      const scope = await eventScopeWhere(a, "reports:attendance");
      const event = await db.event.findFirst({ where: { id: p.evento, ...(scope ?? {}) }, select: { title: true, startsAt: true, visitorCount: true, attendances: { select: { status: true, member: { select: { firstName: true, lastName: true } } } } } });
      if (!event) throw new AppError("NOT_FOUND", "Evento no encontrado.");
      const rows = event.attendances
        .map((r) => ({ nombre: `${r.member.lastName}, ${r.member.firstName}`, estado: r.status === "PRESENT" ? "Presente" : "Ausente" }))
        .sort((x, y) => x.nombre.localeCompare(y.nombre, "es"));
      const present = rows.filter((r) => r.estado === "Presente").length;
      return {
        ...base,
        period: `${event.title} · ${formatDateTime(event.startsAt, tz)}`,
        columns: [{ key: "nombre", label: "Persona" }, { key: "estado", label: "Asistencia" }],
        rows,
        totals: { nombre: `Presentes: ${present} · Ausentes: ${rows.length - present}`, estado: `Visitantes sin ficha: ${event.visitorCount}` },
        notes: ["Solo se listan personas con asistencia registrada; quienes no tienen marca están pendientes, no ausentes."],
      };
    }
    case "asistencia-periodo": {
      const r = range();
      const group = p.agrupar ?? "semana";
      const scope = await eventScopeWhere(a, "reports:attendance");
      const events = await db.event.findMany({
        where: { AND: [scope ?? {}, { status: { not: "CANCELLED" }, startsAt: { gte: r.from, lt: r.to } }] },
        select: { startsAt: true, visitorCount: true, attendances: { select: { status: true } } },
      });
      const buckets = new Map<string, { eventos: number; presentes: number; ausentes: number; visitantes: number }>();
      for (const e of events) {
        const key = group === "semana" ? weekStartKey(e.startsAt, tz) : formatDate(e.startsAt, tz).slice(3);
        const b = buckets.get(key) ?? { eventos: 0, presentes: 0, ausentes: 0, visitantes: 0 };
        b.eventos++;
        b.presentes += e.attendances.filter((x) => x.status === "PRESENT").length;
        b.ausentes += e.attendances.filter((x) => x.status === "ABSENT").length;
        b.visitantes += e.visitorCount;
        buckets.set(key, b);
      }
      const sortKey = (k: string) => (group === "semana" ? k : `${k.slice(3)}-${k.slice(0, 2)}`);
      const rows = [...buckets].sort(([x], [y]) => sortKey(x).localeCompare(sortKey(y))).map(([k, b]) => ({ periodo: group === "semana" ? `Semana del ${formatDateOnly(new Date(`${k}T00:00:00Z`))}` : k, ...b, promedio: b.eventos ? Math.round(b.presentes / b.eventos) : 0 }));
      const sum = (f: "eventos" | "presentes" | "ausentes" | "visitantes") => rows.reduce((s, x) => s + x[f], 0);
      return {
        ...base,
        period: r.label,
        filters: [`Agrupado por ${group}`, ...(canFully(a, "reports:attendance") ? [] : ["Solo eventos de tus ministerios"])],
        columns: [
          { key: "periodo", label: "Periodo" },
          { key: "eventos", label: "Eventos", align: "right" },
          { key: "presentes", label: "Presentes", align: "right" },
          { key: "ausentes", label: "Ausentes", align: "right" },
          { key: "visitantes", label: "Visitantes", align: "right" },
          { key: "promedio", label: "Prom. presentes", align: "right" },
        ],
        rows,
        totals: { periodo: "Total", eventos: sum("eventos"), presentes: sum("presentes"), ausentes: sum("ausentes"), visitantes: sum("visitantes"), promedio: sum("eventos") ? Math.round(sum("presentes") / sum("eventos")) : 0 },
        notes: ["Excluye eventos cancelados. Presentes y ausentes cuentan solo marcas registradas."],
      };
    }
    case "ministerios": {
      const r = p.desde && p.hasta ? range() : null;
      const ids = canFully(a, "reports:ministries") ? null : await coordinatedMinistryIds(a);
      const ministries = await db.ministry.findMany({
        where: ids ? { id: { in: ids } } : {},
        orderBy: { name: "asc" },
        select: {
          name: true,
          isActive: true,
          memberships: { where: { endDate: null }, select: { role: true, member: { select: { firstName: true, lastName: true } } } },
          events: { where: { status: { not: "CANCELLED" }, ...(r ? { startsAt: { gte: r.from, lt: r.to } } : {}) }, select: { id: true } },
        },
      });
      return {
        ...base,
        period: r?.label ?? "Eventos: todo el historial",
        columns: [
          { key: "ministerio", label: "Ministerio" },
          { key: "estado", label: "Estado" },
          { key: "coordinadores", label: "Coordinación" },
          { key: "integrantes", label: "Integrantes vigentes", align: "right" },
          { key: "eventos", label: "Eventos", align: "right" },
        ],
        rows: ministries.map((m) => ({
          ministerio: m.name,
          estado: m.isActive ? "Activo" : "Inactivo",
          coordinadores: m.memberships.filter((x) => x.role === "COORDINATOR").map((x) => `${x.member.firstName} ${x.member.lastName}`).join(", "),
          integrantes: m.memberships.length,
          eventos: m.events.length,
        })),
        totals: { ministerio: `Total: ${ministries.length}`, integrantes: ministries.reduce((s, m) => s + m.memberships.length, 0), eventos: ministries.reduce((s, m) => s + m.events.length, 0) },
      };
    }
    case "ingresos": {
      range();
      const summary = await donationSummary(a, { from: p.desde, to: p.hasta });
      const cur = settings.currency;
      const rows = [
        ...summary.byConcept.map((c) => ({ grupo: "Concepto", nombre: c.name, registros: c.count, total: formatMoney(c.total, cur) })),
        ...summary.byMethod.map((c) => ({ grupo: "Método", nombre: c.name, registros: c.count, total: formatMoney(c.total, cur) })),
      ];
      const check = summary.byConcept.reduce((s, c) => s.plus(c.total), new Decimal(0));
      if (!check.eq(summary.total)) throw new AppError("INTERNAL", "Los totales no cuadran; revisa los datos.");
      return {
        ...base,
        period: range().label,
        filters: ["Solo aportaciones vigentes (excluye anuladas)"],
        columns: [
          { key: "grupo", label: "Agrupación" },
          { key: "nombre", label: "Nombre" },
          { key: "registros", label: "Registros", align: "right" },
          { key: "total", label: "Total", align: "right" },
        ],
        rows,
        totals: { grupo: "Total del periodo", registros: summary.count, total: formatMoney(summary.total, cur) },
        notes: ["Información financiera confidencial. Los donantes no se incluyen en este reporte."],
      };
    }
  }
}

/** Registra en auditoría las exportaciones (obligatorio para información financiera). */
export async function auditExport(actor: Actor, type: string, format: string, filters: unknown) {
  await recordAudit(db, actor, { action: "report.export", entityType: "Report", entityId: type, metadata: { format, filters } });
}

export async function eventOptionsForReport(actor: Actor) {
  requirePermission(actor, "reports:attendance");
  const scope = await eventScopeWhere(actor, "reports:attendance");
  return db.event.findMany({
    where: { AND: [scope ?? {}, { status: { not: "CANCELLED" }, startsAt: { lte: new Date() } }] },
    orderBy: { startsAt: "desc" },
    take: 100,
    select: { id: true, title: true, startsAt: true },
  });
}
