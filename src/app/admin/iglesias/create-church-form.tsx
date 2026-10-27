"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { ActionState } from "@/lib/action-state";
import { createChurchAction } from "./actions";

type FranchiseOption = { id: string; name: string; _count: { churches: number } };

export function CreateChurchForm({ franchises }: { franchises: FranchiseOption[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createChurchAction, {});
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.message ? <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label htmlFor="franchiseId" className="text-sm font-medium">Franquicia existente</label>
          <select
            id="franchiseId"
            name="franchiseId"
            defaultValue=""
            className="min-h-10 rounded-lg border border-border bg-surface px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Crear una franquicia nueva</option>
            {franchises.map((franchise) => (
              <option key={franchise.id} value={franchise.id}>
                {franchise.name} ({franchise._count.churches} {franchise._count.churches === 1 ? "iglesia" : "iglesias"})
              </option>
            ))}
          </select>
          {errors.franchiseName?.length ? <p className="text-sm text-danger">{errors.franchiseName.join(" ")}</p> : null}
        </div>
        <Field label="Nueva franquicia" name="franchiseName" placeholder="Ej. Red Esperanza" hint="Solo se usa si no eliges una franquicia existente." />
        <Field label="Nombre de la iglesia" name="name" placeholder="Ej. Iglesia Centro" required errors={errors.name} />
        <Field label="Identificador" name="slug" placeholder="iglesia-centro" required errors={errors.slug} hint="Úsalo en minúsculas y con guiones." />
        <Field label="Código interno" name="code" placeholder="CENTRO" errors={errors.code} />
      </div>

      <div className="rounded-xl border border-border bg-background/60 p-4">
        <h3 className="font-medium">Personalización de esta iglesia</h3>
        <p className="mt-1 text-sm text-muted">Cada sede podrá tener identidad visual propia sin duplicar el sistema.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Color principal" name="primaryColor" type="color" defaultValue="#1e3a5f" className="h-11 w-full cursor-pointer p-1" />
          <Field label="Color de acento" name="accentColor" type="color" defaultValue="#d97706" className="h-11 w-full cursor-pointer p-1" />
        </div>
      </div>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Agregando…" : "Agregar iglesia"}
      </Button>
    </form>
  );
}
