import { notFound } from "next/navigation";
import { CalendarDays, MapPin } from "lucide-react";
import { PublicSection, PublicShell } from "@/components/public-site";
import { formatDateTime } from "@/lib/dates";
import { getPublicEvent, getPublicSite } from "@/modules/public/service";

export const instant = false;

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const [{ settings }, event] = await Promise.all([getPublicSite(), getPublicEvent(id)]); if (!event) notFound(); return <PublicShell name={settings.name}><PublicSection title={event.title} eyebrow={event.type.name}><div className="flex flex-wrap gap-5 text-muted"><span className="flex items-center gap-2"><CalendarDays className="size-5 text-primary" aria-hidden />{formatDateTime(event.startsAt, settings.timezone)}</span>{event.location ? <span className="flex items-center gap-2"><MapPin className="size-5 text-primary" aria-hidden />{event.location}</span> : null}</div>{event.description ? <p className="mt-8 max-w-3xl whitespace-pre-line text-lg leading-8 text-muted">{event.description}</p> : null}</PublicSection></PublicShell>; }
