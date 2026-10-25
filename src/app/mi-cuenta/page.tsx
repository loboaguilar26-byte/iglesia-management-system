import { CalendarDays, ClipboardCheck, HandHeart, HeartHandshake, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Alert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { Badge, Card, EmptyState, StatCard } from "@/components/ui/layout";
import { can } from "@/lib/authz";
import { formatDate, formatDateOnly, formatLongDate, formatTime } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { formatMoney } from "@/lib/money";
import { requirePortalActor } from "@/lib/session";
import { getMyPortal } from "@/modules/portal/service";
import { getChurchTimezone, getSettingsInternal } from "@/modules/settings/service";
import { updateMyContactAction } from "./actions";

export default async function PortalPage() {
  const actor = await requirePortalActor();
  if (!can(actor, "portal:access")) {
    return (
      <EmptyState
        title="Tu cuenta no tiene acceso al portal del miembro"
        description="Si formas parte del personal, entra al panel administrativo."
        action={<Link href="/admin" className="text-primary hover:underline">Ir al panel</Link>}
      />
    );
  }
  const [tz, settings] = await Promise.all([getChurchTimezone(), getSettingsInternal()]);
  let data: Awaited<ReturnType<typeof getMyPortal>>;
  try {
    data = await getMyPortal(actor);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") return <Alert tone="info">{e.message}</Alert>;
    throw e;
  }
  const { member: m, attendance, upcoming, announcements, giving } = data;
  const initials = `${m.firstName.charAt(0)}${m.lastName.charAt(0)}`.toUpperCase();

  return (
    <div className="flex flex-col gap-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-brand-deep p-6 text-white shadow-lg sm:p-8">
        <div aria-hidden className="absolute -right-20 -top-20 size-72 rounded-full bg-accent/25 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-5">
          <span aria-hidden className="flex size-16 items-center justify-center rounded-2xl bg-white/15 font-display text-2xl font-semibold ring-1 ring-white/25">{initials}</span>
          <div>
            <p className="text-sm opacity-80">{formatLongDate(new Date(), tz)}</p>
            <h1 className="font-display text-3xl font-semibold sm:text-4xl">Hola, {m.firstName}</h1>
            <p className="opacity-85">
              {m.joinDate ? `Parte de ${settings.name} desde ${formatDateOnly(m.joinDate)}` : settings.name}
              {m.position ? ` · ${m.position}` : ""}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))]">
        <StatCard
          label="Mi asistencia"
          value={attendance.rate90 === null ? "—" : `${attendance.rate90}%`}
          detail={attendance.recorded90 ? `${attendance.present90} de ${attendance.recorded90} reuniones registradas (últimos 90 días)` : "Aún no hay asistencia registrada"}
          icon={<ClipboardCheck className="size-4" />}
        />
        <StatCard label="Mis ministerios" value={m.ministryMemberships.length} detail="Participaciones vigentes" icon={<HandHeart className="size-4" />} />
        <StatCard label="Próximos eventos" value={upcoming.length} detail="Públicos y de mis ministerios" icon={<CalendarDays className="size-4" />} />
        <StatCard
          label={`Mis aportaciones ${giving.year}`}
          value={formatMoney(giving.yearTotal, settings.currency)}
          detail={`${giving.yearCount} registradas a mi nombre (no incluye anónimas)`}
          icon={<HeartHandshake className="size-4" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card title="Próximos eventos">
          {upcoming.length === 0 ? (
            <EmptyState title="No hay eventos próximos" />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {upcoming.map((e) => (
                <li key={e.id} className="flex items-center gap-4 py-3">
                  <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-brand py-1.5 text-white">
                    <span className="text-[10px] font-semibold uppercase">{new Intl.DateTimeFormat("es-MX", { timeZone: tz, month: "short" }).format(e.startsAt)}</span>
                    <span className="font-display text-xl font-semibold leading-none">{new Intl.DateTimeFormat("es-MX", { timeZone: tz, day: "numeric" }).format(e.startsAt)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{e.title}</p>
                    <p className="truncate text-sm text-muted">
                      {formatTime(e.startsAt, tz)} h{e.location ? ` · ${e.location}` : ""}{e.ministry ? ` · ${e.ministry.name}` : ""}
                    </p>
                  </div>
                  <Badge tone="accent">{e.type.name}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Mis ministerios">
          {m.ministryMemberships.length === 0 ? (
            <EmptyState title="Aún no participas en un ministerio" description="Acércate a la secretaría o a un coordinador para servir en algún ministerio." />
          ) : (
            <ul className="flex flex-col gap-3">
              {m.ministryMemberships.map((mm) => (
                <li key={mm.ministry.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{mm.ministry.name}</p>
                    <Badge tone={mm.role === "COORDINATOR" ? "accent" : "info"}>{mm.role === "COORDINATOR" ? "Coordinas" : "Integrante"}</Badge>
                  </div>
                  {mm.ministry.description ? <p className="mt-1 line-clamp-2 text-sm text-muted">{mm.ministry.description}</p> : null}
                  <p className="mt-2 text-xs text-muted">Desde {formatDateOnly(mm.startDate)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Mi asistencia reciente">
          {attendance.recent.length === 0 ? (
            <EmptyState title="Sin registros todavía" />
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {attendance.recent.map((r) => (
                <li key={r.event.id} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate">{r.event.title} <span className="text-muted">· {formatDate(r.event.startsAt, tz)}</span></span>
                  {r.status === "PRESENT" ? <Badge tone="success">Presente</Badge> : <Badge tone="neutral">Ausente</Badge>}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Mis aportaciones" description="Solo las registradas a tu nombre. Las aportaciones anónimas no se asocian a nadie.">
          {giving.recent.length === 0 ? (
            <EmptyState title="Sin aportaciones registradas a tu nombre" />
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {giving.recent.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2">
                  <span>{d.concept.name} <span className="text-muted">· {formatDateOnly(d.receivedAt)}</span></span>
                  <span className="font-medium tabular-nums">{formatMoney(d.amount, d.currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Comunicados">
          {announcements.length === 0 ? (
            <EmptyState title="No hay comunicados vigentes" />
          ) : (
            <ul className="flex flex-col gap-3">
              {announcements.map((a) => (
                <li key={a.id} className={`rounded-xl border p-4 ${a.isFeatured ? "border-accent bg-accent-soft/40" : "border-border"}`}>
                  <Link href={`/comunicados/${a.id}`} className="font-medium hover:underline">{a.title}</Link>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{a.body}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Mis datos de contacto" description="Mantén actualizados tus datos. Para cambiar tu nombre u otra información, contacta a la secretaría.">
          <ActionForm action={updateMyContactAction}>
            <Field label="Teléfono" name="phone" type="tel" defaultValue={m.phone ?? ""} />
            <Field label="Correo electrónico" name="email" type="email" defaultValue={m.email ?? ""} hint="Este correo es de contacto; no cambia el correo con el que inicias sesión." />
            <SubmitButton>Guardar</SubmitButton>
          </ActionForm>
          {settings.phone || settings.email || settings.address ? (
            <div className="mt-6 border-t border-border pt-4 text-sm text-muted">
              <p className="mb-2 font-medium text-foreground">Contacto de la iglesia</p>
              {settings.phone ? <p className="flex items-center gap-2"><Phone aria-hidden className="size-4" />{settings.phone}</p> : null}
              {settings.email ? <p className="flex items-center gap-2"><Mail aria-hidden className="size-4" />{settings.email}</p> : null}
              {settings.address ? <p className="flex items-center gap-2"><MapPin aria-hidden className="size-4" />{settings.address}</p> : null}
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
