"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/action-state";
import { setMemberActiveAction } from "./actions";

export function MemberStatusForm({ id, active }: { id: string; active: boolean }) {
  const [state, action, pending] = useActionState<ActionState>(setMemberActiveAction.bind(null, id, !active), {});
  return <form action={action} onSubmit={(event) => { if (!window.confirm(active ? "¿Desactivar este miembro?" : "¿Activar este miembro?")) event.preventDefault(); }} className="flex flex-col gap-3">{state.message ? <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert> : null}<Button type="submit" variant={active ? "danger" : "secondary"} disabled={pending}>{pending ? "Guardando…" : active ? "Desactivar miembro" : "Activar miembro"}</Button></form>;
}
