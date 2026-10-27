"use client";

import { CheckCircle2 } from "lucide-react";
import { createContext, useActionState, useContext, useEffect, useState, type ReactNode } from "react";
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
        {state.message && !state.ok ? <Alert tone="error">{state.message}</Alert> : null}
        {state.ok && state.message && showSuccess ? <Toast key={toastKey(state)} message={state.message} /> : null}
        {children}
      </form>
    </FormContext>
  );
}

// Cada respuesta del servidor es un objeto nuevo: se usa para reiniciar el aviso.
const keys = new WeakMap<object, number>();
let seq = 0;
function toastKey(state: object) {
  if (!keys.has(state)) keys.set(state, ++seq);
  return keys.get(state);
}

/** Aviso flotante de éxito; desaparece solo a los 4 segundos. */
function Toast({ message }: { message: string }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <div role="status" className="fixed bottom-20 left-4 right-4 z-[60] sm:left-auto lg:bottom-5 lg:right-5 flex max-w-sm items-start gap-3 rounded-xl border border-success/30 bg-surface px-4 py-3 text-sm shadow-xl">
      <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-success" />
      <span className="flex-1">{message}</span>
      <button type="button" onClick={() => setVisible(false)} aria-label="Cerrar aviso" className="text-muted hover:text-foreground">×</button>
    </div>
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
