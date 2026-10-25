"use client";

import { createContext, useActionState, useContext, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/action-state";
import { Alert } from "./alert";
import { Button, type ButtonVariant } from "./button";

type FormCtx = { state: ActionState };
const FormContext = createContext<FormCtx>({ state: {} });

/** Errores y último valor enviado de un campo (para conservar lo capturado si hay error). */
export function useFieldState(name: string) {
  const { state } = useContext(FormContext);
  return { errors: state.fieldErrors?.[name], value: state.values?.[name] };
}

/**
 * Formulario conectado a una Server Action: muestra mensajes, errores por campo y estado de envío.
 * Las validaciones reales se hacen en el servidor (servicios).
 */
export function ActionForm({
  action,
  children,
  className = "flex flex-col gap-4",
  confirmMessage,
  showSuccess = true,
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  confirmMessage?: string;
  showSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <FormContext value={{ state }}>
      <form
        action={formAction}
        className={className}
        noValidate
        onSubmit={(e) => {
          if (confirmMessage && !window.confirm(confirmMessage)) e.preventDefault();
        }}
      >
        {state.message && (!state.ok || showSuccess) ? (
          <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>
        ) : null}
        {children}
      </form>
    </FormContext>
  );
}

export function SubmitButton({
  children,
  pendingText = "Guardando…",
  variant = "primary",
  className = "self-start",
}: {
  children: ReactNode;
  pendingText?: string;
  variant?: ButtonVariant;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending} className={className} aria-busy={pending}>
      {pending ? pendingText : children}
    </Button>
  );
}
