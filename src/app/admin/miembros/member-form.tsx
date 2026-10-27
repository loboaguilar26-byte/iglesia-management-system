"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { ActionState } from "@/lib/action-state";
import { createMemberAction, updateMemberAction } from "./actions";

type Member = { id?: string; firstName?: string; lastName?: string; phone?: string | null; email?: string | null; joinDate?: Date | null; status?: string; position?: string | null; isMinor?: boolean; notes?: string | null };

function dateValue(value?: Date | null) { return value ? new Date(value).toISOString().slice(0, 10) : ""; }

export function MemberForm({ member }: { member?: Member }) {
  const bound = member?.id ? updateMemberAction.bind(null, member.id) : createMemberAction;
  const [state, action, pending] = useActionState<ActionState, FormData>(bound, {});
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex max-w-3xl flex-col gap-5">
      {state.message ? <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert> : null}
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold">Datos personales</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Nombre(s)" name="firstName" defaultValue={member?.firstName ?? ""} required errors={errors.firstName} />
          <Field label="Apellidos" name="lastName" defaultValue={member?.lastName ?? ""} required errors={errors.lastName} />
          <Field label="Teléfono" name="phone" defaultValue={member?.phone ?? ""} errors={errors.phone} />
          <Field label="Correo" name="email" type="email" defaultValue={member?.email ?? ""} errors={errors.email} />
          <Field label="Fecha de ingreso" name="joinDate" type="date" defaultValue={dateValue(member?.joinDate)} errors={errors.joinDate} />
          <Field label="Cargo organizativo" name="position" defaultValue={member?.position ?? ""} errors={errors.position} />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium">Estado<select name="status" defaultValue={member?.status ?? "ACTIVE"} className="min-h-11 rounded-lg border border-border bg-surface px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"><option value="VISITOR">Visitante</option><option value="ACTIVE">Activo</option><option value="INACTIVE">Inactivo</option></select>{errors.status?.length ? <span className="text-sm text-danger">{errors.status.join(" ")}</span> : null}</label>
          <label className="flex items-center gap-3 self-end pb-2 text-sm font-medium"><input type="checkbox" name="isMinor" defaultChecked={member?.isMinor ?? false} className="size-4 accent-primary" />Es menor de edad</label>
        </div>
        <label className="mt-4 flex flex-col gap-1 text-sm font-medium">Notas pastorales<textarea name="notes" defaultValue={member?.notes ?? ""} className="min-h-32 rounded-lg border border-border bg-surface p-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/30" />{errors.notes?.length ? <span className="text-sm text-danger">{errors.notes.join(" ")}</span> : null}</label>
      </section>
      <Button type="submit" disabled={pending} className="self-start">{pending ? "Guardando…" : member ? "Guardar cambios" : "Registrar miembro"}</Button>
    </form>
  );
}
