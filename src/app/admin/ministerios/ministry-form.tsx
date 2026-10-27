"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { ActionState } from "@/lib/action-state";
import { saveMinistryAction } from "./actions";

export function MinistryForm({ id, name = "", description = "", isPublic = false }: { id: string | null; name?: string; description?: string; isPublic?: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveMinistryAction.bind(null, id), {});
  return <form action={action} className="flex flex-col gap-4">{state.message ? <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert> : null}<Field label="Nombre" name="name" defaultValue={name} required /><label className="flex flex-col gap-1 text-sm font-medium"><span>Descripción</span><textarea name="description" defaultValue={description} className="min-h-28 rounded-lg border border-border bg-surface p-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/30" /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isPublic" defaultChecked={isPublic} /> Mostrar en el sitio público</label><Button type="submit" disabled={pending}>{pending ? "Guardando…" : id ? "Guardar cambios" : "Crear ministerio"}</Button></form>;
}
