import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, TextArea } from "@/components/ui/field";
import { Badge, Card, EmptyState, PageHeader, ResponsiveTable, StatCard } from "@/components/ui/layout";
import { Pagination } from "@/components/ui/pagination";
import { can } from "@/lib/authz";
import { formatDateOnly, toDateInput, zonedParts } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { requirePageActor } from "@/lib/session";
import { expenseSummary, listExpenses } from "@/modules/finance/service";
import { getChurchTimezone, getSettingsInternal } from "@/modules/settings/service";
import { createExpenseAction, voidExpenseAction } from "../actions";

export const metadata: Metadata = { title: "Gastos" };
const pad = (n: number) => String(n).padStart(2, "0");
const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

export default async function ExpensesPage({ searchParams }: PageProps<"/admin/tesoreria/gastos">) {
  const actor = await requirePageActor();
  if (!can(actor, "finance:read")) notFound();
  const sp = await searchParams;
  const [tz, settings] = await Promise.all([getChurchTimezone(), getSettingsInternal()]);
  const today = toDateInput(new Date(), tz);
  const p = zonedParts(new Date(), tz);
  const from = isDate(sp.desde) ? sp.desde : `${p.year}-${pad(p.month)}-01`;
  const to = isDate(sp.hasta) ? sp.hasta : today;
  const filter = { from, to, includeVoided: sp.anulados === "1", page: sp.page };
  const [{ data, meta }, summary] = await Promise.all([listExpenses(actor, filter), expenseSummary(actor, filter)]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Gastos"
        description="Control de egresos con motivo, método de pago y trazabilidad. Los registros se anulan, nunca se eliminan."
        back={{ href: "/admin/tesoreria", label: "Tesorería" }}
        actions={<Link href="/admin/tesoreria" className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-2">Ver ingresos</Link>}
      />
      <form className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <label className="flex flex-col gap-1 text-sm">Desde<input type="date" name="desde" defaultValue={from} className="min-h-10 rounded-lg border border-border bg-surface px-3" /></label>
        <label className="flex flex-col gap-1 text-sm">Hasta<input type="date" name="hasta" defaultValue={to} className="min-h-10 rounded-lg border border-border bg-surface px-3" /></label>
        <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="anulados" value="1" defaultChecked={filter.includeVoided} className="size-4" /> Ver anulados</label>
        <button className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm" type="submit">Aplicar</button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Egresos del periodo" value={formatMoney(summary.total, settings.currency)} detail={`${summary.count} gastos vigentes · ${formatDateOnly(new Date(`${from}T00:00:00Z`))} – ${formatDateOnly(new Date(`${to}T00:00:00Z`))}`} />
        <StatCard label="Registros mostrados" value={meta.total} detail="Incluye anulados si activaste el filtro" />
      </div>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-4">
          {data.length === 0 ? (
            <EmptyState title="Sin gastos en el periodo" description="Registra un egreso para comenzar el control financiero." />
          ) : (
            <ResponsiveTable
              rows={data}
              rowKey={(expense) => expense.id}
              columns={[
                { header: "Gasto", cell: (expense) => <span className={`font-medium ${expense.status === "VOIDED" ? "line-through opacity-60" : ""}`}>{expense.description}</span> },
                { header: "Fecha", cell: (expense) => formatDateOnly(expense.spentAt) },
                { header: "Categoría", cell: (expense) => expense.category },
                { header: "Método", cell: (expense) => expense.method },
                { header: "Monto", cell: (expense) => <span className="font-semibold tabular-nums">{formatMoney(expense.amount.toString(), expense.currency)}</span> },
                { header: "Estado", cell: (expense) => expense.status === "VOIDED" ? <Badge tone="danger">Anulado</Badge> : <Badge tone="success">Vigente</Badge> },
                { header: "Acción", cell: (expense) => expense.status === "VALID" && can(actor, "finance:void") ? (
                  <details className="max-w-56">
                    <summary className="cursor-pointer text-xs font-medium text-danger">Anular</summary>
                    <ActionForm action={voidExpenseAction.bind(null, expense.id)} className="mt-2 flex flex-col gap-2">
                      <TextArea label="Motivo" name="reason" rows={2} required />
                      <SubmitButton variant="danger">Confirmar anulación</SubmitButton>
                    </ActionForm>
                  </details>
                ) : expense.voidReason ? <span className="text-xs text-muted">{expense.voidReason}</span> : "—" },
              ]}
            />
          )}
          <Pagination {...meta} hrefFor={(page) => `/admin/tesoreria/gastos?desde=${from}&hasta=${to}${filter.includeVoided ? "&anulados=1" : ""}&page=${page}`} />
        </div>
        {can(actor, "finance:create") ? (
          <Card title="Registrar gasto" description="Captura una salida de dinero.">
            <ActionForm action={createExpenseAction}>
              <div className="grid gap-3">
                <Field label="Fecha" name="spentAt" type="date" max={today} defaultValue={today} required />
                <Field label="Monto" name="amount" inputMode="decimal" placeholder="0.00" required />
                <Field label="Categoría" name="category" placeholder="Servicios, mantenimiento…" required />
                <Field label="Descripción" name="description" placeholder="¿En qué se utilizó?" required />
                <Field label="Método de pago" name="method" placeholder="Efectivo, transferencia…" required />
                <Field label="Referencia o folio" name="reference" />
                <TextArea label="Notas" name="notes" rows={2} />
                <SubmitButton>Guardar gasto</SubmitButton>
              </div>
            </ActionForm>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
