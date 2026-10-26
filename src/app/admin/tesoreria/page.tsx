import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClass } from "@/components/ui/button";
import { Badge, Card, EmptyState, PageHeader, ResponsiveTable, StatCard } from "@/components/ui/layout";
import { Pagination } from "@/components/ui/pagination";
import { can } from "@/lib/authz";
import { formatDateOnly, toDateInput, zonedParts } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { requirePageActor } from "@/lib/session";
import { donationSummary, financeCatalogs, listDonations, weeklyFinanceSummary } from "@/modules/finance/service";
import { getChurchTimezone, getSettingsInternal } from "@/modules/settings/service";
import { createDonationAction } from "./actions";
import { DonationForm } from "./donation-form";

export const metadata: Metadata = { title: "Tesorería" };
const pad = (n: number) => String(n).padStart(2, "0");
const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

export default async function TreasuryPage({ searchParams }: PageProps<"/admin/tesoreria">) {
  const actor = await requirePageActor();
  if (!can(actor, "finance:read")) notFound();
  const sp = await searchParams;
  const [tz, settings] = await Promise.all([getChurchTimezone(), getSettingsInternal()]);
  const today = toDateInput(new Date(), tz);
  const p = zonedParts(new Date(), tz);
  const from = isDate(sp.desde) ? sp.desde : `${p.year}-${pad(p.month)}-01`;
  const to = isDate(sp.hasta) ? sp.hasta : today;
  const filter = {
    from,
    to,
    conceptId: typeof sp.concepto === "string" ? sp.concepto : undefined,
    methodId: typeof sp.metodo === "string" ? sp.metodo : undefined,
    includeVoided: sp.anuladas === "1",
    page: sp.page,
  };
  const [{ data, meta }, summary, catalogs, weekly] = await Promise.all([
    listDonations(actor, filter),
    donationSummary(actor, filter),
    financeCatalogs(actor),
    weeklyFinanceSummary(actor, filter),
  ]);
  const cur = settings.currency;
  const params = new URLSearchParams({ desde: from, hasta: to, ...(filter.conceptId ? { concepto: filter.conceptId } : {}), ...(filter.methodId ? { metodo: filter.methodId } : {}), ...(filter.includeVoided ? { anuladas: "1" } : {}) });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tesorería"
        description="Registro administrativo de diezmos, ofrendas y otras aportaciones. Acceso exclusivo del personal autorizado."
        actions={
          <>
            {can(actor, "reports:finance") ? <Link href={`/admin/reportes?tipo=ingresos&desde=${from}&hasta=${to}`} className={buttonClass("secondary")}>Reporte</Link> : null}
            <Link href="/admin/tesoreria/gastos" className={buttonClass("secondary")}>Control de gastos</Link>
            {can(actor, "finance:review_giving") ? <Link href="/admin/tesoreria/ofrendas" className={buttonClass("accent")}>Ofrendas por validar</Link> : null}
            {can(actor, "finance:configure") ? <Link href="/admin/tesoreria/catalogos" className={buttonClass("secondary")}>Conceptos y métodos</Link> : null}
          </>
        }
      />

      <form className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-4">
        <label className="flex flex-col gap-1 text-sm">Desde<input type="date" name="desde" defaultValue={from} className="min-h-10 rounded-lg border border-border bg-surface px-3" /></label>
        <label className="flex flex-col gap-1 text-sm">Hasta<input type="date" name="hasta" defaultValue={to} className="min-h-10 rounded-lg border border-border bg-surface px-3" /></label>
        <label className="flex flex-col gap-1 text-sm">Concepto
          <select name="concepto" defaultValue={filter.conceptId ?? ""} className="min-h-10 rounded-lg border border-border bg-surface px-3">
            <option value="">Todos</option>
            {catalogs.concepts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">Método
          <select name="metodo" defaultValue={filter.methodId ?? ""} className="min-h-10 rounded-lg border border-border bg-surface px-3">
            <option value="">Todos</option>
            {catalogs.methods.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="anuladas" value="1" defaultChecked={filter.includeVoided} className="size-4" /> Ver anuladas</label>
        <button className={buttonClass("secondary")} type="submit">Aplicar</button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total del periodo" value={formatMoney(summary.total, cur)} detail={`${formatDateOnly(new Date(`${from}T00:00:00Z`))} – ${formatDateOnly(new Date(`${to}T00:00:00Z`))} · solo vigentes`} />
        <StatCard label="Registros" value={summary.count} detail="Aportaciones vigentes" />
        <Card title="Por concepto" className="sm:col-span-2 lg:col-span-1">
          <ul className="flex flex-col gap-1 text-sm">{summary.byConcept.length ? summary.byConcept.map((c) => <li key={c.name} className="flex justify-between gap-2"><span>{c.name}</span><span className="tabular-nums">{formatMoney(c.total, cur)}</span></li>) : <li className="text-muted">Sin datos</li>}</ul>
        </Card>
        <Card title="Por método">
          <ul className="flex flex-col gap-1 text-sm">{summary.byMethod.length ? summary.byMethod.map((c) => <li key={c.name} className="flex justify-between gap-2"><span>{c.name}</span><span className="tabular-nums">{formatMoney(c.total, cur)}</span></li>) : <li className="text-muted">Sin datos</li>}</ul>
        </Card>
      </div>

      <Card title="Corte semanal" description="Ingresos confirmados menos gastos vigentes. Los reportes pendientes de miembros no se cuentan.">
        {weekly.length === 0 ? (
          <EmptyState title="Sin movimientos en el periodo" description="Cuando registres ingresos o gastos, aparecerá aquí el corte semanal." />
        ) : (
          <ResponsiveTable
            rows={weekly}
            rowKey={(week) => week.weekStart}
            caption="Resumen semanal de ingresos y gastos"
            columns={[
              { header: "Semana", cell: (week) => `${formatDateOnly(new Date(`${week.weekStart}T00:00:00Z`))} – ${formatDateOnly(new Date(`${week.weekEnd}T00:00:00Z`))}` },
              { header: "Ingresos", cell: (week) => formatMoney(week.income, cur) },
              { header: "Gastos", cell: (week) => formatMoney(week.expenses, cur) },
              { header: "Balance", cell: (week) => <span className={`font-semibold tabular-nums ${Number(week.balance) < 0 ? "text-danger" : "text-success"}`}>{formatMoney(week.balance, cur)}</span> },
              { header: "Movimientos", cell: (week) => week.incomeCount + week.expenseCount },
            ]}
          />
        )}
      </Card>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_400px]">
        {can(actor, "finance:create") ? (
          <Card title="Registrar aportación" className="2xl:order-2">
            <DonationForm
              action={createDonationAction}
              concepts={catalogs.concepts.filter((c) => c.isActive)}
              methods={catalogs.methods.filter((c) => c.isActive)}
              today={today}
              submitLabel="Registrar"
            />
          </Card>
        ) : null}
        <div className="flex min-w-0 flex-col gap-4 2xl:order-1">
          {data.length === 0 ? (
            <EmptyState title="Sin aportaciones en el periodo" />
          ) : (
            <ResponsiveTable
              rows={data}
              rowKey={(d) => d.id}
              columns={[
                { header: "Monto", cell: (d) => <Link href={`/admin/tesoreria/${d.id}`} className={`font-semibold tabular-nums text-primary hover:underline ${d.status === "VOIDED" ? "line-through opacity-60" : ""}`}>{formatMoney(d.amount.toString(), d.currency)}</Link> },
                { header: "Fecha", cell: (d) => formatDateOnly(d.receivedAt) },
                { header: "Concepto", cell: (d) => d.concept.name },
                { header: "Método", cell: (d) => d.method.name },
                { header: "Donante", cell: (d) => (d.member ? `${d.member.firstName} ${d.member.lastName}` : <span className="text-muted">Anónimo</span>) },
                { header: "Estado", cell: (d) => (d.status === "VOIDED" ? <Badge tone="danger">Anulada</Badge> : d.correctsId ? <Badge tone="warning">Corrección</Badge> : <Badge tone="success">Vigente</Badge>) },
              ]}
            />
          )}
          <Pagination {...meta} hrefFor={(n) => `/admin/tesoreria?${params}&page=${n}`} />
        </div>
      </div>
    </div>
  );
}
