import { cache } from "react";
import { recordAudit } from "@/lib/audit";
import { requirePermission, type Actor } from "@/lib/authz";
import { DEFAULT_TIMEZONE } from "@/lib/dates";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { parseInput } from "@/lib/validation";
import { scheduleSchema, settingsSchema } from "./schema";

const DEFAULT_ID = "default";

async function ensureSettings() {
  return db.churchSettings.upsert({
    where: { id: DEFAULT_ID },
    update: {},
    create: { id: DEFAULT_ID, name: "Nombre de la iglesia (configurar)" },
  });
}

export const getSettingsInternal = cache(ensureSettings);
export const getChurchTimezone = cache(async () => (await getSettingsInternal()).timezone || DEFAULT_TIMEZONE);

export async function getSettings(actor: Actor | null) {
  requirePermission(actor, "settings:read");
  return getSettingsInternal();
}

export async function updateSettings(actor: Actor | null, input: unknown) {
  const a = requirePermission(actor, "settings:update");
  const data = parseInput(settingsSchema, input);
  await db.$transaction(async (tx) => {
    await tx.churchSettings.update({ where: { id: DEFAULT_ID }, data: { ...data, updatedById: a.userId } });
    await recordAudit(tx, a, { action: "settings.update", entityType: "ChurchSettings", entityId: DEFAULT_ID });
  });
}

export async function listSchedules(actor: Actor | null) {
  requirePermission(actor, "settings:read");
  return db.serviceSchedule.findMany({ orderBy: [{ sortOrder: "asc" }, { dayOfWeek: "asc" }, { startTime: "asc" }] });
}

export async function saveSchedule(actor: Actor | null, id: string | null, input: unknown) {
  const a = requirePermission(actor, "settings:update");
  const data = parseInput(scheduleSchema, input);
  const row = await db.$transaction(async (tx) => {
    const saved = id
      ? await tx.serviceSchedule.update({ where: { id }, data })
      : await tx.serviceSchedule.create({ data });
    await recordAudit(tx, a, { action: id ? "schedule.update" : "schedule.create", entityType: "ServiceSchedule", entityId: saved.id, metadata: { name: data.name } });
    return saved;
  });
  return row;
}

export async function deleteSchedule(actor: Actor | null, id: string) {
  const a = requirePermission(actor, "settings:update");
  const deleted = await db.serviceSchedule.delete({ where: { id } }).catch(() => null);
  if (!deleted) throw new AppError("NOT_FOUND", "Horario no encontrado.");
  await recordAudit(db, a, { action: "schedule.delete", entityType: "ServiceSchedule", entityId: id, metadata: { name: deleted.name } });
}
