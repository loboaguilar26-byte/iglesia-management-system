"use client";

import { useState } from "react";
import { MemberPicker } from "@/components/member-picker";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, SelectField, TextArea } from "@/components/ui/field";
import type { ActionState } from "@/lib/action-state";

type Option = { id: string; name: string };

export function DonationForm({ action, concepts, methods, chapels = [], today, values, withReason, submitLabel }: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  concepts: Option[];
  methods: Option[];
  today: string;
  chapels?: Option[];
  values?: { receivedAt: string; amount: string; conceptId: string; methodId: string; member: Option | null; reference: string | null; notes: string | null; chapelId?: string | null };
  withReason?: boolean;
  submitLabel: string;
}) {
  const [anonymous, setAnonymous] = useState(values ? !values.member : false);
  return (
    <ActionForm action={action}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fecha de recepción" name="receivedAt" type="date" max={today} defaultValue={values?.receivedAt ?? today} required />
        <Field label="Monto" name="amount" inputMode="decimal" placeholder="0.00" defaultValue={values?.amount} required hint="Hasta 2 decimales." />
        <SelectField label="Concepto" name="conceptId" defaultValue={values?.conceptId} placeholder="Selecciona…" options={concepts.map((c) => ({ value: c.id, label: c.name }))} required />
        <SelectField label="Método de recepción" name="methodId" defaultValue={values?.methodId} placeholder="Selecciona…" options={methods.map((c) => ({ value: c.id, label: c.name }))} required />
        {chapels.length ? (
          <SelectField label="Capilla que recibió" name="chapelId" defaultValue={values?.chapelId ?? ""} placeholder="Sede principal" options={chapels.map((c) => ({ value: c.id, label: c.name }))} />
        ) : null}
        <Field label="Referencia o folio" name="reference" defaultValue={values?.reference ?? ""} hint="Opcional (número de transferencia, recibo…)." />
      </div>
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" name="anonymous" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="size-4" />
        <span><span className="font-medium">Aportación anónima</span> <span className="text-muted">— no se asocia a ninguna persona</span></span>
      </label>
      {anonymous ? null : <MemberPicker name="memberId" label="Donante" initial={values?.member ? [values.member] : []} />}
      <TextArea label="Notas" name="notes" rows={2} defaultValue={values?.notes ?? ""} />
      {withReason ? <TextArea label="Motivo de la corrección" name="reason" rows={2} required hint="Queda registrado en la bitácora." /> : null}
      <SubmitButton>{submitLabel}</SubmitButton>
    </ActionForm>
  );
}
