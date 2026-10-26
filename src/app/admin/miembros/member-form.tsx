import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { CheckboxField, Field, SelectField, TextArea } from "@/components/ui/field";
import type { ActionState } from "@/lib/action-state";
import { MEMBER_STATUSES, MEMBER_STATUS_LABEL } from "@/modules/members/schema";

type Values = {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  email?: string | null;
  joinDate?: Date | null;
  birthDate?: Date | null;
  status?: string;
  position?: string | null;
  isMinor?: boolean;
  notes?: string | null;
};

export function MemberForm({ action, values = {}, canNotes, canStatus, submitLabel }: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  values?: Values;
  canNotes: boolean;
  canStatus: boolean;
  submitLabel: string;
}) {
  return (
    <ActionForm action={action}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre(s)" name="firstName" defaultValue={values.firstName} required autoComplete="off" />
        <Field label="Apellidos" name="lastName" defaultValue={values.lastName} required autoComplete="off" />
        <Field label="Teléfono" name="phone" type="tel" defaultValue={values.phone ?? ""} hint="Opcional." />
        <Field label="Correo electrónico" name="email" type="email" defaultValue={values.email ?? ""} hint="Opcional." />
        <Field label="Fecha de ingreso" name="joinDate" type="date" defaultValue={values.joinDate ? values.joinDate.toISOString().slice(0, 10) : ""} />
        <Field label="Fecha de nacimiento" name="birthDate" type="date" defaultValue={values.birthDate ? values.birthDate.toISOString().slice(0, 10) : ""} hint="Opcional. Solo para la lista interna de cumpleaños." />
        <SelectField
          label="Estado"
          name="status"
          defaultValue={values.status ?? "ACTIVE"}
          options={MEMBER_STATUSES.filter((s) => canStatus || s !== "INACTIVE" || values.status === "INACTIVE").map((s) => ({ value: s, label: MEMBER_STATUS_LABEL[s] }))}
          disabled={!canStatus && values.status === "INACTIVE"}
        />
        <Field label="Cargo o responsabilidad" name="position" defaultValue={values.position ?? ""} hint="Texto libre (p. ej. diácono, maestra). No otorga permisos." />
      </div>
      <CheckboxField label="Es menor de edad" name="isMinor" defaultChecked={values.isMinor} hint="Sus datos nunca se muestran en el sitio público." />
      {canNotes ? <TextArea label="Notas pastorales (confidenciales)" name="notes" defaultValue={values.notes ?? ""} rows={3} hint="Solo visibles para roles autorizados." /> : null}
      <CheckboxField label="Registrar de todos modos si parece duplicado" name="confirmDuplicate" />
      <SubmitButton>{submitLabel}</SubmitButton>
    </ActionForm>
  );
}
