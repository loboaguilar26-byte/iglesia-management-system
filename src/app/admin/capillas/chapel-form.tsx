import { MemberPicker } from "@/components/member-picker";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, SelectField, TextArea } from "@/components/ui/field";
import type { ActionState } from "@/lib/action-state";

type Values = {
  name?: string;
  code?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  description?: string | null;
  openedOn?: Date | null;
  managerMember?: { id: string; name: string } | null;
  managerUserId?: string | null;
};

export function ChapelForm({ action, values = {}, users, submitLabel }: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  values?: Values;
  users: { id: string; name: string; email: string }[];
  submitLabel: string;
}) {
  return (
    <ActionForm action={action} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <Field label="Nombre de la capilla" name="name" defaultValue={values.name} required placeholder="Capilla Norte" />
        <Field label="Código" name="code" defaultValue={values.code} required placeholder="CAP-NORTE" hint="Identificador corto y único." className="uppercase" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Dirección" name="address" defaultValue={values.address ?? ""} />
        </div>
        <Field label="Teléfono" name="phone" type="tel" defaultValue={values.phone ?? ""} />
        <Field label="Correo de contacto" name="email" type="email" defaultValue={values.email ?? ""} />
        <Field label="Fecha de apertura" name="openedOn" type="date" defaultValue={values.openedOn ? values.openedOn.toISOString().slice(0, 10) : ""} />
        <SelectField
          label="Cuenta del gestor (opcional)"
          name="managerUserId"
          defaultValue={values.managerUserId ?? ""}
          placeholder="Sin cuenta asignada"
          options={users.map((u) => ({ value: u.id, label: `${u.name} · ${u.email}` }))}
          hint="Usuario del sistema responsable de la capilla."
        />
      </div>
      <MemberPicker name="managerMemberId" label="Encargado(a) / pastor de la capilla" initial={values.managerMember ? [values.managerMember] : []} hint="Persona del directorio a cargo." />
      <TextArea label="Descripción" name="description" defaultValue={values.description ?? ""} rows={3} />
      <SubmitButton>{submitLabel}</SubmitButton>
    </ActionForm>
  );
}
