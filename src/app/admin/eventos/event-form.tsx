import { MemberPicker } from "@/components/member-picker";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, SelectField, TextArea } from "@/components/ui/field";
import type { ActionState } from "@/lib/action-state";

export type EventFormValues = {
  title?: string;
  typeId?: string;
  startsAt?: string;
  endsAt?: string;
  location?: string | null;
  description?: string | null;
  visibility?: string;
  ministryId?: string | null;
  responsibles?: { id: string; name: string }[];
};

export function EventForm({ action, values = {}, types, ministries, requireMinistry, submitLabel }: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  values?: EventFormValues;
  types: { id: string; name: string }[];
  ministries: { id: string; name: string }[];
  requireMinistry: boolean;
  submitLabel: string;
}) {
  return (
    <ActionForm action={action}>
      <Field label="Título" name="title" defaultValue={values.title} required placeholder="Culto de domingo" />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Tipo" name="typeId" defaultValue={values.typeId} placeholder="Selecciona…" options={types.map((t) => ({ value: t.id, label: t.name }))} required />
        <SelectField
          label="Ministerio"
          name="ministryId"
          defaultValue={values.ministryId ?? ""}
          placeholder={requireMinistry ? undefined : "General (sin ministerio)"}
          options={ministries.map((m) => ({ value: m.id, label: m.name }))}
        />
        <Field label="Inicio" name="startsAt" type="datetime-local" defaultValue={values.startsAt} required hint="Hora de la iglesia." />
        <Field label="Fin" name="endsAt" type="datetime-local" defaultValue={values.endsAt} required />
        <Field label="Lugar" name="location" defaultValue={values.location ?? ""} placeholder="Templo principal" />
        <SelectField
          label="Visibilidad"
          name="visibility"
          defaultValue={values.visibility ?? "PRIVATE"}
          options={[
            { value: "PRIVATE", label: "Interno (solo panel)" },
            { value: "PUBLIC", label: "Público (aparece en el sitio web)" },
          ]}
        />
      </div>
      <TextArea label="Descripción" name="description" defaultValue={values.description ?? ""} rows={4} />
      <MemberPicker name="responsibles" label="Responsables" multiple initial={values.responsibles} hint="Personas a cargo del evento." />
      <SubmitButton>{submitLabel}</SubmitButton>
    </ActionForm>
  );
}
