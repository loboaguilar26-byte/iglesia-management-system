"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { ActionState } from "@/lib/action-state";
import { updateChurchAction } from "../actions";
import { ChurchBanner, ChurchMonogram } from "@/components/visuals";

type Church = {
  id: string;
  name: string;
  slug: string;
  code: string | null;
  profile: {
    primaryColor: string;
    accentColor: string;
    fontFamily: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    timezone: string;
    currency: string;
    aboutText: string | null;
    scheduleText: string | null;
  } | null;
};

export function ChurchProfileForm({ church }: { church: Church }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateChurchAction.bind(null, church.id), {});
  const profile = church.profile;
  const errors = state.fieldErrors ?? {};
  const [name, setName] = useState(church.name);
  const [primary, setPrimary] = useState(profile?.primaryColor ?? "#1e3a5f");
  const [accent, setAccent] = useState(profile?.accentColor ?? "#d97706");
  return (
    <form action={action} className="flex flex-col gap-5">
      {state.message ? <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert> : null}
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold">Identidad</h2>
        <ChurchBanner primary={primary} accent={accent} className="mt-4 rounded-2xl p-5 text-white transition-colors duration-500">
          <div className="relative flex items-center gap-3">
            <ChurchMonogram name={name || "Iglesia"} primary={primary} accent={accent} />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Vista previa</p>
              <p className="truncate font-display text-xl font-semibold">{name || "Nombre de la iglesia"}</p>
            </div>
            <span className="ml-auto hidden rounded-xl px-3 py-1.5 text-sm font-semibold shadow sm:inline" style={{ background: accent }}>Botón</span>
          </div>
        </ChurchBanner>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Nombre de la iglesia" name="name" defaultValue={church.name} required errors={errors.name} onChange={(e) => setName(e.target.value)} />
          <Field label="Código interno" name="code" defaultValue={church.code ?? ""} errors={errors.code} />
          <Field label="Color principal" name="primaryColor" type="color" defaultValue={profile?.primaryColor ?? "#1e3a5f"} errors={errors.primaryColor} onChange={(e) => setPrimary(e.target.value)} className="h-11 w-full cursor-pointer p-1" />
          <Field label="Color de acento" name="accentColor" type="color" defaultValue={profile?.accentColor ?? "#d97706"} errors={errors.accentColor} onChange={(e) => setAccent(e.target.value)} className="h-11 w-full cursor-pointer p-1" />
          <Field label="Tipografía" name="fontFamily" defaultValue={profile?.fontFamily ?? "Geist"} errors={errors.fontFamily} hint="Nombre de una familia tipográfica permitida." />
          <Field label="Moneda" name="currency" defaultValue={profile?.currency ?? "MXN"} maxLength={3} errors={errors.currency} />
          <Field label="Zona horaria" name="timezone" defaultValue={profile?.timezone ?? "America/Mexico_City"} errors={errors.timezone} />
        </div>
      </section>
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold">Contacto y sitio público</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Dirección" name="address" defaultValue={profile?.address ?? ""} errors={errors.address} />
          <Field label="Teléfono" name="phone" defaultValue={profile?.phone ?? ""} errors={errors.phone} />
          <Field label="Correo público" name="email" type="email" defaultValue={profile?.email ?? ""} errors={errors.email} />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium">Acerca de<textarea name="aboutText" defaultValue={profile?.aboutText ?? ""} className="min-h-28 rounded-lg border border-border bg-surface p-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/30" /></label>
          <label className="flex flex-col gap-1 text-sm font-medium">Horarios<textarea name="scheduleText" defaultValue={profile?.scheduleText ?? ""} className="min-h-28 rounded-lg border border-border bg-surface p-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/30" /></label>
        </div>
      </section>
      <Button type="submit" disabled={pending} className="self-start">{pending ? "Guardando…" : "Guardar configuración"}</Button>
    </form>
  );
}
