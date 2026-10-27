import { ShieldCheck } from "lucide-react";
import { ROLE_HIERARCHY } from "@/lib/permissions";

export function RoleHierarchy() {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-2 text-primary"><ShieldCheck aria-hidden className="size-5" /></div>
        <div>
          <h2 className="text-lg font-semibold">Jerarquía de roles</h2>
          <p className="mt-1 text-sm text-muted">La prioridad orienta la administración; los permisos efectivos siguen siendo la suma de cada rol asignado.</p>
        </div>
      </div>
      <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {ROLE_HIERARCHY.map((role, index) => (
          <li key={role.key} className="rounded-xl border border-border bg-background/60 p-3">
            <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold uppercase tracking-wider text-muted">Nivel {role.level}</span><span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{index + 1}</span></div>
            <p className="mt-3 font-semibold">{role.name}</p>
            <p className="mt-1 text-xs leading-5 text-muted">{role.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
