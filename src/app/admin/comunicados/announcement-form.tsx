import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { CheckboxField, Field, SelectField, TextArea } from "@/components/ui/field";
import type { ActionState } from "@/lib/action-state";

export function AnnouncementForm({ action, values, canPublish, alreadyPublished, submitLabel }: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  values?: { title: string; body: string; visibility: string; isFeatured: boolean; expiresOn: string };
  canPublish: boolean;
  alreadyPublished?: boolean;
  submitLabel: string;
}) {
  return (
    <ActionForm action={action}>
      <Field label="Título" name="title" defaultValue={values?.title} required />
      <TextArea label="Contenido" name="body" defaultValue={values?.body} rows={8} required hint="Texto plano; los saltos de línea se respetan." />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Visibilidad"
          name="visibility"
          defaultValue={values?.visibility ?? "PRIVATE"}
          options={[
            { value: "PRIVATE", label: "Interno (solo panel)" },
            { value: "PUBLIC", label: "Público (sitio web)" },
          ]}
        />
        <Field label="Vigente hasta (opcional)" name="expiresOn" type="date" defaultValue={values?.expiresOn ?? ""} />
      </div>
      <CheckboxField label="Destacar" name="isFeatured" defaultChecked={values?.isFeatured} hint="Aparece primero y resaltado." />
      {canPublish && !alreadyPublished ? <CheckboxField label="Publicar ahora" name="publish" hint="Si no, se guarda como borrador." /> : null}
      <SubmitButton>{submitLabel}</SubmitButton>
    </ActionForm>
  );
}
