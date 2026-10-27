import type { Metadata } from "next";
import { CalendarDays, Church, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClass } from "@/components/ui/button";
import { Badge, EmptyState, PageHeader, StatCard } from "@/components/ui/layout";
import { can } from "@/lib/authz";
import { requirePageActor } from "@/lib/session";
import type { ChapelStatus } from "@/generated/prisma/client";
import { CHAPEL_STATUS_LABEL, listChapels } from "@/modules/chapels/service";

export const metadata: Metadata = { title: "Capillas" };

const TONE = { ACTIVE: "success", INACTIVE: "warning", ARCHIVED: "neutral" } as const;

export default async function ChapelsPage({ searchParams }: PageProps<"/admin/capillas">) {
  const actor = await requirePageActor();
  if (!can(actor, "chapels:read")) notFound();
  const sp = await searchParams;
  const status = (["ACTIVE", "INACTIVE", "ARCHIVED"].includes(String(sp.estado)) ? sp.estado : "") as ChapelStatus | "";
  const { chapels, counts } = await listChapels(actor, status);
  const tabs = [
    { value: "", label: "Vigentes", count: counts.ACTIVE + counts.INACTIVE },
    { value: "ACTIVE", label: "Activas", count: counts.ACTIVE },
    { value: "INACTIVE", label: "Inactivas", count: counts.INACTIVE },
    { value: "ARCHIVED", label: "Archivadas", count: counts.ARCHIVED },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Capillas"
        description="Sedes filiales de la iglesia: cada una con su encargado, personas, eventos, ingresos e historial. Nunca se borran: se desactivan o se archivan."
        actions={can(actor, "chapels:manage") ? <Link href="/admin/capillas/nueva" className={buttonClass()}>Nueva capilla</Link> : null}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Capillas activas" value={counts.ACTIVE} detail="Operando actualmente" icon={<Church className="size-4" />} />
        <StatCard label="Inactivas" value={counts.INACTIVE} detail="Pausadas temporalmente" />
        <StatCard label="Archivadas" value={counts.ARCHIVED} detail="Cerradas; historial conservado" />
        <StatCard label="Personas en capillas" value={chapels.reduce((t, c) => t + c._count.members, 0)} detail="Miembros activos en las capillas listadas" icon={<Users className="size-4" />} />
      </div>

      <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t.value}
            href={t.value ? `/admin/capillas?estado=${t.value}` : "/admin/capillas"}
            aria-current={status === t.value ? "page" : undefined}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${status === t.value ? "bg-primary text-primary-foreground shadow-sm" : "border border-border bg-surface hover:-translate-y-0.5 hover:bg-surface-2"}`}
          >
            {t.label}
            <span className={`rounded-full px-2 text-xs tabular-nums ${status === t.value ? "bg-white/20" : "bg-surface-2 text-muted"}`}>{t.count}</span>
          </Link>
        ))}
      </nav>

      {chapels.length === 0 ? (
        <EmptyState
          title={status === "ARCHIVED" ? "No hay capillas archivadas" : "Aún no hay capillas"}
          description="Registra las sedes filiales para llevar sus personas, eventos e ingresos por separado."
          action={can(actor, "chapels:manage") && !status ? <Link href="/admin/capillas/nueva" className={buttonClass("secondary")}>Registrar la primera</Link> : undefined}
        />
      ) : (
        <ul className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {chapels.map((c) => (
            <li key={c.id}>
              <Link href={`/admin/capillas/${c.id}`} className="lift group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
                <div className="relative bg-gradient-to-br from-brand to-brand-deep p-5 text-white">
                  <div aria-hidden className="absolute -right-8 -top-8 size-32 rounded-full bg-accent/25 blur-2xl transition duration-500 group-hover:scale-125" />
                  <div className="relative flex items-start justify-between gap-2">
                    <span className="rounded-md bg-white/15 px-2 py-0.5 font-mono text-xs tracking-wider">{c.code}</span>
                    <Badge tone={TONE[c.status]}>{CHAPEL_STATUS_LABEL[c.status]}</Badge>
                  </div>
                  <h2 className="relative mt-3 font-display text-2xl font-semibold">{c.name}</h2>
                  {c.managerMember ? <p className="relative mt-1 text-sm text-white/80">Encargado: {c.managerMember.firstName} {c.managerMember.lastName}</p> : <p className="relative mt-1 text-sm text-white/60">Sin encargado asignado</p>}
                </div>
                <div className="flex flex-1 flex-col gap-3 p-5">
                  {c.address ? <p className="flex items-start gap-2 text-sm text-muted"><MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />{c.address}</p> : null}
                  <div className="mt-auto grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-surface-2 p-2"><p className="font-display text-xl font-semibold">{c._count.members}</p><p className="text-[11px] text-muted">Miembros</p></div>
                    <div className="rounded-xl bg-surface-2 p-2"><p className="font-display text-xl font-semibold">{c._count.ministries}</p><p className="text-[11px] text-muted">Ministerios</p></div>
                    <div className="rounded-xl bg-surface-2 p-2"><p className="flex items-center justify-center gap-1 font-display text-xl font-semibold"><CalendarDays aria-hidden className="size-4 text-accent" />{c.upcomingEvents}</p><p className="text-[11px] text-muted">Próximos</p></div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
