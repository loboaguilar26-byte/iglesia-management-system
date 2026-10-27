import { randomUUID } from "node:crypto";
import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { requireActor, requirePermission, type Actor } from "@/lib/authz";
import { db } from "@/lib/db";
import { zonedToUtc } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { parseInput } from "@/lib/validation";
import { decryptConfessionValue, encryptConfessionValue, type EncryptedValue } from "./crypto";

const appointmentStatuses = ["REQUESTED", "CONFIRMED", "CANCELLED", "COMPLETED"] as const;
const messageStatuses = ["NEW", "READ", "RESPONDED", "CLOSED"] as const;

export const APPOINTMENT_STATUS_LABEL: Record<(typeof appointmentStatuses)[number], string> = {
  REQUESTED: "Por confirmar",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
  COMPLETED: "Atendida",
};

export const CONFESSION_MESSAGE_STATUS_LABEL: Record<(typeof messageStatuses)[number], string> = {
  NEW: "Nueva",
  READ: "Leída",
  RESPONDED: "Respondida",
  CLOSED: "Cerrada",
};

function requirePriest(actor: Actor | null, permission: "confessions:read" | "confessions:manage") {
  const a = requireActor(actor);
  if (!a.roles.includes("PRIEST")) throw new AppError("FORBIDDEN");
  return requirePermission(a, permission);
}

export async function getPublicConfessionLocations() {
  const [settings, chapels] = await Promise.all([
    db.churchSettings.findUnique({ where: { id: "default" }, select: { name: true, timezone: true } }),
    db.chapel.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, address: true },
    }),
  ]);
  return {
    mainChurchName: settings?.name ?? "Eclaria",
    timezone: settings?.timezone ?? "America/Mexico_City",
    chapels,
  };
}

const appointmentSchema = z.object({
  chapelId: z.string().trim().max(64).default("main"),
  scheduledAt: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Selecciona fecha y hora."),
  contactName: z.string().trim().max(120, "Máximo 120 caracteres").optional().default(""),
  contactPhone: z.string().trim().max(40, "Máximo 40 caracteres").optional().default(""),
  contactEmail: z.string().trim().max(254).optional().default("").refine((value) => !value || z.email().safeParse(value).success, "Correo inválido."),
  website: z.string().optional().default(""),
});

export async function requestConfessionAppointment(input: unknown) {
  const data = parseInput(appointmentSchema, input);
  if (data.website) return;

  const { timezone, mainChurchName, chapels } = await getPublicConfessionLocations();
  let chapelId: string | null = null;
  let locationName = mainChurchName;
  let locationKey = "main";

  if (data.chapelId !== "main") {
    const chapel = chapels.find((item) => item.id === data.chapelId);
    if (!chapel) throw new AppError("VALIDATION_ERROR", "La capilla seleccionada no está disponible.", { chapelId: ["Selecciona una capilla activa."] });
    chapelId = chapel.id;
    locationName = chapel.name;
    locationKey = `chapel:${chapel.id}`;
  }

  let scheduledAt: Date;
  try {
    scheduledAt = zonedToUtc(data.scheduledAt, timezone);
  } catch {
    throw new AppError("VALIDATION_ERROR", "La fecha u hora no es válida.", { scheduledAt: ["Selecciona una fecha y hora válidas."] });
  }
  const now = Date.now();
  if (scheduledAt.getTime() < now + 60 * 60 * 1000 || scheduledAt.getTime() > now + 90 * 86400000) {
    throw new AppError("VALIDATION_ERROR", "La cita debe solicitarse con al menos una hora de anticipación y dentro de los próximos 90 días.", {
      scheduledAt: ["Selecciona una fecha entre una hora y 90 días a partir de ahora."],
    });
  }
  if (scheduledAt.getUTCMinutes() % 30 !== 0) {
    throw new AppError("VALIDATION_ERROR", "Las solicitudes se hacen en intervalos de 30 minutos.", {
      scheduledAt: ["Elige una hora en punto o a la media hora."],
    });
  }

  const contact = {
    name: data.contactName || null,
    phone: data.contactPhone || null,
    email: data.contactEmail || null,
  };
  const encryptedContact = Object.values(contact).some(Boolean)
    ? encryptConfessionValue(JSON.stringify(contact))
    : null;

  await db.$transaction(async (tx) => {
    // El candado devuelve `void`; $executeRaw no intenta leer el resultado.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${locationKey}), hashtext(${scheduledAt.toISOString()}))`;
    const existing = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id"
      FROM "confession_appointment"
      WHERE "locationKey" = ${locationKey}
        AND "scheduledAt" = ${scheduledAt}
        AND "status" <> 'CANCELLED'
      LIMIT 1
    `;
    if (existing.length) throw new AppError("CONFLICT", "Ese horario ya fue solicitado. Elige otro.");

    await tx.$executeRaw`
      INSERT INTO "confession_appointment" (
        "id", "locationKey", "locationName", "chapelId", "scheduledAt",
        "contactCiphertext", "contactIv", "contactAuthTag", "status", "createdAt", "updatedAt"
      ) VALUES (
        ${randomUUID()}, ${locationKey}, ${locationName}, ${chapelId}, ${scheduledAt},
        ${encryptedContact?.ciphertext ?? null}, ${encryptedContact?.iv ?? null}, ${encryptedContact?.authTag ?? null},
        'REQUESTED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `;
  });
}

const messageSchema = z.object({
  body: z.string().trim().min(10, "Escribe al menos 10 caracteres.").max(3000, "Máximo 3000 caracteres."),
  website: z.string().optional().default(""),
});

export async function submitAnonymousConfessionMessage(input: unknown) {
  const { body, website } = parseInput(messageSchema, input);
  if (website) return;
  const encrypted = encryptConfessionValue(body);
  await db.$executeRaw`
    INSERT INTO "confession_message" (
      "id", "bodyCiphertext", "bodyIv", "bodyAuthTag", "status", "createdAt", "updatedAt"
    ) VALUES (
      ${randomUUID()}, ${encrypted.ciphertext}, ${encrypted.iv}, ${encrypted.authTag},
      'NEW', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
  `;
}

type AppointmentRow = {
  id: string;
  locationName: string;
  scheduledAt: Date;
  contactCiphertext: string | null;
  contactIv: string | null;
  contactAuthTag: string | null;
  status: (typeof appointmentStatuses)[number];
  createdAt: Date;
  handledByName: string | null;
};

type MessageRow = {
  id: string;
  bodyCiphertext: string;
  bodyIv: string;
  bodyAuthTag: string;
  priestResponseCiphertext: string | null;
  responseIv: string | null;
  responseAuthTag: string | null;
  status: (typeof messageStatuses)[number];
  createdAt: Date;
  handledByName: string | null;
};

function decryptNullable(
  ciphertext: string | null,
  iv: string | null,
  authTag: string | null,
) {
  if (!ciphertext || !iv || !authTag) return null;
  return decryptConfessionValue({ ciphertext, iv, authTag } satisfies EncryptedValue);
}

export async function listConfessions(actor: Actor | null) {
  requirePriest(actor, "confessions:read");
  const [appointments, messages] = await Promise.all([
    db.$queryRaw<AppointmentRow[]>`
      SELECT appointment."id", appointment."locationName", appointment."scheduledAt",
        appointment."contactCiphertext", appointment."contactIv", appointment."contactAuthTag",
        appointment."status", appointment."createdAt", handler."name" AS "handledByName"
      FROM "confession_appointment" AS appointment
      LEFT JOIN "user" AS handler ON handler."id" = appointment."handledById"
      ORDER BY appointment."scheduledAt" ASC
      LIMIT 100
    `,
    db.$queryRaw<MessageRow[]>`
      SELECT message."id", message."bodyCiphertext", message."bodyIv", message."bodyAuthTag",
        message."priestResponseCiphertext", message."responseIv", message."responseAuthTag",
        message."status", message."createdAt", handler."name" AS "handledByName"
      FROM "confession_message" AS message
      LEFT JOIN "user" AS handler ON handler."id" = message."handledById"
      ORDER BY message."createdAt" DESC
      LIMIT 100
    `,
  ]);
  return {
    appointments: appointments.map((item) => {
      const contactValue = decryptNullable(item.contactCiphertext, item.contactIv, item.contactAuthTag);
      return {
        id: item.id,
        locationName: item.locationName,
        scheduledAt: item.scheduledAt,
        status: item.status,
        createdAt: item.createdAt,
        handledByName: item.handledByName,
        contact: contactValue ? (JSON.parse(contactValue) as { name: string | null; phone: string | null; email: string | null }) : null,
      };
    }),
    messages: messages.map((item) => ({
      id: item.id,
      body: decryptConfessionValue({ ciphertext: item.bodyCiphertext, iv: item.bodyIv, authTag: item.bodyAuthTag }),
      priestResponse: decryptNullable(item.priestResponseCiphertext, item.responseIv, item.responseAuthTag),
      status: item.status,
      createdAt: item.createdAt,
      handledByName: item.handledByName,
    })),
  };
}

const appointmentUpdateSchema = z.object({ status: z.enum(appointmentStatuses) });

export async function updateConfessionAppointment(actor: Actor | null, id: string, input: unknown) {
  const a = requirePriest(actor, "confessions:manage");
  const { status } = parseInput(appointmentUpdateSchema, input);
  await db.$transaction(async (tx) => {
    const [current] = await tx.$queryRaw<{ status: (typeof appointmentStatuses)[number] }[]>`
      SELECT "status" FROM "confession_appointment" WHERE "id" = ${id} FOR UPDATE
    `;
    if (!current) throw new AppError("NOT_FOUND", "La solicitud de cita no existe.");
    await tx.$executeRaw`
      UPDATE "confession_appointment"
      SET "status" = ${status}::"ConfessionAppointmentStatus", "handledById" = ${a.userId}, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${id}
    `;
    await recordAudit(tx, a, {
      action: "confession.appointment_status",
      entityType: "ConfessionAppointment",
      entityId: id,
      metadata: { before: current.status, after: status },
    });
  });
}

const messageUpdateSchema = z.object({
  status: z.enum(messageStatuses),
  response: z.string().trim().max(3000, "Máximo 3000 caracteres.").optional().default(""),
}).refine((data) => data.status !== "RESPONDED" || data.response.length > 0, {
  message: "Escribe una respuesta para marcar el mensaje como respondido.",
  path: ["response"],
});

export async function updateAnonymousConfessionMessage(actor: Actor | null, id: string, input: unknown) {
  const a = requirePriest(actor, "confessions:manage");
  const { status, response } = parseInput(messageUpdateSchema, input);
  const encryptedResponse = response ? encryptConfessionValue(response) : null;
  await db.$transaction(async (tx) => {
    const [current] = await tx.$queryRaw<{ status: (typeof messageStatuses)[number] }[]>`
      SELECT "status" FROM "confession_message" WHERE "id" = ${id} FOR UPDATE
    `;
    if (!current) throw new AppError("NOT_FOUND", "El mensaje no existe.");
    await tx.$executeRaw`
      UPDATE "confession_message"
      SET "status" = ${status}::"ConfessionMessageStatus",
        "priestResponseCiphertext" = ${encryptedResponse?.ciphertext ?? null},
        "responseIv" = ${encryptedResponse?.iv ?? null},
        "responseAuthTag" = ${encryptedResponse?.authTag ?? null},
        "handledById" = ${a.userId},
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${id}
    `;
    await recordAudit(tx, a, {
      action: "confession.message_status",
      entityType: "ConfessionMessage",
      entityId: id,
      metadata: { before: current.status, after: status },
    });
  });
}
