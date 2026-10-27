import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Compass,
  GitBranch,
  Info,
  LayoutGrid,
  Network,
  Plus,
  Sparkles,
  Target,
  UsersRound,
} from "lucide-react";
import { BarChart } from "@/components/bar-chart";
import { CountUp } from "@/components/count-up";
import { Badge, Card, EmptyState, StatCard } from "@/components/ui/layout";
import { can } from "@/lib/authz";
import { formatDate } from "@/lib/dates";
import { requirePageActor } from "@/lib/session";
import { getNetworkOverview, type NetworkInsight } from "@/modules/churches/service";
import { ChurchMonogram, ProgressBar, ProgressRing } from "@/components/visuals";
import { CreateChurchForm } from "./create-church-form";

export const metadata: Metadata = { title: "Iglesias y franquicias" };

type Overview = Awaited<ReturnType<typeof getNetworkOverview>>;
type Sede = Overview["churches"][number];

const INSIGHT_STYLE: Record<NetworkInsight["tone"], { icon: typeof Info; className: string; label: string }> = {
  danger: { icon: AlertTriangle, className: "border-danger/30 bg-danger/5 text-danger", label: "Prioridad alta" },
  warning: { icon: AlertTriangle, className: "border-warning/30 bg-warning/5 text-warning", label: "Atender pronto" },
  info: { icon: Info, className: "border-primary/25 bg-primary/5 text-primary", label: "Mejora sugerida" },
};

export default async function ChurchesPage({ searchParams }: PageProps<"/admin/iglesias">) {
  const actor = await requirePageActor();
  if (!can(actor, "churches:read")) notFound();
  const sp = await searchParams;
  const o = await getNetworkOverview(actor);
  const canCreate = can(actor, "churches:create");

  const tabs = [
    { key: "panorama", label: "Panorama", icon: Compass, show: true },
    { key: "red", label: "Red de franquicias", icon: Network, show: true },
    { key: "sedes", label: "Comparativa de sedes", icon: LayoutGrid, show: true },
    { key: "nueva", label: "Nueva iglesia", icon: Plus, show: canCreate },
  ].filter((t) => t.show);
  const tab = tabs.some((t) => t.key === sp.tab) ? String(sp.tab) : "panorama";

  return (
    <div className="flex flex-col gap-6">
      <section className="aurora relative overflow-hidden rounded-3xl p-6 text-white shadow-lg sm:p-8">
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/80 backdrop-blur">
              <GitBranch aria-hidden className="size-3.5" /> Estructura de franquicia
            </p>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Iglesias y franquicias</h1>
            <p className="mt-2 text-white/75">
              Visión estratégica de toda la red: qué sedes están listas para operar, dónde falta equipo y cómo crece la obra.
            </p>
            {canCreate ? (
              <Link
                href="/admin/iglesias?tab=nueva"
                className="btn-shine lift mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[var(--brand-deep)] shadow-md"
              >
                <Plus aria-hidden className="size-4" /> Agregar iglesia
              </Link>
            ) : null}
          </div>
          <div className="flex items-center gap-4 rounded-2xl bg-white/10 p-4 backdrop-blur">
            <ProgressRing percent={o.totals.avgReadiness} size={104} label="Preparación promedio de la red">
              <span className="font-display text-2xl font-semibold tabular-nums text-white">{o.totals.avgReadiness}%</span>
            </ProgressRing>
            <div className="text-sm">
              <p className="font-semibold">Salud de la red</p>
              <p className="text-white/70">Preparación promedio</p>
              <p className="mt-1 text-white/70">
                <span className="font-semibold text-white"><CountUp value={o.totals.ready} /></span> de {o.totals.active} sedes listas
              </p>
            </div>
          </div>
        </div>
      </section>

      <nav aria-label="Apartados del módulo" className="flex gap-1 overflow-x-auto rounded-2xl border border-border bg-surface p-1 shadow-sm [scrollbar-width:none]">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/admin/iglesias?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition ${tab === t.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted hover:bg-surface-2 hover:text-foreground"}`}
          >
            <t.icon aria-hidden className="size-4" /> {t.label}
          </Link>
        ))}
      </nav>

      <div key={tab} className="page-enter flex flex-col gap-6">
        {tab === "panorama" ? <Panorama o={o} canCreate={canCreate} /> : null}
        {tab === "red" ? <NetworkTab o={o} canCreate={canCreate} /> : null}
        {tab === "sedes" ? <CompareTab churches={o.churches} /> : null}
        {tab === "nueva" && canCreate ? <NewTab franchises={o.franchises} /> : null}
      </div>
    </div>
  );
}

function Panorama({ o, canCreate }: { o: Overview; canCreate: boolean }) {
  const top = [...o.churches].filter((c) => c.isActive).sort((a, b) => b.readiness.percent - a.readiness.percent).slice(0, 5);
  return (
    <>
      <div className="stagger grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Franquicias activas" value={o.totals.franchises} detail="Redes que agrupan sedes" icon={<GitBranch className="size-4" />} />
        <StatCard label="Iglesias activas" value={o.totals.active} detail={`${o.totals.inactive} inactivas · ${o.totals.churches} en total`} icon={<Building2 className="size-4" />} />
        <StatCard label="Personas en equipos" value={o.totals.team} detail="Usuarios vinculados a una sede" icon={<UsersRound className="size-4" />} />
        <StatCard label="Sedes listas" value={o.totals.ready} detail="Con 80 % o más de preparación" icon={<Target className="size-4" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card title="Acciones recomendadas" description="Lo más importante para que cada sede funcione, ordenado por prioridad.">
          {o.insights.length === 0 ? (
            o.churches.length === 0 ? (
              <EmptyState
                title="Comienza tu red"
                description="Registra la primera iglesia para empezar a medir su preparación."
                action={canCreate ? <Link href="/admin/iglesias?tab=nueva" className="text-sm font-medium text-primary hover:underline">Agregar iglesia →</Link> : undefined}
              />
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/5 p-4 text-success">
                <CheckCircle2 aria-hidden className="size-5 shrink-0" />
                <p className="text-sm font-medium">Todo en orden: cada sede activa tiene equipo, contacto y buena preparación.</p>
              </div>
            )
          ) : (
            <ul className="stagger flex flex-col gap-2.5">
              {o.insights.slice(0, 6).map((i, idx) => {
                const style = INSIGHT_STYLE[i.tone];
                const Icon = style.icon;
                const body = (
                  <>
                    <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] font-semibold uppercase tracking-wider opacity-80">{style.label}</span>
                      <span className="block font-medium text-foreground">{i.title}</span>
                      <span className="block text-sm text-muted">{i.detail}</span>
                    </span>
                    {i.churchId ? <ArrowRight aria-hidden className="mt-1 size-4 shrink-0 transition group-hover:translate-x-1" /> : null}
                  </>
                );
                return (
                  <li key={idx}>
                    {i.churchId ? (
                      <Link href={`/admin/iglesias/${i.churchId}`} className={`group lift flex items-start gap-3 rounded-xl border p-3.5 ${style.className}`}>{body}</Link>
                    ) : (
                      <div className={`flex items-start gap-3 rounded-xl border p-3.5 ${style.className}`}>{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Sedes mejor preparadas" description="Avance de configuración de cada iglesia activa.">
          {top.length === 0 ? (
            <EmptyState title="Sin sedes activas" description="Cuando registres iglesias verás aquí su avance." />
          ) : (
            <ul className="stagger flex flex-col gap-4">
              {top.map((c) => (
                <li key={c.id}>
                  <Link href={`/admin/iglesias/${c.id}`} className="group flex items-center gap-3">
                    <ChurchMonogram name={c.name} primary={c.profile?.primaryColor ?? "#6b3f24"} accent={c.profile?.accentColor ?? "#b9802f"} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate font-medium group-hover:text-primary">{c.name}</span>
                        <span className="tabular-nums text-muted">{c.readiness.percent}%</span>
                      </span>
                      <ProgressBar percent={c.readiness.percent} className="mt-1.5" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Crecimiento de la red" description="Iglesias dadas de alta por mes en los últimos 12 meses.">
        <BarChart label="Iglesias nuevas por mes" color="var(--accent)" data={o.growth} />
      </Card>
    </>
  );
}

function NetworkTab({ o, canCreate }: { o: Overview; canCreate: boolean }) {
  if (o.franchises.length === 0) {
    return (
      <EmptyState
        title="Aún no hay franquicias"
        description="Al registrar la primera iglesia podrás crear su franquicia."
        action={canCreate ? <Link href="/admin/iglesias?tab=nueva" className="text-sm font-medium text-primary hover:underline">Agregar iglesia →</Link> : undefined}
      />
    );
  }
  return (
    <div className="stagger flex flex-col gap-6">
      {o.franchises.map((f) => {
        const active = f.churches.filter((c) => c.isActive);
        const avg = active.length ? Math.round(active.reduce((s, c) => s + c.readiness.percent, 0) / active.length) : 0;
        return (
          <section key={f.id} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-surface-2/60 p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm"><Network aria-hidden className="size-5" /></span>
                <div>
                  <h2 className="font-display text-lg font-semibold">{f.name}</h2>
                  <p className="text-sm text-muted">
                    {f.churches.length} {f.churches.length === 1 ? "sede" : "sedes"} · {active.length} activas · desde {formatDate(f.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {f.isActive ? <Badge tone="success">Franquicia activa</Badge> : <Badge>Inactiva</Badge>}
                <ProgressRing percent={avg} size={56} label={`Preparación de ${f.name}`}>
                  <span className="text-xs font-semibold tabular-nums">{avg}%</span>
                </ProgressRing>
              </div>
            </header>
            {f.churches.length === 0 ? (
              <p className="p-5 text-sm text-muted">Esta franquicia todavía no tiene sedes.</p>
            ) : (
              <ul className="relative grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
                {f.churches.map((c) => (
                  <li key={c.id}>
                    <ChurchCard c={c} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function ChurchCard({ c }: { c: Sede }) {
  const primary = c.profile?.primaryColor ?? "#6b3f24";
  const accent = c.profile?.accentColor ?? "#b9802f";
  return (
    <Link href={`/admin/iglesias/${c.id}`} className={`lift group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-background ${c.isActive ? "" : "opacity-70"}`}>
      <span aria-hidden className="h-1.5" style={{ background: `linear-gradient(90deg, ${primary}, ${accent})` }} />
      <span className="flex flex-1 flex-col gap-3 p-4">
        <span className="flex items-start gap-3">
          <ChurchMonogram name={c.name} primary={primary} accent={accent} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold group-hover:text-primary">{c.name}</span>
            <span className="block truncate font-mono text-xs text-muted">{c.code ?? c.slug}</span>
          </span>
          {c.isActive ? <Badge tone="success">Activa</Badge> : <Badge>Inactiva</Badge>}
        </span>
        <span className="flex items-center justify-between text-xs text-muted">
          <span>Preparación</span>
          <span className="font-semibold tabular-nums text-foreground">{c.readiness.done}/{c.readiness.total}</span>
        </span>
        <ProgressBar percent={c.readiness.percent} />
        <span className="mt-auto flex flex-wrap gap-1.5 text-xs text-muted">
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5"><UsersRound aria-hidden className="size-3" /> {c.team} en equipo</span>
          <span className="rounded-full bg-surface-2 px-2 py-0.5">{c.profile?.currency ?? "MXN"}</span>
          <span className="rounded-full bg-surface-2 px-2 py-0.5">Alta {formatDate(c.createdAt)}</span>
        </span>
      </span>
    </Link>
  );
}

function CompareTab({ churches }: { churches: Sede[] }) {
  if (churches.length === 0) return <EmptyState title="Sin sedes para comparar" description="Registra iglesias para ver su comparativa." />;
  const groups = ["Contacto", "Comunicación", "Identidad", "Equipo"];
  const sorted = [...churches].sort((a, b) => Number(b.isActive) - Number(a.isActive) || b.readiness.percent - a.readiness.percent);
  return (
    <Card title="Comparativa de sedes" description="Qué tiene listo cada iglesia. Toca una sede para completar lo pendiente.">
      <div className="-mx-1 overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-y-1.5 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-muted">
              <th className="px-3 py-2 font-medium">Sede</th>
              {groups.map((g) => <th key={g} className="px-3 py-2 text-center font-medium">{g}</th>)}
              <th className="px-3 py-2 font-medium">Avance</th>
            </tr>
          </thead>
          <tbody className="stagger">
            {sorted.map((c) => (
              <tr key={c.id} className="bg-surface-2/50 transition hover:bg-accent-soft/60">
                <td className="rounded-l-xl px-3 py-2.5">
                  <Link href={`/admin/iglesias/${c.id}`} className="flex items-center gap-2.5 font-medium hover:text-primary">
                    <ChurchMonogram name={c.name} primary={c.profile?.primaryColor ?? "#6b3f24"} accent={c.profile?.accentColor ?? "#b9802f"} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate">{c.name}</span>
                      {c.isActive ? null : <span className="text-xs text-muted">Inactiva</span>}
                    </span>
                  </Link>
                </td>
                {groups.map((g) => {
                  const items = c.readiness.checks.filter((k) => k.group === g);
                  const done = items.filter((k) => k.done).length;
                  return (
                    <td key={g} className="px-3 py-2.5 text-center" title={items.map((k) => `${k.done ? "✓" : "✗"} ${k.label}`).join("\n")}>
                      <span className="inline-flex gap-1" aria-label={`${g}: ${done} de ${items.length}`}>
                        {items.map((k) => (
                          <span key={k.key} className={`size-2.5 rounded-full ${k.done ? "bg-success" : "bg-border"}`} />
                        ))}
                      </span>
                    </td>
                  );
                })}
                <td className="rounded-r-xl px-3 py-2.5">
                  <span className="flex items-center gap-2">
                    <ProgressBar percent={c.readiness.percent} className="w-24" />
                    <span className="tabular-nums text-muted">{c.readiness.percent}%</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function NewTab({ franchises }: { franchises: Overview["franchises"] }) {
  const options = franchises.filter((f) => f.isActive).map((f) => ({ id: f.id, name: f.name, _count: { churches: f.churches.length } }));
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Card title="Agregar una iglesia" description="Crea una sede dentro de una franquicia existente o inicia una nueva.">
        <CreateChurchForm franchises={options} />
      </Card>
      <Card title="Cómo dejar lista una sede">
        <ol className="stagger flex flex-col gap-3 text-sm">
          {[
            ["Identidad", "Elige colores y un código interno para reconocerla en reportes."],
            ["Contacto", "Registra dirección, teléfono y correo de la sede."],
            ["Comunicación", "Escribe su presentación y horarios de reunión."],
            ["Equipo", "Asigna responsables y su rol dentro de la sede."],
          ].map(([title, text], i) => (
            <li key={title} className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent">{i + 1}</span>
              <span><span className="font-medium">{title}.</span> <span className="text-muted">{text}</span></span>
            </li>
          ))}
        </ol>
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-surface-2 p-3 text-xs text-muted">
          <Sparkles aria-hidden className="mt-0.5 size-3.5 shrink-0 text-accent" />
          El panorama mide estos puntos y te sugiere qué completar en cada sede.
        </p>
      </Card>
    </div>
  );
}
