"use client";

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useFieldState } from "./action-form";

const control =
  "w-full rounded-lg border border-border bg-surface px-3 text-base text-foreground outline-none transition placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/25 aria-invalid:border-danger disabled:opacity-60";

type Common = { label: string; name: string; errors?: string[]; hint?: ReactNode; className?: string };

function Wrapper({ id, label, hint, errors, children, required }: {
  id: string;
  label: string;
  hint?: ReactNode;
  errors?: string[];
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required ? <span className="text-danger" aria-hidden> *</span> : null}
      </label>
      {children}
      {hint ? <p id={`${id}-hint`} className="text-xs text-muted">{hint}</p> : null}
      {errors?.length ? <p id={`${id}-error`} className="text-sm text-danger">{errors.join(" ")}</p> : null}
    </div>
  );
}

function useField(name: string, id: string | undefined, errors: string[] | undefined, hint: ReactNode) {
  const ctx = useFieldState(name);
  const allErrors = errors ?? ctx.errors;
  const inputId = id ?? `field-${name}`;
  const describedBy = [hint ? `${inputId}-hint` : null, allErrors?.length ? `${inputId}-error` : null].filter(Boolean).join(" ");
  return {
    inputId,
    errors: allErrors,
    lastValue: ctx.value,
    aria: { "aria-invalid": allErrors?.length ? true : undefined, "aria-describedby": describedBy || undefined },
  };
}

/** Campo de texto accesible. Toma los errores del ActionForm que lo contiene, si existe. */
export function Field({ label, name, errors, hint, id, className = "", defaultValue, ...props }: Common & InputHTMLAttributes<HTMLInputElement>) {
  const f = useField(name, id, errors, hint);
  return (
    <Wrapper id={f.inputId} label={label} hint={hint} errors={f.errors} required={props.required}>
      <input
        id={f.inputId}
        name={name}
        defaultValue={f.lastValue ?? defaultValue}
        className={`min-h-10 ${control} ${className}`}
        {...f.aria}
        {...props}
      />
    </Wrapper>
  );
}

export function TextArea({ label, name, errors, hint, id, className = "", defaultValue, rows = 4, ...props }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const f = useField(name, id, errors, hint);
  return (
    <Wrapper id={f.inputId} label={label} hint={hint} errors={f.errors} required={props.required}>
      <textarea
        id={f.inputId}
        name={name}
        rows={rows}
        defaultValue={f.lastValue ?? defaultValue}
        className={`py-2 ${control} ${className}`}
        {...f.aria}
        {...props}
      />
    </Wrapper>
  );
}

export function SelectField({
  label,
  name,
  errors,
  hint,
  id,
  className = "",
  defaultValue,
  options,
  placeholder,
  ...props
}: Common & SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[]; placeholder?: string }) {
  const f = useField(name, id, errors, hint);
  return (
    <Wrapper id={f.inputId} label={label} hint={hint} errors={f.errors} required={props.required}>
      <select
        id={f.inputId}
        name={name}
        defaultValue={f.lastValue ?? defaultValue ?? ""}
        className={`min-h-10 ${control} ${className}`}
        {...f.aria}
        {...props}
      >
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Wrapper>
  );
}

export function CheckboxField({ label, name, hint, defaultChecked, value = "on" }: {
  label: string;
  name: string;
  hint?: ReactNode;
  defaultChecked?: boolean;
  value?: string;
}) {
  return (
    <label className="flex items-start gap-3 text-sm">
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} className="mt-0.5 size-4 accent-[var(--primary)]" />
      <span>
        <span className="font-medium">{label}</span>
        {hint ? <span className="block text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}
