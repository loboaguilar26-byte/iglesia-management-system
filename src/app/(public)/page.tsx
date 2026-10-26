import { ArrowRight, CalendarDays, Clock, HandHeart, Mail, MapPin, Phone, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { formatLongDate, formatTime } from "@/lib/dates";
import { getPublicAnnouncements, getPublicEvents, getPublicMinistries, getPublicSite } from "@/modules/public/service";
import { Empty, EventCard, ScheduleCards, Section } from "./components";
import { NextService } from "./next-service";

export default async function HomePage() {
  const [{ settings: s, schedules }, events, announcements, ministries] = await Promise.all([
    getPublicSite(),
    getPublicEvents(4),
    getPublicAnnouncements(3),
    getPublicMinistries(),
  ]);
  const tz = s.timezone;
  const featured = announcements.find((a) => a.isFeatured);
  const [nextEvent, ...moreEvents] = events.filter((e) => e.status !== "CANCELLED");
  const steps = (s.firstVisitText ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  // Datos públicos reales (sin información personal).
  const facts = [
    { icon: Clock, value: schedules.length, label: schedules.length === 1 ? "reunión semanal" : "reuniones semanales" },
    { icon: HandHeart, value: ministries.length, label: ministries.length === 1 ? "ministerio" : "ministerios" },
    { icon: CalendarDays, value: events.length, label: "próximos eventos" },
  ].filter((f) => f.value > 0);

  return (
    <>
      {/* Portada */}
      <section className="relative overflow-hidden bg-brand-deep text-white">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_85%_10%,rgba(226,182,94,0.40),transparent_60%),radial-gradient(ellipse_60%_55%_at_0%_100%,rgba(143,179,224,0.22),transparent_60%)]" />
        <svg aria-hidden className="absolute -right-24 top-1/2 h-[140%] -translate-y-1/2 opacity-[0.10]" viewBox="0 0 400 400" fill="none">
          {[60, 100, 140, 180].map((r) => <circle key={r} cx="200" cy="200" r={r} stroke="white" strokeWidth="1" />)}
          <path d="M200 20v360M20 200h360" stroke="white" strokeWidth="0.6" strokeDasharray="2 6" />
        </svg>
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-20 sm:px-6 sm:pt-28 lg:grid-cols-[1.35fr_1fr] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-accent ring-1 ring-white/15">
              <Sparkles aria-hidden className="size-3.5" /> Bienvenidos
            </p>
            <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.03] tracking-tight sm:text-6xl lg:text-7xl">{s.name}</h1>
            {s.tagline ? <p className="mt-5 max-w-xl text-xl leading-relaxed text-white/85">{s.tagline}</p> : null}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={steps.length ? "#primera-visita" : "/horarios"} className={buttonClass("accent", "", "lg")}>Planea tu visita</Link>
              <Link href="/eventos" className={buttonClass("ghost", "border border-white/30 text-white hover:bg-white/10", "lg")}>Ver eventos</Link>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <NextService schedules={schedules} tz={tz} />
            {s.address ? (
              <a href={s.mapUrl ?? "/contacto"} {...(s.mapUrl ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="flex items-start gap-3 rounded-2xl border border-white/15 bg-white/5 p-4 text-sm text-white/85 transition hover:bg-white/10">
                <MapPin aria-hidden className="mt-0.5 size-5 shrink-0 text-accent" />
                <span>{s.address}<span className="mt-1 block text-xs text-accent">Cómo llegar →</span></span>
              </a>
            ) : null}
          </div>
        </div>
        {facts.length ? (
          <div className="relative border-t border-white/10 bg-white/[0.03]">
            <dl className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-white/10 px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6">
              {facts.map((f) => (
                <div key={f.label} className="flex items-center gap-4 py-5 sm:px-6 sm:first:pl-0">
                  <f.icon aria-hidden className="size-6 text-accent" />
                  <div>
                    <dt className="sr-only">{f.label}</dt>
                    <dd className="font-display text-3xl font-semibold leading-none">{f.value}</dd>
                    <dd className="mt-1 text-sm text-white/70">{f.label}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </section>

      {featured ? (
        <div className="border-b border-accent/30 bg-accent-soft">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">Aviso</span>
            <Link href={`/comunicados/${featured.id}`} className="font-medium hover:underline">{featured.title}</Link>
            <ArrowRight aria-hidden className="size-4 text-accent" />
          </div>
        </div>
      ) : null}

      {s.welcomeText ? (
        <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <span aria-hidden className="mx-auto block h-px w-16 bg-accent" />
          <p className="mt-8 font-display text-2xl leading-relaxed sm:text-[2rem] sm:leading-snug">{s.welcomeText}</p>
          <Link href="/nosotros" className="mt-8 inline-flex items-center gap-2 font-medium text-primary hover:underline">Conoce nuestra historia <ArrowRight aria-hidden className="size-4" /></Link>
        </section>
      ) : null}

      <Section eyebrow="Te esperamos" title="Nuestras reuniones" intro={s.scheduleText ?? undefined} tone="tinted">
        {schedules.length ? <ScheduleCards schedules={schedules} /> : <Empty>Pronto publicaremos nuestros horarios.</Empty>}
      </Section>

      {steps.length ? (
        <section id="primera-visita" className="scroll-mt-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">¿Es tu primera vez?</p>
              <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight">Tu primera visita</h2>
              <p className="mt-4 text-lg text-muted">Queremos que te sientas en casa desde el primer momento. Esto es lo que puedes esperar.</p>
              <Link href="/contacto" className={buttonClass("primary", "mt-8", "lg")}>Tengo una pregunta</Link>
            </div>
            <ol className="flex flex-col gap-4">
              {steps.map((step, i) => (
                <li key={i} className="flex gap-5 rounded-2xl border border-border bg-surface p-5 shadow-sm">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand font-display text-lg font-semibold text-white">{i + 1}</span>
                  <p className="pt-1.5 text-lg leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      <Section eyebrow="Agenda" title="Próximos eventos" tone={steps.length ? "tinted" : "plain"}>
        {nextEvent ? (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <Link href={`/eventos/${nextEvent.id}`} className="group relative flex flex-col justify-end overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-brand-deep p-8 text-white shadow-lg">
              <div aria-hidden className="absolute -right-10 -top-10 size-56 rounded-full bg-accent/25 blur-2xl transition group-hover:bg-accent/35" />
              <p className="relative text-xs font-semibold uppercase tracking-[0.2em] text-accent">Próximo · {nextEvent.type.name}</p>
              <h3 className="relative mt-3 font-display text-3xl font-semibold sm:text-4xl">{nextEvent.title}</h3>
              <p className="relative mt-4 flex flex-wrap gap-x-5 gap-y-1 text-white/85">
                <span className="inline-flex items-center gap-2"><CalendarDays aria-hidden className="size-4" />{formatLongDate(nextEvent.startsAt, tz)}</span>
                <span className="inline-flex items-center gap-2"><Clock aria-hidden className="size-4" />{formatTime(nextEvent.startsAt, tz)} h</span>
                {nextEvent.location ? <span className="inline-flex items-center gap-2"><MapPin aria-hidden className="size-4" />{nextEvent.location}</span> : null}
              </p>
              {nextEvent.description ? <p className="relative mt-4 line-clamp-2 max-w-lg text-white/75">{nextEvent.description}</p> : null}
              <span className="relative mt-6 inline-flex items-center gap-2 font-medium text-accent">Ver detalles <ArrowRight aria-hidden className="size-4 transition group-hover:translate-x-1" /></span>
            </Link>
            <div className="flex flex-col gap-4">
              {moreEvents.length ? moreEvents.map((e) => <EventCard key={e.id} e={e} tz={tz} />) : <Empty>Consulta el calendario completo para más actividades.</Empty>}
            </div>
          </div>
        ) : (
          <Empty>No hay eventos públicos programados por ahora.</Empty>
        )}
        <Link href="/eventos" className="mt-8 inline-flex items-center gap-2 font-medium text-primary hover:underline">Ver calendario completo <ArrowRight aria-hidden className="size-4" /></Link>
      </Section>

      {ministries.length ? (
        <Section eyebrow="Comunidad" title="Ministerios" intro="Espacios para servir, crecer y convivir. Hay un lugar para ti.">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ministries.slice(0, 6).map((m) => (
              <li key={m.id} className="rounded-2xl border border-border bg-surface p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <span className="inline-flex rounded-xl bg-accent-soft p-3 text-accent"><Users aria-hidden className="size-5" /></span>
                <h3 className="mt-4 font-display text-xl font-semibold">{m.name}</h3>
                {m.description ? <p className="mt-2 line-clamp-3 text-muted">{m.description}</p> : null}
              </li>
            ))}
          </ul>
          <Link href="/ministerios" className="mt-8 inline-flex items-center gap-2 font-medium text-primary hover:underline">Todos los ministerios <ArrowRight aria-hidden className="size-4" /></Link>
        </Section>
      ) : null}

      {s.mission || s.vision ? (
        <section className="bg-surface">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:px-6 md:grid-cols-2">
            {s.mission ? (
              <div className="rounded-3xl bg-brand p-8 text-white sm:p-10">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Misión</p>
                <p className="mt-4 font-display text-2xl leading-snug">{s.mission}</p>
              </div>
            ) : null}
            {s.vision ? (
              <div className="rounded-3xl border border-border bg-background p-8 sm:p-10">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Visión</p>
                <p className="mt-4 font-display text-2xl leading-snug">{s.vision}</p>
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
                  {a.publishedAt ? <p className="text-xs text-muted">{formatLongDate(a.publishedAt, tz)}</p> : null}
                  <h3 className="mt-2 font-display text-xl font-semibold">{a.title}</h3>
                  <p className="mt-2 line-clamp-3 text-muted">{a.body}</p>
                  <span className="mt-auto pt-4 text-sm font-medium text-primary">Leer más →</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <section className="relative overflow-hidden bg-brand text-white">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(226,182,94,0.28),transparent_55%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <h2 className="font-display text-4xl font-semibold">Visítanos</h2>
            <p className="mt-3 max-w-md text-lg text-white/85">Será un gusto recibirte. Si tienes preguntas, contáctanos con confianza.</p>
            <p className="mt-6 text-sm text-white/70">¿Ya eres parte de la comunidad? <Link href="/login?next=/mi-cuenta" className="font-medium text-accent hover:underline">Entra a tu portal</Link></p>
          </div>
          <ul className="flex flex-col gap-4">
            {s.address ? <li className="flex items-start gap-3"><MapPin aria-hidden className="mt-0.5 size-5 text-accent" />{s.mapUrl ? <a href={s.mapUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{s.address}</a> : s.address}</li> : null}
            {s.phone ? <li className="flex items-center gap-3"><Phone aria-hidden className="size-5 text-accent" /><a href={`tel:${s.phone.replace(/\s/g, "")}`} className="hover:underline">{s.phone}</a></li> : null}
            {s.email ? <li className="flex items-center gap-3"><Mail aria-hidden className="size-5 text-accent" /><a href={`mailto:${s.email}`} className="hover:underline">{s.email}</a></li> : null}
            {!s.address && !s.phone && !s.email ? <li><Link href="/contacto" className="text-accent hover:underline">Ver datos de contacto</Link></li> : null}
          </ul>
        </div>
      </section>
    </>
  );
}
