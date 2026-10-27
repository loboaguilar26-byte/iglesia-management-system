import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/ui/action-button";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { CheckboxField, Field, SelectField, TextArea } from "@/components/ui/field";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/layout";
import { can } from "@/lib/authz";
import { WEEKDAYS } from "@/lib/dates";
import { requirePageActor } from "@/lib/session";
import { TIMEZONES } from "@/modules/settings/schema";
import { getSettings, listSchedules } from "@/modules/settings/service";
import {
  deleteScheduleAction,
  removeLogoAction,
  saveScheduleAction,
  updateLogoAction,
  updateSettingsAction,
} from "./actions";

export const metadata: Metadata = { title: "Configuración" };

const dayOptions = WEEKDAYS.map((d, i) => ({ value: String(i), label: d }));

export default async function SettingsPage() {
  const actor = await requirePageActor();
  if (!can(actor, "settings:read")) notFound();
  const [s, schedules] = await Promise.all([getSettings(actor), listSchedules(actor)]);
  const editable = can(actor, "settings:update");

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <PageHeader
        title="Configuración de la iglesia"
        description="Datos institucionales, textos del sitio público, contacto y horarios. Los cambios se reflejan en el sitio de inmediato."
      />

      <fieldset disabled={!editable} className="contents">
        <ActionForm action={updateSettingsAction} className="flex flex-col gap-6">
          <Card title="Datos generales">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Nombre de la iglesia" name="name" defaultValue={s.name} required />
              </div>
              <div className="sm:col-span-2">
                <Field label="Lema o frase de bienvenida" name="tagline" defaultValue={s.tagline ?? ""} hint="Aparece bajo el nombre en la portada." />
              </div>
              <SelectField label="Zona horaria" name="timezone" defaultValue={s.timezone} options={(TIMEZONES.includes(s.timezone) ? TIMEZONES : [s.timezone, ...TIMEZONES]).map((t) => ({ value: t, label: t.replace("_", " ") }))} />
              <Field label="Moneda de reportes" name="currency" defaultValue={s.currency} maxLength={3} />
            </div>
          </Card>

          <Card title="Textos del sitio público" description="Escribe con tus propias palabras; el sitio no presupone ninguna denominación.">
            <div className="flex flex-col gap-4">
              <TextArea label="Mensaje de bienvenida" name="welcomeText" defaultValue={s.welcomeText ?? ""} rows={3} />
              <TextArea label="Tu primera visita" name="firstVisitText" defaultValue={s.firstVisitText ?? ""} rows={4} hint="Qué puede esperar alguien que visita por primera vez (horario, estacionamiento, niños…). Un punto por línea." />
              <TextArea label="Quiénes somos" name="aboutText" defaultValue={s.aboutText ?? ""} rows={6} />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextArea label="Misión" name="mission" defaultValue={s.mission ?? ""} />
                <TextArea label="Visión" name="vision" defaultValue={s.vision ?? ""} />
              </div>
              <TextArea label="Valores" name="valuesText" defaultValue={s.valuesText ?? ""} hint="Uno por línea." />
              <TextArea label="Nota sobre horarios" name="scheduleText" defaultValue={s.scheduleText ?? ""} rows={2} hint="Texto opcional que acompaña la lista de horarios." />
            </div>
          </Card>

          <Card title="Contacto y redes" description="Datos institucionales públicos. No uses teléfonos o correos personales.">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Dirección" name="address" defaultValue={s.address ?? ""} />
              </div>
              <Field label="Teléfono" name="phone" type="tel" defaultValue={s.phone ?? ""} />
              <Field label="WhatsApp" name="whatsapp" type="tel" defaultValue={s.whatsapp ?? ""} hint="Con lada, p. ej. 5215512345678" />
              <Field label="Correo de contacto" name="email" type="email" defaultValue={s.email ?? ""} />
              <Field label="Enlace del mapa" name="mapUrl" type="url" defaultValue={s.mapUrl ?? ""} hint="Enlace https:// de Google Maps u OpenStreetMap." />
              <Field label="Facebook" name="facebookUrl" type="url" defaultValue={s.facebookUrl ?? ""} />
              <Field label="Instagram" name="instagramUrl" type="url" defaultValue={s.instagramUrl ?? ""} />
              <Field label="YouTube" name="youtubeUrl" type="url" defaultValue={s.youtubeUrl ?? ""} />
            </div>
          </Card>

          <Card title="Aviso de privacidad" description="Texto que redacta la iglesia (idealmente con asesoría legal). Se publica en /privacidad.">
            <TextArea label="Aviso de privacidad" name="privacyNotice" defaultValue={s.privacyNotice ?? ""} rows={8} />
          </Card>

          {editable ? <SubmitButton>Guardar configuración</SubmitButton> : null}
        </ActionForm>
      </fieldset>

      <Card title="Logotipo" description="PNG, JPG o WebP de hasta 1 MB.">
        <div className="flex flex-wrap items-center gap-6">
          {s.logoPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/media/logo?v=${encodeURIComponent(s.logoPath)}`} alt="Logotipo actual" className="size-24 rounded-xl border border-border bg-white object-contain p-2" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/eclaria-logo.jpg" alt="Logotipo predeterminado de Eclaria" className="h-24 max-w-full rounded-xl border border-border object-contain" />
          )}
          {editable ? (
            <div className="flex flex-col gap-3">
              <ActionForm action={updateLogoAction} className="flex flex-wrap items-end gap-3">
                <Field label="Nueva imagen" name="logo" type="file" accept="image/png,image/jpeg,image/webp" className="py-1.5" />
                <SubmitButton pendingText="Subiendo…">Subir</SubmitButton>
              </ActionForm>
              {s.logoPath ? (
                <ActionButton action={removeLogoAction} confirmMessage="¿Quitar el logotipo?" variant="ghost">
                  Quitar logotipo
                </ActionButton>
              ) : null}
            </div>
          ) : null}
        </div>
      </Card>

      <Card title="Horarios de reuniones" description="Se muestran en el sitio público los marcados como públicos.">
        {schedules.length === 0 ? (
          <EmptyState title="Sin horarios registrados" description="Agrega los cultos o reuniones habituales de la semana." />
        ) : (
          <ul className="flex flex-col gap-3">
            {schedules.map((h) => (
              <li key={h.id} className="rounded-xl border border-border p-4">
                <details>
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2">
                    <span>
                      <span className="font-medium">{h.name}</span>{" "}
                      <span className="text-sm text-muted">
                        · {WEEKDAYS[h.dayOfWeek]} {h.startTime}
                        {h.endTime ? `–${h.endTime}` : ""}
                        {h.location ? ` · ${h.location}` : ""}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      {h.isPublic ? <Badge tone="success">Público</Badge> : <Badge>Interno</Badge>}
                      {editable ? <span className="text-sm text-primary">Editar</span> : null}
                    </span>
                  </summary>
                  {editable ? (
                    <div className="mt-4 flex flex-col gap-3">
                      <ScheduleForm id={h.id} values={h} />
                      <ActionButton action={deleteScheduleAction.bind(null, h.id)} confirmMessage={`¿Eliminar el horario "${h.name}"?`} variant="danger">
                        Eliminar horario
                      </ActionButton>
                    </div>
                  ) : null}
                </details>
              </li>
            ))}
          </ul>
        )}
        {editable ? (
          <details className="mt-4 rounded-xl border border-border bg-surface-2 p-4">
            <summary className="cursor-pointer font-medium text-primary">+ Agregar horario</summary>
            <div className="mt-4">
              <ScheduleForm id={null} />
            </div>
          </details>
        ) : null}
      </Card>
    </div>
  );
}

function ScheduleForm({ id, values }: {
  id: string | null;
  values?: { name: string; dayOfWeek: number; startTime: string; endTime: string | null; location: string | null; description: string | null; isPublic: boolean; sortOrder: number };
}) {
  return (
    <ActionForm action={saveScheduleAction.bind(null, id)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" name="name" defaultValue={values?.name} placeholder="Culto dominical" required />
        <SelectField label="Día" name="dayOfWeek" defaultValue={String(values?.dayOfWeek ?? 0)} options={dayOptions} />
        <Field label="Inicio" name="startTime" type="time" defaultValue={values?.startTime} required />
        <Field label="Fin (opcional)" name="endTime" type="time" defaultValue={values?.endTime ?? ""} />
        <Field label="Lugar" name="location" defaultValue={values?.location ?? ""} placeholder="Templo principal" />
        <Field label="Orden" name="sortOrder" type="number" min={0} defaultValue={String(values?.sortOrder ?? 0)} />
        <div className="sm:col-span-2">
          <TextArea label="Descripción" name="description" defaultValue={values?.description ?? ""} rows={2} />
        </div>
      </div>
      <CheckboxField label="Mostrar en el sitio público" name="isPublic" defaultChecked={values?.isPublic ?? true} />
      <SubmitButton>{id ? "Guardar cambios" : "Agregar horario"}</SubmitButton>
    </ActionForm>
  );
}
