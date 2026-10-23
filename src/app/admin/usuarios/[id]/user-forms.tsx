"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/action-state";
import type { RoleKey } from "@/lib/permissions";
import { setActiveAction, updateRolesAction } from "../actions";
import { RoleCheckboxes } from "../role-checkboxes";

function Feedback({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>;
}

export function RolesForm({ userId, roles }: { userId: string; roles: RoleKey[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateRolesAction.bind(null, userId),
    {},
  );
  return (
    <form action={action} className="flex flex-col gap-4">
      <Feedback state={state} />
      <RoleCheckboxes selected={roles} errors={state.fieldErrors?.roles} />
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Guardando…" : "Guardar roles"}
      </Button>
    </form>
  );
}

export function ActiveForm({ userId, isActive }: { userId: string; isActive: boolean }) {
  const [state, action, pending] = useActionState<ActionState>(setActiveAction.bind(null, userId, !isActive), {});
  return (
    <form
      action={action}
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        const msg = isActive
          ? "¿Desactivar este usuario? No podrá iniciar sesión y se cerrarán sus sesiones."
          : "¿Reactivar este usuario?";
        if (!window.confirm(msg)) e.preventDefault();
      }}
    >
      <Feedback state={state} />
      <Button type="submit" variant={isActive ? "danger" : "secondary"} disabled={pending} className="self-start">
        {isActive ? "Desactivar usuario" : "Reactivar usuario"}
      </Button>
    </form>
  );
}
