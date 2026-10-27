import type { Metadata } from "next";
import { Suspense } from "react";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatLongDate, formatTime } from "@/lib/dates";
import { getPublicEvent, getPublicSite } from "@/modules/public/service";

export async function generateMetadata({ params }: PageProps<"/eventos/[id]">): Promise<Metadata> {
  const e = await getPublicEvent((await params).id);
  return { title: e?.title ?? "Evento", description: e?.description?.slice(0, 160) };
}

export default function PublicEventPage({ params }: PageProps<"/eventos/[id]">) {
  return (
    <Suspense fallback={<p className="mx-auto max-w-3xl px-4 py-14 text-muted sm:px-6">Cargando…</p>}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/eventos/[id]">["params"] }) {
  const { id } = await params;
  const [{ settings }, e] = await Promise.all([getPublicSite(), getPublicEvent(id)]);
  if (!e) notFound();
  const tz = settings.timezone;
  const cancelled = e.status === "CANCELLED";
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <Link href="/eventos" className="text-sm text-primary hover:underline">← Eventos</Link>
      <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-accent">{e.type.name}</p>
      <h1 className={`mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl ${cancelled ? "line-through opacity-70" : ""}`}>{e.title}</h1>
      {cancelled ? <p role="status" className="mt-4 rounded-xl bg-danger/10 px-4 py-3 font-medium text-danger">Este evento fue cancelado.</p> : null}
      <ul className="mt-6 flex flex-col gap-2 text-lg">
        <li className="flex items-center gap-3"><CalendarDays aria-hidden className="size-5 text-accent" />{formatLongDate(e.startsAt, tz)}</li>
        <li className="flex items-center gap-3"><Clock aria-hidden className="size-5 text-accent" />{formatTime(e.startsAt, tz)} – {formatTime(e.endsAt, tz)} h</li>
        {e.location ? <li className="flex items-center gap-3"><MapPin aria-hidden className="size-5 text-accent" />{e.location}</li> : null}
      </ul>
      {e.description ? <div className="mt-8 whitespace-pre-line text-lg leading-relaxed">{e.description}</div> : null}
    </article>
  );
}
