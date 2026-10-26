import { Decimal } from "decimal.js";
import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { requirePermission, type Actor } from "@/lib/authz";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { parseAmount } from "@/lib/money";
import { parseInput } from "@/lib/validation";
import type { Prisma } from "@/generated/prisma/client";

const bool = z.preprocess((v) => v === "on" || v === true || v === "true", z.boolean());

export const donationSchema = z
  .object({
    receivedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
    amount: z.string().trim().min(1, "Escribe el monto"),
    conceptId: z.string().min(1, "Selecciona el concepto"),
    methodId: z.string().min(1, "Selecciona el método"),
    anonymous: bool,
    memberId: z.string().optional().transform((v) => (v ? v : null)),
    reference: z.string().trim().max(80).optional().transform((v) => (v ? v : null)),
    notes: z.string().trim().max(500).optional().transform((v) => (v ? v : null)),
  })
  .refine((d) => d.anonymous || d.memberId, { message: "Selecciona a la persona o marca la aportación como anónima", path: ["memberId"] });

const reasonSchema = z.object({ reason: z.string().trim().min(5, "Describe el motivo (mín. 5 caracteres)").max(500) });

export const filterSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  conceptId: z.string().optional(),
  methodId: z.string().optional(),
  includeVoided: bool.optional(),
  page: z.coerce.number().int().min(1).default(1),
});

const givingReportSchema = z.object({
  receivedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  amount: z.string().trim().min(1, "Escribe el monto"),
  conceptId: z.string().min(1, "Selecciona el concepto"),
  methodId: z.string().min(1, "Selecciona el método"),
  anonymous: bool,
});

const expenseSchema = z.object({
  spentAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  amount: z.string().trim().min(1, "Escribe el monto"),
  category: z.string().trim().min(2, "Escribe la categoría").max(60),
  description: z.string().trim().min(3, "Describe el gasto").max(240),
  method: z.string().trim().min(2, "Escribe el método de pago").max(60),
  reference: z.string().trim().max(80).optional().transform((v) => (v ? v : null)),
  notes: z.string().trim().max(500).optional().transform((v) => (v ? v : null)),
});

const dateOnly = (s: string) => new Date(`${s}T00:00:00Z`);

async function toData(input: unknown) {
  const d = parseInput(donationSchema, input);
  let amount: Decimal;
  try {
    amount = parseAmount(d.amount);
  } catch (e) {
    throw new AppError("VALIDATION_ERROR", undefined, { amount: [(e as Error).message] });
  }
  const receivedAt = dateOnly(d.receivedAt);
  if (receivedAt.getTime() > Date.now() + 86400000) throw new AppError("VALIDATION_ERROR", undefined, { receivedAt: ["No puede ser una fecha futura"] });
  const [concept, method] = await Promise.all([
    db.donationConcept.findFirst({ where: { id: d.conceptId, isActive: true } }),
    db.paymentMethod.findFirst({ where: { id: d.methodId, isActive: true } }),
  ]);
  if (!concept) throw new AppError("VALIDATION_ERROR", undefined, { conceptId: ["Concepto inválido"] });
  if (!method) throw new AppError("VALIDATION_ERROR", undefined, { methodId: ["Método inválido"] });
  const settings = await db.churchSettings.findUnique({ where: { id: "default" }, select: { currency: true } });
  return {
    receivedAt,
    amount: amount.toFixed(2),
    currency: settings?.currency ?? "MXN",
    conceptId: d.conceptId,
    methodId: d.methodId,
    // Anónima: no se asocia ninguna persona ni se guardan datos del donante.
    memberId: d.anonymous ? null : d.memberId,
    reference: d.reference,
    notes: d.notes,
  };
}

function periodWhere(f: z.infer<typeof filterSchema>): Prisma.DonationWhereInput {
  return {
    receivedAt: { gte: dateOnly(f.from), lte: dateOnly(f.to) },
    ...(f.conceptId ? { conceptId: f.conceptId } : {}),
    ...(f.methodId ? { methodId: f.methodId } : {}),
  };
}

export async function listDonations(actor: Actor | null, input: unknown) {
  requirePermission(actor, "finance:read");
  const f = parseInput(filterSchema, input);
  const where: Prisma.DonationWhereInput = { ...periodWhere(f), ...(f.includeVoided ? {} : { status: "VALID" }) };
  const pageSize = 50;
  const [rows, total] = await Promise.all([
    db.donation.findMany({
      where,
      orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }],
      skip: (f.page - 1) * pageSize,
      take: pageSize,
      include: {
        concept: { select: { name: true } },
        method: { select: { name: true } },
        member: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { name: true } },
        voidedBy: { select: { name: true } },
      },
    }),
    db.donation.count({ where }),
  ]);
  return { data: rows, meta: { page: f.page, pageSize, total } };
}

/** Totales del periodo (solo aportaciones válidas), por concepto y por método. Montos como texto decimal. */
export async function donationSummary(actor: Actor | null, input: unknown) {
  requirePermission(actor, "finance:read");
  const f = parseInput(filterSchema, input);
  const where: Prisma.DonationWhereInput = { ...periodWhere(f), status: "VALID" };
  const [total, byConcept, byMethod, concepts, methods] = await Promise.all([
    db.donation.aggregate({ where, _sum: { amount: true }, _count: true }),
    db.donation.groupBy({ by: ["conceptId"], where, _sum: { amount: true }, _count: true }),
    db.donation.groupBy({ by: ["methodId"], where, _sum: { amount: true }, _count: true }),
    db.donationConcept.findMany({ select: { id: true, name: true } }),
    db.paymentMethod.findMany({ select: { id: true, name: true } }),
  ]);
  const name = (list: { id: string; name: string }[], id: string) => list.find((x) => x.id === id)?.name ?? "—";
  return {
    total: new Decimal(total._sum.amount?.toString() ?? 0).toFixed(2),
    count: total._count,
    byConcept: byConcept.map((g) => ({ name: name(concepts, g.conceptId), total: new Decimal(g._sum.amount?.toString() ?? 0).toFixed(2), count: g._count })).sort((a, b) => Number(b.total) - Number(a.total)),
    byMethod: byMethod.map((g) => ({ name: name(methods, g.methodId), total: new Decimal(g._sum.amount?.toString() ?? 0).toFixed(2), count: g._count })).sort((a, b) => Number(b.total) - Number(a.total)),
  };
}

/** Totales mensuales (válidas) de los últimos `months` meses, para gráficas. */
export async function monthlyTotals(actor: Actor | null, months = 6, now = new Date()) {
  requirePermission(actor, "finance:read");
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
  const rows = await db.$queryRaw<{ month: Date; total: string }[]>`
    SELECT date_trunc('month', "receivedAt")::date AS month, SUM(amount)::text AS total
    FROM donation WHERE status = 'VALID' AND "receivedAt" >= ${start}
    GROUP BY 1 ORDER BY 1`;
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    const row = rows.find((r) => new Date(r.month).getUTCFullYear() === d.getUTCFullYear() && new Date(r.month).getUTCMonth() === d.getUTCMonth());
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, total: new Decimal(row?.total ?? 0).toFixed(2) };
  });
}

export async function getDonation(actor: Actor | null, id: string) {
  requirePermission(actor, "finance:read");
  const d = await db.donation.findUnique({
    where: { id },
    include: {
      concept: true,
      method: true,
      member: { select: { id: true, firstName: true, lastName: true } },
      createdBy: { select: { name: true } },
      voidedBy: { select: { name: true } },
      corrects: { select: { id: true, amount: true, receivedAt: true } },
      correctedBy: { select: { id: true, amount: true, receivedAt: true } },
    },
  });
  if (!d) throw new AppError("NOT_FOUND", "Aportación no encontrada.");
  return d;
}

export async function createDonation(actor: Actor | null, input: unknown) {
  const a = requirePermission(actor, "finance:create");
  const data = await toData(input);
  return db.$transaction(async (tx) => {
    const d = await tx.donation.create({ data: { ...data, createdById: a.userId } });
    await recordAudit(tx, a, { action: "donation.create", entityType: "Donation", entityId: d.id, metadata: { amount: data.amount, conceptId: data.conceptId } });
    return d;
  });
}

/** Informes enviados por el portal; todavía no forman parte de los ingresos oficiales. */
export async function submitGivingReport(actor: Actor | null, input: unknown) {
  const a = requirePermission(actor, "portal:access");
  const memberId = a.memberId;
  if (!memberId) throw new AppError("NOT_FOUND", "Tu cuenta aún no está vinculada a una ficha de miembro.");
  const data = parseInput(givingReportSchema, input);
  let amount: Decimal;
  try {
    amount = parseAmount(data.amount);
  } catch (e) {
    throw new AppError("VALIDATION_ERROR", undefined, { amount: [(e as Error).message] });
  }
  const receivedAt = dateOnly(data.receivedAt);
  if (receivedAt.getTime() > Date.now() + 86400000) throw new AppError("VALIDATION_ERROR", undefined, { receivedAt: ["No puede ser una fecha futura"] });
  const [member, concept, method, settings] = await Promise.all([
    db.member.findUnique({ where: { id: memberId }, select: { isMinor: true, status: true } }),
    db.donationConcept.findFirst({ where: { id: data.conceptId, isActive: true }, select: { id: true } }),
    db.paymentMethod.findFirst({ where: { id: data.methodId, isActive: true }, select: { id: true } }),
    db.churchSettings.findUnique({ where: { id: "default" }, select: { currency: true } }),
  ]);
  if (!member || member.isMinor || member.status === "INACTIVE") throw new AppError("FORBIDDEN", "Tu cuenta no puede reportar una ofrenda.");
  if (!concept) throw new AppError("VALIDATION_ERROR", undefined, { conceptId: ["Concepto inválido"] });
  if (!method) throw new AppError("VALIDATION_ERROR", undefined, { methodId: ["Método inválido"] });
  return db.$transaction(async (tx) => {
    const report = await tx.givingReport.create({
      data: {
        receivedAt,
        amount: amount.toFixed(2),
        currency: settings?.currency ?? "MXN",
        conceptId: concept.id,
        methodId: method.id,
        memberId,
        submittedById: a.userId,
        isAnonymous: data.anonymous,
      },
      select: { id: true },
    });
    await recordAudit(tx, data.anonymous ? null : a, {
      action: "giving_report.submit",
      entityType: "GivingReport",
      entityId: report.id,
      metadata: { amount: amount.toFixed(2), anonymous: data.anonymous },
    });
    return report;
  });
}

export async function myGivingReports(actor: Actor | null) {
  const a = requirePermission(actor, "portal:access");
  if (!a.memberId) return [];
  const rows = await db.givingReport.findMany({
    where: { submittedById: a.userId },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { id: true, receivedAt: true, amount: true, currency: true, isAnonymous: true, status: true, reviewNote: true, concept: { select: { name: true } } },
  });
  return rows.map((r) => ({ ...r, amount: r.amount.toFixed(2) }));
}

export async function givingFormOptions(actor: Actor | null) {
  requirePermission(actor, "portal:access");
  const [concepts, methods] = await Promise.all([
    db.donationConcept.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.paymentMethod.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return { concepts, methods };
}

/** Solo tesorería ve los informes pendientes; la identidad se oculta si se marcó anónima. */
export async function listGivingReports(actor: Actor | null) {
  requirePermission(actor, "finance:review_giving");
  const rows = await db.givingReport.findMany({
    where: { status: "PENDING" },
    orderBy: [{ receivedAt: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      receivedAt: true,
      amount: true,
      currency: true,
      isAnonymous: true,
      concept: { select: { name: true } },
      method: { select: { name: true } },
      member: { select: { firstName: true, lastName: true } },
    },
  });
  return rows.map(({ member, ...r }) => ({
    ...r,
    amount: r.amount.toFixed(2),
    donorName: r.isAnonymous ? null : `${member.firstName} ${member.lastName}`,
  }));
}

export async function approveGivingReport(actor: Actor | null, id: string) {
  const a = requirePermission(actor, "finance:review_giving");
  return db.$transaction(async (tx) => {
    const report = await tx.givingReport.findUnique({ where: { id } });
    if (!report) throw new AppError("NOT_FOUND", "Ofrenda reportada no encontrada.");
    if (report.status !== "PENDING") throw new AppError("CONFLICT", "Esta ofrenda ya fue revisada.");
    const donation = await tx.donation.create({
      data: {
        receivedAt: report.receivedAt,
        amount: report.amount,
        currency: report.currency,
        conceptId: report.conceptId,
        methodId: report.methodId,
        memberId: report.isAnonymous ? null : report.memberId,
        createdById: a.userId,
      },
      select: { id: true },
    });
    const updated = await tx.givingReport.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "APPROVED", reviewedAt: new Date(), reviewedById: a.userId, donationId: donation.id },
    });
    if (updated.count !== 1) throw new AppError("CONFLICT", "Esta ofrenda ya fue revisada.");
    await recordAudit(tx, a, { action: "giving_report.approve", entityType: "GivingReport", entityId: id, metadata: { donationId: donation.id, amount: report.amount.toString(), anonymous: report.isAnonymous } });
    return donation;
  });
}

export async function rejectGivingReport(actor: Actor | null, id: string, input: unknown) {
  const a = requirePermission(actor, "finance:review_giving");
  const { reason } = parseInput(reasonSchema, input);
  await db.$transaction(async (tx) => {
    const report = await tx.givingReport.findUnique({ where: { id }, select: { status: true } });
    if (!report) throw new AppError("NOT_FOUND", "Ofrenda reportada no encontrada.");
    if (report.status !== "PENDING") throw new AppError("CONFLICT", "Esta ofrenda ya fue revisada.");
    const updated = await tx.givingReport.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "REJECTED", reviewedAt: new Date(), reviewedById: a.userId, reviewNote: reason },
    });
    if (updated.count !== 1) throw new AppError("CONFLICT", "Esta ofrenda ya fue revisada.");
    await recordAudit(tx, a, { action: "giving_report.reject", entityType: "GivingReport", entityId: id, metadata: { reason } });
  });
}

export async function voidDonation(actor: Actor | null, id: string, input: unknown) {
  const a = requirePermission(actor, "finance:void");
  const { reason } = parseInput(reasonSchema, input);
  await db.$transaction(async (tx) => {
    const d = await tx.donation.findUnique({ where: { id }, select: { status: true, amount: true } });
    if (!d) throw new AppError("NOT_FOUND", "Aportación no encontrada.");
    if (d.status === "VOIDED") throw new AppError("CONFLICT", "La aportación ya está anulada.");
    await tx.donation.update({ where: { id }, data: { status: "VOIDED", voidedAt: new Date(), voidedById: a.userId, voidReason: reason } });
    await recordAudit(tx, a, { action: "donation.void", entityType: "Donation", entityId: id, metadata: { reason, amount: d.amount.toString() } });
  });
}

/** Corrección = anular la original (con motivo) y registrar una nueva que la referencia. */
export async function correctDonation(actor: Actor | null, id: string, input: unknown) {
  const a = requirePermission(actor, "finance:update");
  requirePermission(a, "finance:void");
  const { reason } = parseInput(reasonSchema, input);
  const data = await toData(input);
  return db.$transaction(async (tx) => {
    const original = await tx.donation.findUnique({ where: { id }, select: { status: true, amount: true } });
    if (!original) throw new AppError("NOT_FOUND", "Aportación no encontrada.");
    if (original.status === "VOIDED") throw new AppError("CONFLICT", "Solo se corrigen aportaciones vigentes.");
    await tx.donation.update({ where: { id }, data: { status: "VOIDED", voidedAt: new Date(), voidedById: a.userId, voidReason: `Corrección: ${reason}` } });
    const created = await tx.donation.create({ data: { ...data, correctsId: id, createdById: a.userId } });
    await recordAudit(tx, a, {
      action: "donation.correct",
      entityType: "Donation",
      entityId: created.id,
      metadata: { correctsId: id, reason, before: original.amount.toString(), after: data.amount },
    });
    return created;
  });
}

export async function listExpenses(actor: Actor | null, input: unknown) {
  requirePermission(actor, "finance:read");
  const f = parseInput(filterSchema, input);
  const where = {
    spentAt: { gte: dateOnly(f.from), lte: dateOnly(f.to) },
    ...(f.includeVoided ? {} : { status: "VALID" as const }),
  };
  const pageSize = 50;
  const [data, total] = await Promise.all([
    db.expense.findMany({ where, orderBy: [{ spentAt: "desc" }, { createdAt: "desc" }], skip: (f.page - 1) * pageSize, take: pageSize, include: { createdBy: { select: { name: true } }, voidedBy: { select: { name: true } } } }),
    db.expense.count({ where }),
  ]);
  return { data, meta: { page: f.page, pageSize, total } };
}

export async function expenseSummary(actor: Actor | null, input: unknown) {
  requirePermission(actor, "finance:read");
  const f = parseInput(filterSchema, input);
  const summary = await db.expense.aggregate({
    where: { spentAt: { gte: dateOnly(f.from), lte: dateOnly(f.to) }, status: "VALID" },
    _sum: { amount: true },
    _count: true,
  });
  return { total: new Decimal(summary._sum.amount?.toString() ?? 0).toFixed(2), count: summary._count };
}

export async function createExpense(actor: Actor | null, input: unknown) {
  const a = requirePermission(actor, "finance:create");
  const data = parseInput(expenseSchema, input);
  let amount: Decimal;
  try {
    amount = parseAmount(data.amount);
  } catch (e) {
    throw new AppError("VALIDATION_ERROR", undefined, { amount: [(e as Error).message] });
  }
  const spentAt = dateOnly(data.spentAt);
  if (spentAt.getTime() > Date.now() + 86400000) throw new AppError("VALIDATION_ERROR", undefined, { spentAt: ["No puede ser una fecha futura"] });
  return db.$transaction(async (tx) => {
    const settings = await tx.churchSettings.findUnique({ where: { id: "default" }, select: { currency: true } });
    const expense = await tx.expense.create({
      data: { ...data, spentAt, amount: amount.toFixed(2), currency: settings?.currency ?? "MXN", createdById: a.userId },
    });
    await recordAudit(tx, a, { action: "expense.create", entityType: "Expense", entityId: expense.id, metadata: { amount: amount.toFixed(2), category: data.category } });
    return expense;
  });
}

export async function voidExpense(actor: Actor | null, id: string, input: unknown) {
  const a = requirePermission(actor, "finance:void");
  const { reason } = parseInput(reasonSchema, input);
  await db.$transaction(async (tx) => {
    const expense = await tx.expense.findUnique({ where: { id }, select: { status: true, amount: true } });
    if (!expense) throw new AppError("NOT_FOUND", "Gasto no encontrado.");
    if (expense.status === "VOIDED") throw new AppError("CONFLICT", "El gasto ya está anulado.");
    await tx.expense.update({ where: { id }, data: { status: "VOIDED", voidedAt: new Date(), voidedById: a.userId, voidReason: reason } });
    await recordAudit(tx, a, { action: "expense.void", entityType: "Expense", entityId: id, metadata: { reason, amount: expense.amount.toString() } });
  });
}

/** Resumen semanal por fecha de recepción y egreso; los informes sin aprobar no se incluyen. */
export async function weeklyFinanceSummary(actor: Actor | null, input: unknown) {
  requirePermission(actor, "finance:read");
  const f = parseInput(filterSchema, input);
  const from = dateOnly(f.from);
  const to = dateOnly(f.to);
  const [income, expenses] = await Promise.all([
    db.$queryRaw<{ week: Date; total: string; count: number }[]>`
      SELECT date_trunc('week', "receivedAt")::date AS week, SUM(amount)::text AS total, COUNT(*)::int AS count
      FROM donation
      WHERE status = 'VALID' AND "receivedAt" >= ${from} AND "receivedAt" <= ${to}
      GROUP BY 1`,
    db.$queryRaw<{ week: Date; total: string; count: number }[]>`
      SELECT date_trunc('week', "spentAt")::date AS week, SUM(amount)::text AS total, COUNT(*)::int AS count
      FROM expense
      WHERE status = 'VALID' AND "spentAt" >= ${from} AND "spentAt" <= ${to}
      GROUP BY 1`,
  ]);
  const weeks = new Map<string, { income: Decimal; expenses: Decimal; incomeCount: number; expenseCount: number }>();
  for (const row of income) {
    const key = new Date(row.week).toISOString().slice(0, 10);
    weeks.set(key, {
      income: new Decimal(row.total),
      expenses: new Decimal(0),
      incomeCount: row.count,
      expenseCount: 0,
    });
  }
  for (const row of expenses) {
    const key = new Date(row.week).toISOString().slice(0, 10);
    const week = weeks.get(key) ?? { income: new Decimal(0), expenses: new Decimal(0), incomeCount: 0, expenseCount: 0 };
    week.expenses = new Decimal(row.total);
    week.expenseCount = row.count;
    weeks.set(key, week);
  }
  return [...weeks.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([weekStart, totals]) => {
    const weekEnd = new Date(`${weekStart}T00:00:00Z`);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    return {
      weekStart,
      weekEnd: weekEnd.toISOString().slice(0, 10),
      income: totals.income.toFixed(2),
      expenses: totals.expenses.toFixed(2),
      balance: totals.income.minus(totals.expenses).toFixed(2),
      incomeCount: totals.incomeCount,
      expenseCount: totals.expenseCount,
    };
  });
}

// ───── Catálogos ─────

export async function financeCatalogs(actor: Actor | null, { activeOnly = false } = {}) {
  requirePermission(actor, "finance:read");
  const where = activeOnly ? { isActive: true } : {};
  const [concepts, methods] = await Promise.all([
    db.donationConcept.findMany({ where, orderBy: { name: "asc" } }),
    db.paymentMethod.findMany({ where, orderBy: { name: "asc" } }),
  ]);
  return { concepts, methods };
}

const catalogSchema = z.object({ name: z.string().trim().min(2, "Escribe el nombre").max(60) });

export async function addCatalogItem(actor: Actor | null, kind: "concept" | "method", input: unknown) {
  const a = requirePermission(actor, "finance:configure");
  const { name } = parseInput(catalogSchema, input);
  const where = { name: { equals: name, mode: "insensitive" as const } };
  const exists = kind === "concept" ? await db.donationConcept.findFirst({ where }) : await db.paymentMethod.findFirst({ where });
  if (exists) throw new AppError("CONFLICT", "Ya existe con ese nombre.", { name: ["Nombre en uso"] });
  const row = kind === "concept" ? await db.donationConcept.create({ data: { name } }) : await db.paymentMethod.create({ data: { name } });
  await recordAudit(db, a, { action: `finance.${kind}_create`, entityType: kind === "concept" ? "DonationConcept" : "PaymentMethod", entityId: row.id, metadata: { name } });
}

export async function toggleCatalogItem(actor: Actor | null, kind: "concept" | "method", id: string, isActive: boolean) {
  const a = requirePermission(actor, "finance:configure");
  if (kind === "concept") await db.donationConcept.update({ where: { id }, data: { isActive } });
  else await db.paymentMethod.update({ where: { id }, data: { isActive } });
  await recordAudit(db, a, { action: `finance.${kind}_${isActive ? "activate" : "deactivate"}`, entityType: kind === "concept" ? "DonationConcept" : "PaymentMethod", entityId: id });
}
