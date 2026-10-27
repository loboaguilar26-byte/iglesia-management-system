"use client";

import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, SelectField } from "@/components/ui/field";
import type { ActionState } from "@/lib/action-state";

type Option = { id: string; name: string };

export function GivingReportForm({
  action,
  concepts,
  methods,
  today,
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  concepts: Option[];
  methods: Option[];
  today: string;
}) {
  return (
    <ActionForm action={action}>
      <p className="rounded-xl bg-primary/5 p-3 text-sm text-muted">
        Registra una ofrenda que ya entregaste en persona o por transferencia. No se procesa ningún pago aquí y el reporte no cuenta como ingreso hasta que tesorería lo valide.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fecha de entrega" name="receivedAt" type="date" max={today} defaultValue={today} required />
        <Field label="Monto" name="amount" inputMode="decimal" placeholder="0.00" required hint="Hasta 2 decimales." />
        <SelectField label="Concepto" name="conceptId" placeholder="Selecciona…" options={concepts.map((c) => ({ value: c.id, label: c.name }))} required />
        <SelectField label="Método de entrega" name="methodId" placeholder="Selecciona…" options={methods.map((m) => ({ value: m.id, label: m.name }))} required />
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="anonymous" className="mt-0.5 size-4" />
        <span><span className="font-medium">Mantener mi ofrenda anónima</span><span className="block text-muted">Tesorería no verá tu nombre y el registro oficial no se asociará a tu ficha.</span></span>
      </label>
      <SubmitButton>Enviar para validación</SubmitButton>
    </ActionForm>
  );
}
