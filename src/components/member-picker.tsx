"use client";

import { X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useFieldState } from "./ui/action-form";

type Option = { id: string; name: string };

/**
 * Selector de personas con búsqueda (consulta /api/v1/members/lookup).
 * Envía los ids seleccionados en campos ocultos con el nombre `name`.
 */
export function MemberPicker({
  name,
  label,
  multiple = false,
  initial = [],
  hint,
  placeholder = "Escribe un nombre…",
}: {
  name: string;
  label: string;
  multiple?: boolean;
  initial?: Option[];
  hint?: string;
  placeholder?: string;
}) {
  const id = useId();
  const { errors } = useFieldState(name);
  const [selected, setSelected] = useState<Option[]>(initial);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Option[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/members/lookup?q=${encodeURIComponent(query)}`, { signal: ctrl.signal });
        if (res.ok) setResults((await res.json()).data);
      } catch {
        /* búsqueda cancelada */
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, open]);

  function pick(option: Option) {
    setSelected((prev) => (multiple ? (prev.some((p) => p.id === option.id) ? prev : [...prev, option]) : [option]));
    setQuery("");
    setOpen(false);
  }

  const available = results.filter((r) => !selected.some((s) => s.id === r.id));

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      {selected.map((s) => (
        <input key={s.id} type="hidden" name={name} value={s.id} />
      ))}
      {selected.length ? (
        <ul className="flex flex-wrap gap-2">
          {selected.map((s) => (
            <li key={s.id} className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-3 py-1 text-sm">
              {s.name}
              <button type="button" onClick={() => setSelected((p) => p.filter((x) => x.id !== s.id))} aria-label={`Quitar a ${s.name}`} className="rounded-full p-0.5 hover:bg-black/10">
                <X aria-hidden className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {multiple || selected.length === 0 ? (
        <div className="relative">
          <input
            id={id}
            role="combobox"
            aria-expanded={open && available.length > 0}
            aria-controls={`${id}-list`}
            aria-autocomplete="list"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={placeholder}
            className="min-h-10 w-full rounded-lg border border-border bg-surface px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
          {open && available.length > 0 ? (
            <ul id={`${id}-list`} role="listbox" className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-surface py-1 shadow-lg">
              {available.map((r) => (
                <li key={r.id} role="option" aria-selected={false}>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(r)} className="w-full px-3 py-2 text-left text-sm hover:bg-surface-2">
                    {r.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
      {errors?.length ? <p className="text-sm text-danger">{errors.join(" ")}</p> : null}
    </div>
  );
}
