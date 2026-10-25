import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Alert } from "@/components/ui/alert";
import { TextArea } from "@/components/ui/field";
import { Badge, Card, PageHeader } from "@/components/ui/layout";
import { can } from "@/lib/authz";
import { formatDateOnly, formatDateTime, toDateInput } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { formatMoney } from "@/lib/money";
import { requirePageActor } from "@/lib/session";
import { financeCatalogs, getDonation } from "@/modules/finance/service";
import { getChurchTimezone } from "@/modules/settings/service";
import { correctDonationAction, voidDonationAction } from "../actions";
import { DonationForm } from "../donation-form";

export const metadata: Metadata = { title: "Aportación" };

export default async function DonationPage({ params }: PageProps<"/admin/tesoreria/[id]">) {
  const actor = await requirePageActor();
  if (!can(actor, "finance:read")) notFound();
  const { id } = await params;
  const d = await getDonation(actor, id).catch((e) => {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  });
  const [tz, catalogs] = await Promise.all([getChurchTimezone(), financeCatalogs(actor)]);
  const valid = d.status === "VALID";

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <PageHeader
        title={formatMoney(d.amount.toString(), d.currency)}
        back={{ href: "/admin/tesoreria", label: "Tesorería" }}
        description={<span className="flex flex-wrap items-center gap-2">{valid ? <Badge tone="success">Vigente</Badge> : <Badge tone="danger">Anulada</Badge>}{d.concept.name} · {formatDateOnly(d.receivedAt)}</span>}
      />
      {!valid ? <Alert tone="error">Anulada el {formatDateTime(d.voidedAt!, tz)} por {d.voidedBy?.name}. Motivo: {d.voidReason}</Alert> : null}
      {d.correctedBy ? <Alert tone="info">Fue corregida por <Link className="underline" href={`/admin/tesoreria/${d.correctedBy.id}`}>esta aportación</Link>.</Alert> : null}
      {d.corrects ? <Alert tone="info">Corrige a <Link className="underline" href={`/admin/tesoreria/${d.corrects.id}`}>una aportación anterior de {formatMoney(d.corrects.amount.toString(), d.currency)}</Link>.</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card title="Detalle">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted">Fecha</dt><dd>{formatDateOnly(d.receivedAt)}</dd>
            <dt className="text-muted">Concepto</dt><dd>{d.concept.name}</dd>
            <dt className="text-muted">Método</dt><dd>{d.method.name}</dd>
            <dt className="text-muted">Donante</dt><dd>{d.member ? `${d.member.firstName} ${d.member.lastName}` : "Anónimo"}</dd>
            <dt className="text-muted">Referencia</dt><dd>{d.reference ?? "—"}</dd>
            <dt className="text-muted">Notas</dt><dd className="whitespace-pre-line">{d.notes ?? "—"}</dd>
            <dt className="text-muted">Registró</dt><dd>{d.createdBy.name} · {formatDateTime(d.createdAt, tz)}</dd>
          </dl>
        </Card>
        {valid ? (
          <div className="flex flex-col gap-6">
            {can(actor, "finance:update") && can(actor, "finance:void") ? (
              <Card title="Corregir" description="Se anula esta aportación y se registra una nueva con los datos correctos. Ambas quedan en el historial.">
                <DonationForm
                  action={correctDonationAction.bind(null, d.id)}
                  concepts={catalogs.concepts.filter((c) => c.isActive || c.id === d.conceptId)}
                  methods={catalogs.methods.filter((c) => c.isActive || c.id === d.methodId)}
                  today={toDateInput(new Date(), tz)}
                  values={{
                    receivedAt: d.receivedAt.toISOString().slice(0, 10),
                    amount: d.amount.toString(),
                    conceptId: d.conceptId,
                    methodId: d.methodId,
                    member: d.member ? { id: d.member.id, name: `${d.member.firstName} ${d.member.lastName}` } : null,
                    reference: d.reference,
                    notes: d.notes,
                  }}
                  withReason
                  submitLabel="Registrar corrección"
                />
              </Card>
            ) : null}
            {can(actor, "finance:void") ? (
              <Card title="Anular" description="Para registros capturados por error. No se elimina: queda marcada como anulada.">
                <ActionForm action={voidDonationAction.bind(null, d.id)} confirmMessage="¿Anular esta aportación?">
                  <TextArea label="Motivo" name="reason" rows={2} required />
                  <SubmitButton variant="danger">Anular aportación</SubmitButton>
                </ActionForm>
              </Card>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
