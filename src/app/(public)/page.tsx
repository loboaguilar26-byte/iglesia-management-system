import { ArrowRight, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { getPublicAnnouncements, getPublicEvents, getPublicSite } from "@/modules/public/service";
import { Empty, EventCard, ScheduleCards, Section } from "./components";
import { NextService } from "./next-service";

export default async function HomePage() {
  const [{ settings: s, schedules }, events, announcements] = await Promise.all([getPublicSite(), getPublicEvents(3), getPublicAnnouncements(3)]);
  const tz = s.timezone;
  const featured = announcements.filter((a) => a.isFeatured);

  return (
    <>
      {/* Portada */}
      <section className="relative overflow-hidden bg-brand-deep text-white">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_80%_0%,rgba(226,182,94,0.38),transparent_60%),radial-gradient(ellipse_60%_50%_at_0%_100%,rgba(143,179,224,0.25),transparent_60%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-accent">Bienvenidos</p>
            <h1 className="mt-4 font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">{s.name}</h1>
            {s.tagline ? <p className="mt-5 max-w-xl text-xl leading-relaxed opacity-90">{s.tagline}</p> : null}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/horarios" className={buttonClass("accent", "", "lg")}>Horarios de reunión</Link>
              <Link href="/contacto" className={buttonClass("ghost", "border border-white/30 text-white hover:bg-white/10", "lg")}>Cómo llegar</Link>
            </div>
          </div>
          <NextService schedules={schedules} tz={tz} />
        </div>
      </section>

      {featured.length ? (
        <div className="border-b border-accent/30 bg-accent-soft">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">Aviso</span>
            <Link href={`/comunicados/${featured[0].id}`} className="font-medium hover:underline">{featured[0].title}</Link>
          </div>
        </div>
      ) : null}

      {s.welcomeText ? (
        <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <p className="font-display text-2xl leading-relaxed sm:text-3xl">{s.welcomeText}</p>
          <Link href="/nosotros" className="mt-6 inline-flex items-center gap-2 font-medium text-primary hover:underline">Conócenos <ArrowRight aria-hidden className="size-4" /></Link>
        </section>
      ) : null}

      <Section eyebrow="Te esperamos" title="Nuestras reuniones" intro={s.scheduleText ?? undefined} tone="tinted">
        {schedules.length ? <ScheduleCards schedules={schedules} /> : <Empty>Pronto publicaremos nuestros horarios.</Empty>}
      </Section>

      <Section eyebrow="Agenda" title="Próximos eventos">
        {events.length ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {events.map((e) => <EventCard key={e.id} e={e} tz={tz} />)}
          </div>
        ) : (
          <Empty>No hay eventos públicos programados por ahora.</Empty>
        )}
        <Link href="/eventos" className="mt-8 inline-flex items-center gap-2 font-medium text-primary hover:underline">Ver todos los eventos <ArrowRight aria-hidden className="size-4" /></Link>
      </Section>

      {s.mission || s.vision ? (
        <section className="bg-surface">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:px-6 md:grid-cols-2">
            {s.mission ? (
              <div className="rounded-3xl bg-brand p-8 text-white">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Misión</p>
                <p className="mt-3 font-display text-2xl leading-snug">{s.mission}</p>
              </div>
            ) : null}
            {s.vision ? (
              <div className="rounded-3xl border border-border bg-background p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Visión</p>
                <p className="mt-3 font-display text-2xl leading-snug">{s.vision}</p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {announcements.length ? (
        <Section eyebrow="Noticias" title="Comunicados">
          <ul className="grid gap-4 md:grid-cols-3">
            {announcements.map((a) => (
              <li key={a.id}>
                <Link href={`/comunicados/${a.id}`} className={`flex h-full flex-col rounded-2xl border bg-surface p-6 shadow-sm transition hover:shadow-md ${a.isFeatured ? "border-accent" : "border-border"}`}>
                  <h3 className="font-display text-xl font-semibold">{a.title}</h3>
                  <p className="mt-2 line-clamp-3 text-muted">{a.body}</p>
                  <span className="mt-auto pt-4 text-sm font-medium text-primary">Leer más →</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {s.address || s.phone || s.email ? (
        <section className="bg-brand text-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-[1.2fr_1fr] md:items-center">
            <div>
              <h2 className="font-display text-3xl font-semibold">Visítanos</h2>
              <p className="mt-2 opacity-90">Será un gusto recibirte. Si tienes preguntas, contáctanos.</p>
            </div>
            <ul className="flex flex-col gap-3">
              {s.address ? <li className="flex items-start gap-3"><MapPin aria-hidden className="mt-0.5 size-5 text-accent" />{s.mapUrl ? <a href={s.mapUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{s.address}</a> : s.address}</li> : null}
              {s.phone ? <li className="flex items-center gap-3"><Phone aria-hidden className="size-5 text-accent" /><a href={`tel:${s.phone.replace(/\s/g, "")}`} className="hover:underline">{s.phone}</a></li> : null}
              {s.email ? <li className="flex items-center gap-3"><Mail aria-hidden className="size-5 text-accent" /><a href={`mailto:${s.email}`} className="hover:underline">{s.email}</a></li> : null}
            </ul>
          </div>
        </section>
      ) : null}
    </>
  );
}
