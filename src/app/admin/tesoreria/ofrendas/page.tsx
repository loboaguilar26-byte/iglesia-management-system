import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/ui/action-button";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { TextArea } from "@/components/ui/field";
import { Card, EmptyState, PageHeader } from "@/components/ui/layout";
import { can } from "@/lib/authz";
import { formatDateOnly } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { requirePageActor } from "@/lib/session";
import { listGivingReports } from "@/modules/finance/service";
import { approveGivingReportAction, rejectGivingReportAction } from "../actions";

export const metadata: Metadata = { title: "Ofrendas por validar" };

export default async function GivingReportsPage() {
  const actor = await requirePageActor();
  if (!can(actor, "finance:review_giving")) notFound();
  const reports = await listGivingReports(actor);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ofrendas por validar"
        description="Los reportes de miembros no se incluyen en ingresos hasta que tesorería los confirme."
        back={{ href: "/admin/tesoreria", label: "Tesorería" }}
      />
      <p className="rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm text-muted">
        La identidad de los reportes anónimos se oculta también al personal de tesorería. Confirma solo las entregas recibidas.
      </p>
      {reports.length === 0 ? (
        <EmptyState title="No hay ofrendas pendientes" description="Los nuevos reportes aparecerán aquí para su revisión." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {reports.map((report) => (
            <Card key={report.id} title={report.concept.name} description={`${formatDateOnly(report.receivedAt)} · ${report.method.name}`}>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="font-display text-3xl font-semibold tabular-nums">{formatMoney(report.amount, report.currency)}</p>
                  <p className="mt-1 text-sm text-muted">{report.donorName ?? "Donación anónima"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ActionButton
                    action={approveGivingReportAction.bind(null, report.id)}
                    variant="primary"
                    confirmMessage="¿Confirmas que recibiste esta ofrenda? Se sumará a los ingresos."
                  >
                    Confirmar recibida
                  </ActionButton>
                </div>
              </div>
              <div className="mt-4 border-t border-border pt-4">
                <ActionForm action={rejectGivingReportAction.bind(null, report.id)} className="flex flex-col gap-3">
                  <TextArea label="Motivo para devolver a revisión" name="reason" rows={2} required hint="Se mostrará a la persona en su portal." />
                  <SubmitButton variant="secondary">Devolver</SubmitButton>
                </ActionForm>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
