"use client";

import { useActionState, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/action-state";

type Row = { id: string; name: string; isVisitor: boolean; status: "PRESENT" | "ABSENT" | null };

export function AttendanceSheet({ rows, visitorCount, action, canRecord }: {
  rows: Row[];
  visitorCount: number;
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  canRecord: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [marks, setMarks] = useState<Record<string, string>>(() => Object.fromEntries(rows.map((r) => [r.id, r.status ?? ""])));
  const [filter, setFilter] = useState("");
  const visible = useMemo(() => {
    const f = filter.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
    return rows.filter((r) => r.name.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().includes(f));
  }, [rows, filter]);
  const counts = Object.values(marks).reduce((acc, v) => ({ ...acc, [v || "pending"]: (acc[v || "pending"] ?? 0) + 1 }), {} as Record<string, number>);

  const setAll = (value: string) => setMarks((m) => ({ ...m, ...Object.fromEntries(visible.filter((r) => !m[r.id]).map((r) => [r.id, value])) }));

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.message ? <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert> : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-success/15 px-3 py-1 text-success">Presentes: {counts.PRESENT ?? 0}</span>
          <span className="rounded-full bg-danger/15 px-3 py-1 text-danger">Ausentes: {counts.ABSENT ?? 0}</span>
          <span className="rounded-full bg-muted/15 px-3 py-1 text-muted">Pendientes: {counts.pending ?? 0}</span>
        </div>
        <label className="flex items-center gap-2 text-sm">
          Visitantes sin ficha
          <input type="number" name="visitorCount" min={0} defaultValue={visitorCount} disabled={!canRecord} className="min-h-10 w-24 rounded-lg border border-border bg-surface px-3" />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="filtro" className="sr-only">Filtrar por nombre</label>
        <input id="filtro" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filtrar por nombre" className="min-h-10 w-full max-w-xs rounded-lg border border-border bg-surface px-3" />
        {canRecord ? (
          <>
            <Button size="sm" variant="secondary" onClick={() => setAll("PRESENT")}>Pendientes → presentes</Button>
            <Button size="sm" variant="secondary" onClick={() => setAll("ABSENT")}>Pendientes → ausentes</Button>
          </>
        ) : null}
      </div>
      {rows.length === 0 ? <p className="text-sm text-muted">No hay personas para este evento.</p> : null}
      <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
        {rows.map((r) => {
          const hidden = !visible.includes(r);
          return (
            <li key={r.id} className={`flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 ${hidden ? "hidden" : ""}`}>
              <input type="hidden" name="memberId" value={r.id} />
              <span className="text-sm">
                {r.name} {r.isVisitor ? <span className="text-xs text-accent">(visitante)</span> : null}
              </span>
              <fieldset className="flex gap-1" disabled={!canRecord}>
                <legend className="sr-only">Asistencia de {r.name}</legend>
                {[
                  { v: "PRESENT", label: "Presente", on: "bg-success text-white" },
                  { v: "ABSENT", label: "Ausente", on: "bg-danger text-white" },
                  { v: "", label: "Pendiente", on: "bg-muted text-white" },
                ].map((o) => (
                  <label key={o.v} className={`cursor-pointer rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition has-focus-visible:outline-2 has-focus-visible:outline-accent ${marks[r.id] === o.v ? o.on : "bg-surface hover:bg-surface-2"}`}>
                    <input type="radio" className="sr-only" name={`att_${r.id}`} value={o.v} checked={marks[r.id] === o.v} onChange={() => setMarks((m) => ({ ...m, [r.id]: o.v }))} />
                    {o.label}
                  </label>
                ))}
              </fieldset>
            </li>
          );
        })}
      </ul>
      {canRecord ? (
        <div className="sticky bottom-20 flex justify-end lg:bottom-4">
          <Button type="submit" disabled={pending} size="lg" className="shadow-lg">{pending ? "Guardando…" : "Guardar asistencia"}</Button>
        </div>
      ) : null}
    </form>
  );
}
