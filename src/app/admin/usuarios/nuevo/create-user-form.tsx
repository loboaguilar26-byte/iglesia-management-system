"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { ActionState } from "@/lib/action-state";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth-rules";
import { createUserAction } from "../actions";
import { RoleCheckboxes } from "../role-checkboxes";

export function CreateUserForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createUserAction, {});
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.message && !state.ok ? <Alert tone="error">{state.message}</Alert> : null}
      <Field label="Nombre completo" name="name" autoComplete="off" required errors={errors.name} />
      <Field label="Correo electrónico" name="email" type="email" autoComplete="off" required errors={errors.email} />
      <Field
        label="Contraseña inicial"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        errors={errors.password}
        hint={`Mínimo ${PASSWORD_MIN_LENGTH} caracteres. Comunícala por un medio seguro; la persona puede cambiarla con “¿Olvidaste tu contraseña?”.`}
      />
      <RoleCheckboxes errors={errors.roles} />
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Creando…" : "Crear usuario"}
      </Button>
    </form>
  );
}
