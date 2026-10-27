import { z } from "zod";
import { can, requireActor, type Actor } from "@/lib/authz";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { parseInput } from "@/lib/validation";
import type { Prisma } from "@/generated/prisma/client";

/** Entidades cuya bitácora es financiera (solo con audit:read_finance). */
const FINANCE_ENTITIES = ["Donation", "GivingReport", "Expense", "DonationConcept", "PaymentMethod"];

export const ENTITY_LABEL: Record<string, string> = {
  User: "Usuario",
  Member: "Miembro",
  Ministry: "Ministerio",
  Event: "Evento",
  Announcement: "Comunicado",
  ChurchSettings: "Configuración",
  ServiceSchedule: "Horario",
  Donation: "Aportación",
  GivingReport: "Reporte de ofrenda",
  Expense: "Gasto",
  DonationConcept: "Concepto",
  PaymentMethod: "Método de pago",
  Report: "Reporte",
  Chapel: "Capilla",
  Church: "Iglesia",
};

const ACTION_LABEL: Record<string, string> = {
  create: "creó",
  update: "editó",
  delete: "eliminó",
  void: "anuló",
  correct: "corrigió",
  cancel: "canceló",
  publish: "publicó",
  archived: "archivó",
  archive: "archivó",
  published: "publicó",
  activate: "activó",
  deactivate: "desactivó",
  status: "cambió el estado de",
  record: "registró asistencia en",
  export: "exportó",
  roles_update: "cambió los roles de",
  self_assign_denied: "intentó modificar sus propios roles en",
  member_add: "agregó un integrante a",
  member_end: "finalizó una participación en",
  member_link: "vinculó una ficha a",
  member_unlink: "desvinculó la ficha de",
  portal_create: "creó acceso al portal para",
  setup_admin: "configuró el primer administrador",
  contact_update: "actualizó sus datos de contacto en",
  logo_update: "actualizó el logotipo en",
  logo_remove: "quitó el logotipo de",
  submit: "reportó una ofrenda en",
  approve: "validó un reporte de ofrenda en",
  reject: "devolvió un reporte de ofrenda en",
};

export function describeAction(action: string) {
  const verb = action.split(".").pop() ?? action;
  return ACTION_LABEL[verb] ?? action;
}

const schema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  entidad: z.string().optional(),
});

export async function listAudit(actor: Actor | null, input: unknown) {
  const a = requireActor(actor);
  const general = can(a, "audit:read");
  const finance = can(a, "audit:read_finance");
  if (!general && !finance) throw new AppError("FORBIDDEN");
  const { page, entidad } = parseInput(schema, input ?? {});
  const allowed: Prisma.AuditLogWhereInput = general && finance ? {} : general ? { entityType: { notIn: FINANCE_ENTITIES }, NOT: { action: "report.export", entityId: "ingresos" } } : { OR: [{ entityType: { in: FINANCE_ENTITIES } }, { action: "report.export", entityId: "ingresos" }] };
  const where: Prisma.AuditLogWhereInput = { AND: [allowed, entidad ? { entityType: entidad } : {}] };
  const pageSize = 30;
  const [rows, total] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, include: { actor: { select: { name: true } } } }),
    db.auditLog.count({ where }),
  ]);
  const entities = Object.keys(ENTITY_LABEL).filter((e) => (FINANCE_ENTITIES.includes(e) ? finance : general));
  return { data: rows, meta: { page, pageSize, total }, entities };
}
