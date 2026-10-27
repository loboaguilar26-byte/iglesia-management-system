"use client";

import { CalendarClock, LockKeyhole, Send } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, SelectField, TextArea } from "@/components/ui/field";
import {
  requestConfessionAppointmentAction,
  submitAnonymousConfessionMessageAction,
} from "./actions";

type ChapelOption = { id: string; name: string; address: string | null };

function Honeypot({ id }: { id: string }) {
  return (
    <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
      <label htmlFor={id}>Sitio web</label>
      <input id={id} name="website" tabIndex={-1} autoComplete="off" />
    </div>
  );
}

export function ConfessionForms({
  mainChurchName,
  chapels,
  minimumDate,
  maximumDate,
  timezone,
}: {
  mainChurchName: string;
  chapels: ChapelOption[];
  minimumDate: string;
  maximumDate: string;
  timezone: string;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-start gap-4">
          <span className="rounded-2xl bg-accent-soft p-3 text-accent"><CalendarClock aria-hidden className="size-6" /></span>
          <div>
            <h2 className="font-display text-2xl font-semibold">Solicitar una cita</h2>
            <p className="mt-1 text-sm text-muted">El sacerdote confirmará la disponibilidad. La solicitud aún no es una cita confirmada.</p>
          </div>
        </div>
        <ActionForm action={requestConfessionAppointmentAction} className="relative flex flex-col gap-4">
          <Honeypot id="confession-appointment-website" />
          <SelectField
            label="Iglesia o capilla"
            name="chapelId"
            defaultValue="main"
            options={[
              { value: "main", label: mainChurchName },
              ...chapels.map((chapel) => ({ value: chapel.id, label: chapel.address ? `${chapel.name} · ${chapel.address}` : chapel.name })),
            ]}
            required
          />
          <Field
            label="Fecha y hora preferidas"
            name="scheduledAt"
            type="datetime-local"
            min={minimumDate}
            max={maximumDate}
            step={1800}
            hint={`Elige una hora en punto o a la media hora, con al menos una hora de anticipación. Hora de la iglesia (${timezone}).`}
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre (opcional)" name="contactName" autoComplete="name" maxLength={120} />
            <Field label="Teléfono (opcional)" name="contactPhone" type="tel" autoComplete="tel" maxLength={40} />
          </div>
          <Field label="Correo (opcional)" name="contactEmail" type="email" autoComplete="email" maxLength={254} />
          <p className="rounded-xl bg-surface-2 p-3 text-xs leading-relaxed text-muted">
            Los datos de contacto son opcionales, se cifran y solo los sacerdotes autorizados pueden consultarlos.
          </p>
          <SubmitButton className="self-start"><span className="inline-flex items-center gap-2"><CalendarClock aria-hidden className="size-4" />Enviar solicitud</span></SubmitButton>
        </ActionForm>
      </section>

      <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-start gap-4">
          <span className="rounded-2xl bg-accent-soft p-3 text-accent"><LockKeyhole aria-hidden className="size-6" /></span>
          <div>
            <h2 className="font-display text-2xl font-semibold">Compartir algo en confianza</h2>
            <p className="mt-1 text-sm text-muted">No escribas tu nombre ni datos que te identifiquen si deseas conservar el anonimato.</p>
          </div>
        </div>
        <ActionForm action={submitAnonymousConfessionMessageAction} className="relative flex flex-col gap-4">
          <Honeypot id="confession-message-website" />
          <TextArea
            label="Mensaje anónimo"
            name="body"
            rows={9}
            minLength={10}
            maxLength={3000}
            hint="El mensaje se cifra y solo pueden leerlo sacerdotes. No guardamos tu cuenta, nombre, teléfono, correo ni dirección IP en el expediente; la infraestructura puede tener registros técnicos propios."
            required
          />
          <p className="rounded-xl bg-surface-2 p-3 text-xs leading-relaxed text-muted">
            Este espacio no es un servicio de emergencia. Si alguien está en peligro inmediato, contacta a los servicios de emergencia de tu localidad.
          </p>
          <SubmitButton className="self-start"><span className="inline-flex items-center gap-2"><Send aria-hidden className="size-4" />Enviar anónimamente</span></SubmitButton>
        </ActionForm>
      </section>
    </div>
  );
}
