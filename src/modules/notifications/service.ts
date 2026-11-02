import { db } from "@/lib/db";
import { sendMail } from "@/lib/mailer";
import { requirePermission, type Actor } from "@/lib/authz";
import type { NotificationType } from "@/generated/prisma/client";

type NotificationInput = {
  type: NotificationType;
  recipient: string;
  subject: string;
  body: string;
  memberId?: string;
  eventId?: string;
};

/** Registra y entrega una notificación. WhatsApp queda preparado para un proveedor futuro. */
async function deliverEmailNotification(input: NotificationInput) {
  const row = await db.notification.create({ data: { ...input, channel: "EMAIL" } });
  try {
    const result = await sendMail({ to: input.recipient, subject: input.subject, text: input.body });
    if (!result.delivered) {
      return db.notification.update({ where: { id: row.id }, data: { status: "FAILED", error: "Proveedor de correo no configurado" } });
    }
    return db.notification.update({ where: { id: row.id }, data: { status: "SENT", sentAt: new Date() } });
  } catch (error) {
    return db.notification.update({ where: { id: row.id }, data: { status: "FAILED", error: error instanceof Error ? error.message : "Error de entrega" } });
  }
}

export async function notifyAttendanceConfirmation(memberId: string, eventId: string, status: "PRESENT" | "ABSENT") {
  const [member, event] = await Promise.all([
    db.member.findUnique({ where: { id: memberId }, select: { email: true, firstName: true } }),
    db.event.findUnique({ where: { id: eventId }, select: { title: true, startsAt: true } }),
  ]);
  if (!member?.email || !event) return null;
  return deliverEmailNotification({
    type: "ATTENDANCE_CONFIRMATION",
    recipient: member.email,
    memberId,
    eventId,
    subject: `Confirmación de asistencia: ${event.title}`,
    body: `Hola ${member.firstName}, tu asistencia al evento "${event.title}" fue registrada como ${status === "PRESENT" ? "presente" : "ausente"}.`,
  });
}

export async function notifyVisitorFollowUp(memberId: string) {
  const member = await db.member.findUnique({ where: { id: memberId }, select: { email: true, firstName: true, status: true } });
  if (!member?.email || member.status !== "VISITOR") return null;
  return deliverEmailNotification({
    type: "VISITOR_FOLLOWUP",
    recipient: member.email,
    memberId,
    subject: "La iglesia se pondrá en contacto contigo",
    body: `Hola ${member.firstName}, recibimos tus datos y una persona de la iglesia se pondrá en contacto contigo próximamente. Gracias por visitarnos.`,
  });
}

export async function sendEventReminder(actor: Actor | null, eventId: string) {
  requirePermission(actor, "events:update");
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, startsAt: true, responsibles: { select: { member: { select: { id: true, email: true, firstName: true } } } } },
  });
  if (!event) return [];
  const recipients = event.responsibles.map((r) => r.member).filter((m): m is { id: string; email: string; firstName: string } => Boolean(m.email));
  return Promise.all(recipients.map((member) => deliverEmailNotification({
    type: "EVENT_REMINDER",
    recipient: member.email,
    memberId: member.id,
    eventId,
    subject: `Recordatorio de evento: ${event.title}`,
    body: `Hola ${member.firstName}, te recordamos el evento "${event.title}" programado para ${event.startsAt.toLocaleString("es-MX")}.`,
  })));
}

export async function notifyScheduleChange(eventId: string, previousStartsAt: Date, previousEndsAt: Date) {
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, startsAt: true, endsAt: true, responsibles: { select: { member: { select: { id: true, email: true, firstName: true } } } } },
  });
  if (!event) return [];
  const recipients = event.responsibles.map((r) => r.member).filter((m): m is { id: string; email: string; firstName: string } => Boolean(m.email));
  return Promise.all(recipients.map((member) => deliverEmailNotification({
    type: "SCHEDULE_CHANGE",
    recipient: member.email,
    memberId: member.id,
    eventId,
    subject: `Cambio de horario: ${event.title}`,
    body: `Hola ${member.firstName}, el horario de "${event.title}" cambió de ${previousStartsAt.toLocaleString("es-MX")}–${previousEndsAt.toLocaleTimeString("es-MX")} a ${event.startsAt.toLocaleString("es-MX")}–${event.endsAt.toLocaleTimeString("es-MX")}.`,
  })));
}

export async function notifyPastoralRequest() {
  const pastors = await db.user.findMany({
    where: { isActive: true, roles: { some: { role: { key: "PASTOR" } } } },
    select: { email: true },
  });
  return Promise.all(pastors.map((pastor) => deliverEmailNotification({
    type: "PASTORAL_REQUEST",
    recipient: pastor.email,
    subject: "Nueva petición pastoral",
    body: "Hay una nueva petición pastoral pendiente de revisión en el panel de la iglesia.",
  })));
}
