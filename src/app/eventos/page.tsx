import { CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";
import { PublicSection, PublicShell } from "@/components/public-site";
import { formatDateTime } from "@/lib/dates";
import { getPublicEvents, getPublicSite } from "@/modules/public/service";

export default async function EventsPage() { const [{ settings }, events] = await Promise.all([getPublicSite(), getPublicEvents(50)]); return <PublicShell name={settings.name}><PublicSection title="Eventos" eyebrow="Agenda"><div className="flex flex-col gap-4">{events.map((event) => <Link key={event.id} href={`/eventos/${event.id}`} className="rounded-2xl border border-border bg-surface p-5 shadow-sm hover:border-primary"><div className="flex flex-wrap items-center gap-4 text-sm text-muted"><span className="flex items-center gap-2 text-primary"><CalendarDays className="size-4" aria-hidden />{formatDateTime(event.startsAt, settings.timezone)}</span>{event.location ? <span className="flex items-center gap-2"><MapPin className="size-4" aria-hidden />{event.location}</span> : null}</div><h2 className="mt-3 text-xl font-semibold">{event.title}</h2><p className="mt-2 text-sm text-muted">{event.description ?? event.type.name}</p></Link>)}{!events.length ? <p className="text-muted">No hay eventos públicos programados.</p> : null}</div></PublicSection></PublicShell>; }
