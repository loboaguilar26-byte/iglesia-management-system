import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { SelectField, TextArea } from "@/components/ui/field";
import { Badge, EmptyState, PageHeader } from "@/components/ui/layout";
import { can } from "@/lib/authz";
import { formatDateTime } from "@/lib/dates";
import { requirePageActor } from "@/lib/session";
import {
  APPOINTMENT_STATUS_LABEL,
  CONFESSION_MESSAGE_STATUS_LABEL,
  listConfessions,
} from "@/modules/confessions/service";
import { getChurchTimezone } from "@/modules/settings/service";
import {
  updateAnonymousConfessionMessageAction,
  updateConfessionAppointmentAction,
} from "./actions";

export const metadata: Metadata = { title: "Confesiones confidenciales" };

const appointmentTone = { REQUESTED: "warning", CONFIRMED: "success", CANCELLED: "neutral", COMPLETED: "info" } as const;
const messageTone = { NEW: "warning", READ: "info", RESPONDED: "success", CLOSED: "neutral" } as const;

export default async function ConfessionsAdminPage() {
  const actor = await requirePageActor();
  if (!actor.roles.includes("PRIEST") || !can(actor, "confessions:read")) notFound();
  const [{ appointments, messages }, timezone] = await Promise.all([
    listConfessions(actor),
    getChurchTimezone(),
  ]);
  const manage = actor.roles.includes("PRIEST") && can(actor, "confessions:manage");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Confesiones confidenciales"
        description="Contenido reservado exclusivamente a sacerdotes. No compartas ni copies mensajes fuera del espacio pastoral protegido."
      />
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-semibold">Citas solicitadas</h2>
        {appointments.length ? (
          <ul className="grid gap-4 lg:grid-cols-2">
            {appointments.map((appointment) => (
              <li key={appointment.id} className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{appointment.locationName}</h3>
                    <p className="mt-1 text-sm text-muted">{formatDateTime(appointment.scheduledAt, timezone)}</p>
                    <p className="mt-1 text-xs text-muted">Solicitada {formatDateTime(appointment.createdAt, timezone)}</p>
                  </div>
                  <Badge tone={appointmentTone[appointment.status]}>{APPOINTMENT_STATUS_LABEL[appointment.status]}</Badge>
                </div>
                <div className="rounded-xl bg-surface-2 p-3 text-sm">
                  <p className="mb-1 font-medium">Contacto (cifrado)</p>
                  {appointment.contact ? (
                    <p className="whitespace-pre-line">
                      {[appointment.contact.name, appointment.contact.phone, appointment.contact.email].filter(Boolean).join("\n")}
                    </p>
                  ) : <p className="text-muted">No proporcionó datos de contacto.</p>}
                </div>
                {appointment.handledByName ? <p className="text-xs text-muted">Atendida por {appointment.handledByName}</p> : null}
                {manage ? (
                  <ActionForm action={updateConfessionAppointmentAction.bind(null, appointment.id)} className="flex flex-wrap items-end gap-3 border-t border-border pt-3">
                    <SelectField
                      label="Estado de la solicitud"
                      name="status"
                      defaultValue={appointment.status}
                      options={Object.entries(APPOINTMENT_STATUS_LABEL).map(([value, label]) => ({ value, label }))}
                    />
                    <SubmitButton>Guardar</SubmitButton>
                  </ActionForm>
                ) : null}
              </li>
            ))}
          </ul>
        ) : <EmptyState title="No hay citas solicitadas" />}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-semibold">Mensajes anónimos</h2>
        {messages.length ? (
          <ul className="grid gap-4 lg:grid-cols-2">
            {messages.map((message) => (
              <li key={message.id} className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs text-muted">Recibido {formatDateTime(message.createdAt, timezone)}</p>
                  <Badge tone={messageTone[message.status]}>{CONFESSION_MESSAGE_STATUS_LABEL[message.status]}</Badge>
                </div>
                <p className="whitespace-pre-line rounded-xl bg-surface-2 p-4 text-sm leading-relaxed">{message.body}</p>
                {message.handledByName ? <p className="text-xs text-muted">Atendido por {message.handledByName}</p> : null}
                {manage ? (
                  <ActionForm action={updateAnonymousConfessionMessageAction.bind(null, message.id)} className="flex flex-col gap-3 border-t border-border pt-3">
                    <SelectField
                      label="Estado"
                      name="status"
                      defaultValue={message.status}
                      options={Object.entries(CONFESSION_MESSAGE_STATUS_LABEL).map(([value, label]) => ({ value, label }))}
                    />
                    <TextArea
                      label="Respuesta pastoral (solo sacerdotes)"
                      name="response"
                      rows={3}
                      maxLength={3000}
                      defaultValue={message.priestResponse ?? ""}
                      hint="La respuesta queda en el expediente cifrado; el remitente es anónimo y no podrá recibir una notificación."
                    />
                    <SubmitButton>Guardar respuesta</SubmitButton>
                  </ActionForm>
                ) : message.priestResponse ? (
                  <p className="whitespace-pre-line rounded-xl border border-accent/20 p-3 text-sm">{message.priestResponse}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : <EmptyState title="No hay mensajes anónimos" />}
      </section>
    </div>
  );
}
