import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { can } from "@/lib/authz";
import { requirePageActor } from "@/lib/session";
import { getSettings, listSchedules } from "@/modules/settings/service";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Configuración" };

export default async function SettingsPage() {
  const actor = await requirePageActor();
  if (!can(actor, "settings:read")) notFound();
  const [settings, schedules] = await Promise.all([getSettings(actor), listSchedules(actor)]);
  return <div className="flex max-w-5xl flex-col gap-6"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Identidad</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Configuración pública</h1><p className="mt-2 text-sm text-muted">Estos datos alimentan la portada y las secciones públicas de la iglesia.</p></div><SettingsForm settings={settings} schedules={schedules} editable={can(actor, "settings:update")} /></div>;
}
