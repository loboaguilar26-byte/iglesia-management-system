import { MemberPicker } from "@/components/member-picker";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, SelectField, TextArea } from "@/components/ui/field";
import { FOLLOWUP_KINDS, FOLLOWUP_KIND_LABEL } from "@/modules/followups/service";
import { addFollowUpAction } from "./actions";

/** Formulario de contacto de seguimiento; sin `memberId` muestra el selector de persona. */
export function FollowUpForm({ memberId, today }: { memberId?: string; today: string }) {
  return (
    <ActionForm action={addFollowUpAction.bind(null, memberId ?? null)}>
      {memberId ? null : <MemberPicker name="memberId" label="Persona" />}
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Tipo de contacto" name="kind" defaultValue="CALL" options={FOLLOWUP_KINDS.map((k) => ({ value: k, label: FOLLOWUP_KIND_LABEL[k] }))} />
        <Field label="Fecha" name="contactedOn" type="date" defaultValue={today} max={today} required />
      </div>
      <TextArea label="Notas" name="notes" rows={3} hint="Resumen breve. Evita datos sensibles innecesarios." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Próxima acción (opcional)" name="nextAction" placeholder="Invitar a la reunión de jóvenes" />
        <Field label="Para el día" name="nextActionOn" type="date" min={today} />
      </div>
      <SubmitButton>Registrar contacto</SubmitButton>
    </ActionForm>
  );
}
