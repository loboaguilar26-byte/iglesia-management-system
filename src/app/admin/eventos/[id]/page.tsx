import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { can } from "@/lib/authz";
import { AppError } from "@/lib/errors";
import { formatDateTime } from "@/lib/dates";
import { requirePageActor } from "@/lib/session";
import { getEvent, listEventTypes } from "@/modules/events/service";
import { getEventAttendance } from "@/modules/attendance/service";
import { EventForm } from "../event-form";
import { CancelEventForm } from "../cancel-form";
import { AttendanceForm } from "../attendance-form";
export const metadata: Metadata = { title: "Evento" };
export default async function EventDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) { const actor = await requirePageActor(); if (!can(actor, "events:read")) notFound(); const { id } = await params; const event = await getEvent(actor, id).catch((e) => { if (e instanceof AppError && e.code === "NOT_FOUND") notFound(); throw e; }); const types = await listEventTypes(actor); const attendance = can(actor, "attendance:read") ? await getEventAttendance(actor, id) : null; return <div className="flex max-w-4xl flex-col gap-6"><Link href="/admin/eventos" className="text-sm text-primary hover:underline">← Eventos</Link>{(await searchParams).creado === "1" ? <Alert tone="success">Evento creado correctamente.</Alert> : null}<div><h1 className="text-3xl font-semibold">{event.title}</h1><p className="mt-2 text-sm text-muted">{event.type.name} · {formatDateTime(event.startsAt)} · {event.status}</p></div>{can(actor, "events:update") && event.status !== "CANCELLED" ? <EventForm event={event} types={types} /> : null}{attendance && can(actor, "attendance:record") ? <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6"><h2 className="text-lg font-semibold">Pase de lista</h2><p className="mt-1 mb-4 text-sm text-muted">Visitantes anónimos registrados: {attendance.event.visitorCount}</p><AttendanceForm eventId={id} rows={attendance.data} /></section> : null}{can(actor, "events:cancel") && event.status !== "CANCELLED" ? <section className="max-w-3xl rounded-2xl border border-border bg-surface p-5 shadow-sm"><h2 className="font-semibold">Cancelar evento</h2><p className="mt-1 mb-4 text-sm text-muted">El evento se conserva para historial y asistencia.</p><CancelEventForm id={event.id} /></section> : null}</div>; }
