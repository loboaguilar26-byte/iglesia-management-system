"use client";

import { useActionState, type ReactNode } from "react";
import type { ActionState } from "@/lib/action-state";
import { Button, type ButtonVariant } from "./button";

/** Botón que ejecuta una Server Action (ya enlazada a sus argumentos), con confirmación opcional. */
export function ActionButton({
  action,
  children,
  confirmMessage,
  variant = "secondary",
  size = "sm",
}: {
  action: (prev: ActionState) => Promise<ActionState>;
  children: ReactNode;
  confirmMessage?: string;
  variant?: ButtonVariant;
  size?: "sm" | "md";
}) {
  const [state, formAction, pending] = useActionState<ActionState>(action, {});
  return (
    <form
      action={formAction}
      className="inline-flex flex-col gap-1"
      onSubmit={(e) => {
        if (confirmMessage && !window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      <Button type="submit" variant={variant} size={size} disabled={pending}>
        {children}
      </Button>
      {state.message && !state.ok ? <span role="alert" className="text-xs text-danger">{state.message}</span> : null}
    </form>
  );
}
