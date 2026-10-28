import type { Metadata } from "next";
import { Suspense, type CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, HandHeart, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { ChurchMonogram } from "@/components/visuals";
import { getPublicChapel, getPublicSite } from "@/modules/public/service";
import { Empty, EventCard, Section } from "../../components";

export async function generateMetadata({ params }: PageProps<"/capillas/[codigo]">): Promise<Metadata> {
  const data = await getPublicChapel((await params).codigo);
  return data ? { title: data.chapel.name, description: data.chapel.tagline ?? undefined } : { title: "Capilla" };
}

/**
 * Página de una capilla: misma estructura para todas (como una franquicia) pero con sus propios
 * colores, portada y textos. Los colores reemplazan los de la marca solo dentro de esta página.
 */
export default function PublicChapelPage({ params }: PageProps<"/capillas/[codigo]">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse bg-brand-deep" />}>
      <ChapelContent params={params} />
    </Suspense>
  );
}

async function ChapelContent({ params }: { params: PageProps<"/capillas/[codigo]">["params"] }) {
  const [data, site] = await Promise.all([getPublicChapel((await params).codigo), getPublicSite()]);
  if (!data) notFound();
  const { chapel: c, events, ministries } = data;
  const tz = site.settings?.timezone ?? "America/Mexico_City";
  const slug = c.code.toLowerCase();
  const theme = {
    "--primary": c.primaryColor,
    "--brand": c.primaryColor,
    "--brand-deep": `color-mix(in oklab, ${c.primaryColor} 62%, black)`,
    "--accent": c.accentColor,
    "--accent-soft": `color-mix(in oklab, ${c.accentColor} 16%, var(--surface))`,
  } as CSSProperties;
  const schedule = (c.scheduleText ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  const whatsapp = c.whatsapp?.replace(/[^\d+]/g, "");

  return (
    <div style={theme}>
      <section className="relative overflow-hidden bg-brand-deep text-white">
        {c.coverPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/media/capilla/${slug}?v=${encodeURIComponent(c.coverPath)}`} alt="" className="absolute inset-0 size-full object-cover opacity-40" />
        ) : null}
        <div aria-hidden className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 80% 0%, ${c.accentColor}66, transparent 60%), linear-gradient(to top, rgb(0 0 0 / 55%), transparent 70%)` }} />
        <div className="page-enter relative mx-auto flex max-w-6xl flex-col gap-6 px-4 py-16 sm:px-6 sm:py-24">
          <Link href="/capillas" className="w-fit text-sm text-white/80 hover:text-white">← Todas las capillas</Link>
          <div className="flex flex-wrap items-center gap-5">
            <ChurchMonogram name={c.name} primary={c.primaryColor} accent={c.accentColor} size="lg" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: c.accentColor }}>Capilla de {site.settings?.name ?? "la iglesia"}</p>
              <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-6xl">{c.name}</h1>
              {c.tagline ? <p className="mt-2 max-w-2xl text-lg text-white/85">{c.tagline}</p> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {c.mapUrl ? (
              <a href={c.mapUrl} target="_blank" rel="noopener noreferrer" className="btn-shine inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white shadow-lg" style={{ background: c.accentColor }}>
                <MapPin aria-hidden className="size-4" /> Cómo llegar
              </a>
            ) : null}
            <Link href="/confesiones" className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-5 py-3 font-semibold text-white hover:bg-white/10">Solicitar confesión</Link>
          </div>
        </div>
      </section>

      <Section title="Bienvenidos" eyebrow="Nuestra comunidad">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="whitespace-pre-line text-lg leading-8 text-muted">
            {c.aboutText ?? `Te esperamos en ${c.name}. Acércate a conocer a nuestra comunidad.`}
          </div>
          <aside className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-6 shadow-sm">
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold"><Clock aria-hidden className="size-5 text-accent" /> Horarios</h2>
            {schedule.length ? (
              <ul className="flex flex-col gap-2">
                {schedule.map((line) => (
                  <li key={line} className="rounded-xl bg-accent-soft px-3 py-2 text-sm font-medium">{line}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Pronto publicaremos los horarios de esta capilla.</p>
            )}
            <div className="mt-2 flex flex-col gap-2 border-t border-border pt-4 text-sm">
              {c.address ? <p className="flex items-start gap-2"><MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />{c.address}</p> : null}
              {c.phone ? <a href={`tel:${c.phone.replace(/\s+/g, "")}`} className="flex items-center gap-2 hover:text-primary"><Phone aria-hidden className="size-4 text-accent" />{c.phone}</a> : null}
              {whatsapp ? <a href={`https://wa.me/${whatsapp.replace(/^\+/, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary"><MessageCircle aria-hidden className="size-4 text-accent" />WhatsApp</a> : null}
              {c.email ? <a href={`mailto:${c.email}`} className="flex items-center gap-2 hover:text-primary"><Mail aria-hidden className="size-4 text-accent" />{c.email}</a> : null}
            </div>
          </aside>
        </div>
      </Section>

      <Section title="Próximos eventos" eyebrow="Agenda de la capilla" tone="tinted">
        {events.length ? (
          <div className="stagger grid gap-4 md:grid-cols-2">{events.map((e) => <EventCard key={e.id} e={e} tz={tz} />)}</div>
        ) : (
          <Empty>No hay eventos públicos programados en esta capilla por ahora.</Empty>
        )}
      </Section>

      {ministries.length ? (
        <Section title="Ministerios" eyebrow="Sirve con nosotros">
          <ul className="stagger grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ministries.map((m) => (
              <li key={m.id} className="lift rounded-2xl border border-border bg-surface p-6 shadow-sm">
                <span className="inline-flex rounded-xl bg-accent-soft p-3 text-accent"><HandHeart aria-hidden className="size-5" /></span>
                <h3 className="mt-4 font-display text-xl font-semibold">{m.name}</h3>
                {m.description ? <p className="mt-2 text-sm text-muted">{m.description}</p> : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}
