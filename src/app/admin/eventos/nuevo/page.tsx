import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { can } from "@/lib/authz";
import { requirePageActor } from "@/lib/session";
import { listEventTypes } from "@/modules/events/service";
import { EventForm } from "../event-form";
export const metadata: Metadata = { title: "Nuevo evento" };
export default async function NewEventPage() { const actor = await requirePageActor(); if (!can(actor, "events:create")) notFound(); const types = await listEventTypes(actor); return <div className="flex flex-col gap-6"><Link href="/admin/eventos" className="text-sm text-primary hover:underline">← Eventos</Link><div><h1 className="text-3xl font-semibold">Crear evento</h1><p className="mt-2 text-sm text-muted">Las fechas se guardan como UTC y se muestran según la zona configurada.</p></div><EventForm types={types} /></div>; }
