import { cache } from "react";
import { recordAudit } from "@/lib/audit";
import { requirePermission, type Actor } from "@/lib/authz";
import { DEFAULT_TIMEZONE } from "@/lib/dates";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { deleteStored, saveImage } from "@/lib/storage";
import { parseInput } from "@/lib/validation";
import { scheduleSchema, settingsSchema } from "./schema";

const DEFAULT_ID = "default";

async function ensureSettings() {
  return db.churchSettings.upsert({
    where: { id: DEFAULT_ID },
    update: {},
    create: { id: DEFAULT_ID, name: "Eclaria" },
  });
}

/** Configuración completa (uso interno de servidor). */
export const getSettingsInternal = cache(ensureSettings);

/** Zona horaria configurada; la usan todos los módulos para mostrar y capturar fechas. */
export const getChurchTimezone = cache(async () => (await getSettingsInternal()).timezone || DEFAULT_TIMEZONE);

export async function getSettings(actor: Actor | null) {
  requirePermission(actor, "settings:read");
  return getSettingsInternal();
}

export async function updateSettings(actor: Actor | null, input: unknown) {
  const a = requirePermission(actor, "settings:update");
  const data = parseInput(settingsSchema, input);
  const before = await ensureSettings();
  const changed = Object.keys(data).filter(
    (k) => (before as Record<string, unknown>)[k] !== (data as Record<string, unknown>)[k],
  );
  await db.$transaction(async (tx) => {
    await tx.churchSettings.update({ where: { id: DEFAULT_ID }, data: { ...data, updatedById: a.userId } });
    await recordAudit(tx, a, { action: "settings.update", entityType: "ChurchSettings", entityId: DEFAULT_ID, metadata: { changed } });
  });
}

export async function updateLogo(actor: Actor | null, file: unknown) {
  const a = requirePermission(actor, "settings:update");
  if (!(file instanceof File)) throw new AppError("VALIDATION_ERROR", "Selecciona una imagen.");
  const name = await saveImage(file, "logo");
  const before = await ensureSettings();
  await db.$transaction(async (tx) => {
    await tx.churchSettings.update({ where: { id: DEFAULT_ID }, data: { logoPath: name, updatedById: a.userId } });
    await recordAudit(tx, a, { action: "settings.logo_update", entityType: "ChurchSettings", entityId: DEFAULT_ID });
  });
  await deleteStored(before.logoPath);
}

export async function removeLogo(actor: Actor | null) {
  const a = requirePermission(actor, "settings:update");
  const before = await ensureSettings();
  await db.$transaction(async (tx) => {
    await tx.churchSettings.update({ where: { id: DEFAULT_ID }, data: { logoPath: null, updatedById: a.userId } });
    await recordAudit(tx, a, { action: "settings.logo_remove", entityType: "ChurchSettings", entityId: DEFAULT_ID });
  });
  await deleteStored(before.logoPath);
}

/** Foto de portada del sitio público (hasta 3 MB: suelen ser fotos tomadas con el celular). */
export async function updateCover(actor: Actor | null, file: unknown) {
  const a = requirePermission(actor, "settings:update");
  if (!(file instanceof File)) throw new AppError("VALIDATION_ERROR", "Selecciona una imagen.");
  const name = await saveImage(file, "cover", 3 * 1024 * 1024);
  const before = await ensureSettings();
  await db.$transaction(async (tx) => {
    await tx.churchSettings.update({ where: { id: DEFAULT_ID }, data: { coverPath: name, updatedById: a.userId } });
    await recordAudit(tx, a, { action: "settings.cover_update", entityType: "ChurchSettings", entityId: DEFAULT_ID });
  });
  await deleteStored(before.coverPath);
}

export async function removeCover(actor: Actor | null) {
  const a = requirePermission(actor, "settings:update");
  const before = await ensureSettings();
  await db.$transaction(async (tx) => {
    await tx.churchSettings.update({ where: { id: DEFAULT_ID }, data: { coverPath: null, updatedById: a.userId } });
    await recordAudit(tx, a, { action: "settings.cover_remove", entityType: "ChurchSettings", entityId: DEFAULT_ID });
  });
  await deleteStored(before.coverPath);
}

// ───── Horarios habituales ─────

export async function listSchedules(actor: Actor | null) {
  requirePermission(actor, "settings:read");
  return db.serviceSchedule.findMany({ orderBy: [{ sortOrder: "asc" }, { dayOfWeek: "asc" }, { startTime: "asc" }] });
}

export async function saveSchedule(actor: Actor | null, id: string | null, input: unknown) {
  const a = requirePermission(actor, "settings:update");
  const data = parseInput(scheduleSchema, input);
  await db.$transaction(async (tx) => {
    const row = id
      ? await tx.serviceSchedule.update({ where: { id }, data })
      : await tx.serviceSchedule.create({ data });
    await recordAudit(tx, a, { action: id ? "schedule.update" : "schedule.create", entityType: "ServiceSchedule", entityId: row.id, metadata: { name: data.name } });
  });
}

export async function deleteSchedule(actor: Actor | null, id: string) {
  const a = requirePermission(actor, "settings:update");
  await db.$transaction(async (tx) => {
    const row = await tx.serviceSchedule.delete({ where: { id } }).catch(() => null);
    if (!row) throw new AppError("NOT_FOUND", "Horario no encontrado.");
    await recordAudit(tx, a, { action: "schedule.delete", entityType: "ServiceSchedule", entityId: id, metadata: { name: row.name } });
  });
}
