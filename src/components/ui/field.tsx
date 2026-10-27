import type { InputHTMLAttributes, ReactNode } from "react";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  errors?: string[];
  hint?: ReactNode;
};

/** Campo de formulario accesible: etiqueta, ayuda y errores enlazados por aria-describedby. */
export function Field({ label, name, errors, hint, id, className = "", ...props }: FieldProps) {
  const inputId = id ?? `field-${name}`;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy = [hint ? hintId : null, errors?.length ? errorId : null].filter(Boolean).join(" ");
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={`min-h-11 rounded-lg border border-border bg-surface px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30 aria-invalid:border-danger ${className}`}
        {...props}
      />
      {hint ? (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {errors?.length ? (
        <p id={errorId} className="text-sm text-danger">
          {errors.join(" ")}
        </p>
      ) : null}
    </div>
  );
}
