"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { ActionState } from "@/lib/action-state";
import { TIMEZONES } from "@/modules/settings/schema";
import { saveScheduleAction, updateSettingsAction } from "./actions";

type Settings = { name: string; tagline: string | null; welcomeText: string | null; firstVisitText: string | null; aboutText: string | null; mission: string | null; vision: string | null; valuesText: string | null; scheduleText: string | null; address: string | null; phone: string | null; whatsapp: string | null; email: string | null; mapUrl: string | null; facebookUrl: string | null; instagramUrl: string | null; youtubeUrl: string | null; privacyNotice: string | null; timezone: string; currency: string };
type Schedule = { id: string; name: string; dayOfWeek: number; startTime: string; endTime: string | null; location: string | null; description: string | null; isPublic: boolean; sortOrder: number };

export function SettingsForm({ settings, schedules, editable }: { settings: Settings; schedules: Schedule[]; editable: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateSettingsAction, {});
  return <>
    <form action={action} className="flex flex-col gap-5">
      {state.message ? <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert> : null}
      <fieldset disabled={!editable} className="flex flex-col gap-5">
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm"><h2 className="text-lg font-semibold">Datos generales</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Nombre de la iglesia" name="name" defaultValue={settings.name} required /><Field label="Lema" name="tagline" defaultValue={settings.tagline ?? ""} /><Field label="Zona horaria" name="timezone" defaultValue={settings.timezone} list="timezones" /><Field label="Moneda" name="currency" defaultValue={settings.currency} maxLength={3} /><datalist id="timezones">{TIMEZONES.map((zone) => <option key={zone} value={zone} />)}</datalist></div></section>
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm"><h2 className="text-lg font-semibold">Contenido del sitio</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><TextArea label="Mensaje de bienvenida" name="welcomeText" defaultValue={settings.welcomeText ?? ""} /><TextArea label="Quiénes somos" name="aboutText" defaultValue={settings.aboutText ?? ""} /><TextArea label="Misión" name="mission" defaultValue={settings.mission ?? ""} /><TextArea label="Visión" name="vision" defaultValue={settings.vision ?? ""} /><TextArea label="Valores" name="valuesText" defaultValue={settings.valuesText ?? ""} /><TextArea label="Primera visita" name="firstVisitText" defaultValue={settings.firstVisitText ?? ""} hint="Un punto por línea." /><TextArea label="Texto de horarios" name="scheduleText" defaultValue={settings.scheduleText ?? ""} /></div></section>
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm"><h2 className="text-lg font-semibold">Contacto y redes</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Dirección" name="address" defaultValue={settings.address ?? ""} /><Field label="Teléfono" name="phone" defaultValue={settings.phone ?? ""} /><Field label="WhatsApp" name="whatsapp" defaultValue={settings.whatsapp ?? ""} /><Field label="Correo" name="email" type="email" defaultValue={settings.email ?? ""} /><Field label="Mapa https://" name="mapUrl" defaultValue={settings.mapUrl ?? ""} /><Field label="Facebook https://" name="facebookUrl" defaultValue={settings.facebookUrl ?? ""} /><Field label="Instagram https://" name="instagramUrl" defaultValue={settings.instagramUrl ?? ""} /><Field label="YouTube https://" name="youtubeUrl" defaultValue={settings.youtubeUrl ?? ""} /></div></section>
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm"><h2 className="text-lg font-semibold">Privacidad</h2><TextArea label="Aviso de privacidad" name="privacyNotice" defaultValue={settings.privacyNotice ?? ""} /></section>
      </fieldset>
      {editable ? <Button type="submit" disabled={pending}>{pending ? "Guardando…" : "Guardar configuración"}</Button> : null}
    </form>
    <Schedules schedules={schedules} editable={editable} />
  </>;
}

function TextArea({ label, name, defaultValue, hint }: { label: string; name: string; defaultValue: string; hint?: string }) { return <label className="flex flex-col gap-1 text-sm font-medium"><span>{label}</span><textarea name={name} defaultValue={defaultValue} className="min-h-24 rounded-lg border border-border bg-surface p-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/30" />{hint ? <span className="text-xs text-muted">{hint}</span> : null}</label>; }

function Schedules({ schedules, editable }: { schedules: Schedule[]; editable: boolean }) {
  return <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm"><h2 className="text-lg font-semibold">Horarios públicos</h2><p className="mt-1 text-sm text-muted">Se muestran en la portada y en la sección de horarios.</p><div className="mt-4 flex flex-col gap-3">{schedules.map((schedule) => <ScheduleForm key={schedule.id} schedule={schedule} editable={editable} />)}{editable ? <ScheduleForm schedule={null} editable /> : null}</div></section>;
}

function ScheduleForm({ schedule, editable }: { schedule: Schedule | null; editable: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveScheduleAction.bind(null, schedule?.id ?? null), {});
  const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  return <form action={action} className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2 lg:grid-cols-4"><Field label={schedule ? "Nombre" : "Nuevo horario"} name="name" defaultValue={schedule?.name ?? ""} placeholder="Culto dominical" disabled={!editable} required /><label className="flex flex-col gap-1 text-sm font-medium"><span>Día</span><select name="dayOfWeek" defaultValue={String(schedule?.dayOfWeek ?? 0)} disabled={!editable} className="min-h-11 rounded-lg border border-border bg-surface px-3"><option value="0">Domingo</option>{days.slice(1).map((day, index) => <option key={day} value={String(index + 1)}>{day}</option>)}</select></label><Field label="Inicio" name="startTime" type="time" defaultValue={schedule?.startTime ?? "10:00"} disabled={!editable} required /><Field label="Fin" name="endTime" type="time" defaultValue={schedule?.endTime ?? ""} disabled={!editable} /><Field label="Lugar" name="location" defaultValue={schedule?.location ?? ""} disabled={!editable} /><Field label="Orden" name="sortOrder" type="number" defaultValue={String(schedule?.sortOrder ?? 0)} disabled={!editable} /><label className="flex items-center gap-2 pt-7 text-sm"><input type="checkbox" name="isPublic" defaultChecked={schedule?.isPublic ?? true} disabled={!editable} /> Visible públicamente</label><div className="flex items-end gap-2">{editable ? <Button type="submit" disabled={pending}>{pending ? "Guardando…" : schedule ? "Actualizar" : "Agregar"}</Button> : null}{state.message ? <span className={state.ok ? "text-sm text-success" : "text-sm text-danger"}>{state.message}</span> : null}</div></form>;
}
