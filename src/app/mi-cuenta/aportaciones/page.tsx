import type { Metadata } from "next";
import Link from "next/link";
import { FileDown, HeartHandshake, Receipt, TrendingUp } from "lucide-react";
import { BarChart } from "@/components/bar-chart";
import { Badge, Card, EmptyState, StatCard } from "@/components/ui/layout";
import { buttonClass } from "@/components/ui/button";
import { formatDateOnly, toDateInput } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { requirePortalActor } from "@/lib/session";
import { givingFormOptions, myGivingReports } from "@/modules/finance/service";
import { myGiving } from "@/modules/portal/engagement";
import { getChurchTimezone } from "@/modules/settings/service";
import { submitGivingReportAction } from "../actions";
import { GivingReportForm } from "../giving-report-form";
import { PortalHeading, portalBlocker } from "../portal-ui";

export const metadata: Metadata = { title: "Mis aportaciones" };

export default async function GivingPage({ searchParams }: PageProps<"/mi-cuenta/aportaciones">) {
  const actor = await requirePortalActor();
  const blocked = portalBlocker(actor);
  if (blocked) return blocked;
  const sp = await searchParams;
  const [g, tz, options, reports] = await Promise.all([
    myGiving(actor, Number(sp.anio) || undefined),
    getChurchTimezone(),
    givingFormOptions(actor),
    myGivingReports(actor),
  ]);
  const months = g.monthly.filter((m) => m.value > 0).length;
  const pending = reports.filter((r) => r.status === "PENDING").length;

  return (
    <div className="flex flex-col gap-6">
      <PortalHeading
        eyebrow="Mayordomía"
        title={`Mis aportaciones ${g.year}`}
        description="Aportaciones registradas a tu nombre. Las anónimas no se asocian a nadie y por eso no aparecen aquí."
        actions={
          <>
            {g.years.length > 1 ? (
              <nav aria-label="Año" className="flex gap-1 rounded-xl border border-border bg-surface p-1">
                {g.years.slice(0, 5).map((y) => (
                  <Link key={y} href={`/mi-cuenta/aportaciones?anio=${y}`} aria-current={y === g.year ? "page" : undefined} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${y === g.year ? "bg-primary text-primary-foreground" : "text-muted hover:bg-surface-2"}`}>{y}</Link>
                ))}
              </nav>
            ) : null}
            <a href={`/mi-cuenta/aportaciones/constancia?anio=${g.year}`} className={buttonClass("primary", "btn-shine")} download>
              <FileDown aria-hidden className="size-4" /> Constancia {g.year} (PDF)
            </a>
          </>
        }
      />

      <div className="stagger grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total del año" value={formatMoney(g.total, g.currency)} detail={`${g.count} aportaciones`} icon={<HeartHandshake className="size-4" />} />
        <StatCard label="Promedio por aportación" value={formatMoney(g.count ? (Number(g.total) / g.count).toFixed(2) : 0, g.currency)} icon={<TrendingUp className="size-4" />} />
        <StatCard label="Meses con aportación" value={months} detail="De 12 meses" icon={<Receipt className="size-4" />} />
        <StatCard label="Reportes pendientes" value={pending} detail="Esperando validación de tesorería" icon={<Receipt className="size-4" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card title="Por mes" description={`Aportaciones validadas en ${g.year}.`}>
          <BarChart label={`Aportaciones por mes ${g.year}`} color="var(--accent)" data={g.monthly} format={(v) => formatMoney(v, g.currency)} />
        </Card>
        <Card title="Por concepto">
          {g.byConcept.length === 0 ? (
            <EmptyState title="Sin aportaciones este año" />
          ) : (
            <ul className="stagger flex flex-col gap-3">
              {g.byConcept.map((c) => (
                <li key={c.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{c.name}</span>
                    <span className="tabular-nums text-muted">{formatMoney(c.total, g.currency)} · {c.share}%</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
                    <div className="bar-grow h-full rounded-full bg-accent" style={{ width: `${c.share}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card title="Historial del año">
          {g.donations.length === 0 ? (
            <EmptyState title={`Sin aportaciones registradas en ${g.year}`} />
          ) : (
            <ul className="flex max-h-[420px] flex-col divide-y divide-border overflow-y-auto pr-1 text-sm">
              {g.donations.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="font-medium">{d.concept.name}</span>
                    <span className="block text-xs text-muted">{formatDateOnly(d.receivedAt)} · {d.method.name}</span>
                  </span>
                  <span className="font-semibold tabular-nums">{formatMoney(d.amount, d.currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <div className="flex flex-col gap-6">
          <Card title="Reportar una ofrenda" description="Informa a tesorería de una entrega ya realizada.">
            <GivingReportForm action={submitGivingReportAction} concepts={options.concepts} methods={options.methods} today={toDateInput(new Date(), tz)} />
          </Card>
          <Card title="Mis reportes de ofrenda" description="Los reportes pendientes no se cuentan como ingresos hasta su validación.">
            {reports.length === 0 ? (
              <EmptyState title="Aún no has reportado ofrendas" />
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {reports.map((report) => (
                  <li key={report.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                    <div>
                      <p className="font-medium">{report.concept.name} · {formatDateOnly(report.receivedAt)}</p>
                      <p className="text-xs text-muted">{report.isAnonymous ? "Anónima" : "Con nombre"}{report.reviewNote ? ` · ${report.reviewNote}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold tabular-nums">{formatMoney(report.amount, report.currency)}</span>
                      <Badge tone={report.status === "APPROVED" ? "success" : report.status === "REJECTED" ? "danger" : "warning"}>
                        {report.status === "APPROVED" ? "Validada" : report.status === "REJECTED" ? "Revisar" : "Pendiente"}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
