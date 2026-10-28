"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { CheckboxField, Field, TextArea } from "@/components/ui/field";
import { ChurchBanner, ChurchMonogram } from "@/components/visuals";
import type { ActionState } from "@/lib/action-state";

type Identity = {
  name: string;
  isPublic: boolean;
  primaryColor: string;
  accentColor: string;
  tagline: string | null;
  aboutText: string | null;
  scheduleText: string | null;
  mapUrl: string | null;
  whatsapp: string | null;
};

/** Identidad de la capilla con vista previa en vivo de su portada pública. */
export function ChapelIdentityForm({ action, values, coverUrl }: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  values: Identity;
  coverUrl: string | null;
}) {
  const [primary, setPrimary] = useState(values.primaryColor);
  const [accent, setAccent] = useState(values.accentColor);
  const [tagline, setTagline] = useState(values.tagline ?? "");

  return (
    <ActionForm action={action}>
      <ChurchBanner primary={primary} accent={accent} className="rounded-2xl p-6 text-white">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="" className="absolute inset-0 size-full object-cover opacity-25 mix-blend-luminosity" />
        ) : null}
        <div className="relative flex items-center gap-4">
          <ChurchMonogram name={values.name} primary={primary} accent={accent} size="lg" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Vista previa de la página pública</p>
            <p className="truncate font-display text-2xl font-semibold">{values.name}</p>
            <p className="truncate text-sm text-white/80">{tagline || "Escribe un lema para la capilla"}</p>
          </div>
          <span className="ml-auto hidden rounded-xl px-4 py-2 text-sm font-semibold shadow sm:inline" style={{ background: accent, color: "#fff" }}>Visítanos</span>
        </div>
      </ChurchBanner>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Color principal" name="primaryColor" type="color" defaultValue={values.primaryColor} onChange={(e) => setPrimary(e.target.value)} className="h-11 w-full cursor-pointer p-1" />
        <Field label="Color de acento" name="accentColor" type="color" defaultValue={values.accentColor} onChange={(e) => setAccent(e.target.value)} className="h-11 w-full cursor-pointer p-1" />
      </div>
      <Field label="Lema" name="tagline" defaultValue={values.tagline ?? ""} maxLength={160} placeholder="Ej. Una familia de fe en el corazón del barrio" onChange={(e) => setTagline(e.target.value)} />
      <TextArea label="Presentación" name="aboutText" rows={4} defaultValue={values.aboutText ?? ""} maxLength={4000} hint="Historia, misión o lo que hace especial a esta capilla." />
      <TextArea label="Horarios" name="scheduleText" rows={3} defaultValue={values.scheduleText ?? ""} maxLength={2000} placeholder={"Domingo 10:00 Misa\nMiércoles 19:00 Oración"} hint="Un horario por línea." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Enlace del mapa" name="mapUrl" type="url" defaultValue={values.mapUrl ?? ""} placeholder="https://maps.google.com/…" />
        <Field label="WhatsApp" name="whatsapp" type="tel" defaultValue={values.whatsapp ?? ""} placeholder="55 1234 5678" />
      </div>
      <CheckboxField label="Mostrar en el sitio público" name="isPublic" defaultChecked={values.isPublic} hint="Aparece en /capillas con su propia página mientras esté activa." />
      <SubmitButton>Guardar identidad</SubmitButton>
    </ActionForm>
  );
}
