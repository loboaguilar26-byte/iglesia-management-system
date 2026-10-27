import { CalendarDays, Clock, MapPin } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { WEEKDAYS, formatLongDate, formatTime } from "@/lib/dates";

export function Section({ id, eyebrow, title, intro, children, tone = "plain" }: {
  id?: string;
  eyebrow?: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
  tone?: "plain" | "tinted";
}) {
  return (
    <section id={id} className={tone === "tinted" ? "bg-surface" : ""}>
      <div className="reveal mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-10 max-w-2xl">
          {eyebrow ? <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{eyebrow}</p> : null}
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
          {intro ? <div className="mt-3 text-lg text-muted">{intro}</div> : null}
        </div>
        {children}
      </div>
    </section>
  );
}

export function PageHero({ title, intro }: { title: string; intro?: ReactNode }) {
  return (
    <div className="relative overflow-hidden bg-brand-deep text-white">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(226,182,94,0.35),transparent_55%)]" />
      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
        {intro ? <p className="mt-3 max-w-2xl text-lg opacity-90">{intro}</p> : null}
      </div>
    </div>
  );
}

export type PublicSchedule = { id: string; name: string; dayOfWeek: number; startTime: string; endTime: string | null; location: string | null; description: string | null };

export function ScheduleCards({ schedules }: { schedules: PublicSchedule[] }) {
  return (
    <ul className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {schedules.map((s) => (
        <li key={s.id} className="group rounded-2xl border border-border bg-surface p-6 shadow-sm lift">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">{WEEKDAYS[s.dayOfWeek]}</p>
          <p className="mt-1 font-display text-2xl font-semibold">{s.name}</p>
          <p className="mt-3 flex items-center gap-2 text-muted"><Clock aria-hidden className="size-4" />{s.startTime}{s.endTime ? ` – ${s.endTime}` : ""} h</p>
          {s.location ? <p className="mt-1 flex items-center gap-2 text-muted"><MapPin aria-hidden className="size-4" />{s.location}</p> : null}
          {s.description ? <p className="mt-3 text-sm">{s.description}</p> : null}
        </li>
      ))}
    </ul>
  );
}

export type PublicEvent = { id: string; title: string; startsAt: Date; endsAt: Date; location: string | null; description: string | null; status: string; type: { name: string } };

export function EventCard({ e, tz }: { e: PublicEvent; tz: string }) {
  const cancelled = e.status === "CANCELLED";
  const month = new Intl.DateTimeFormat("es-MX", { timeZone: tz, month: "short" }).format(e.startsAt);
  const day = new Intl.DateTimeFormat("es-MX", { timeZone: tz, day: "numeric" }).format(e.startsAt);
  return (
    <Link href={`/eventos/${e.id}`} className="group flex gap-5 rounded-2xl border border-border bg-surface p-5 shadow-sm lift">
      <div className={`flex w-16 shrink-0 flex-col items-center justify-center rounded-xl py-2 ${cancelled ? "bg-danger/10 text-danger" : "bg-brand text-white"}`}>
        <span className="text-xs font-semibold uppercase">{month}</span>
        <span className="font-display text-3xl font-semibold leading-none">{day}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">{e.type.name}{cancelled ? " · Cancelado" : ""}</p>
        <h3 className={`mt-1 font-display text-xl font-semibold group-hover:text-primary ${cancelled ? "line-through opacity-70" : ""}`}>{e.title}</h3>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-muted">
          <span className="inline-flex items-center gap-1"><CalendarDays aria-hidden className="size-3.5" />{formatLongDate(e.startsAt, tz)}</span>
          <span className="inline-flex items-center gap-1"><Clock aria-hidden className="size-3.5" />{formatTime(e.startsAt, tz)} h</span>
          {e.location ? <span className="inline-flex items-center gap-1"><MapPin aria-hidden className="size-3.5" />{e.location}</span> : null}
        </p>
      </div>
    </Link>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center text-muted">{children}</p>;
}
