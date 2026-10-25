import Link from "next/link";
import { can } from "@/lib/authz";
import { ROLES } from "@/lib/permissions";
import { requirePageActor } from "@/lib/session";

export default async function AdminHomePage() {
  const actor = await requirePageActor();
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Bienvenido, {actor.name}</h1>
        <p className="mt-1 text-sm text-muted">
          Roles: {actor.roles.map((r) => ROLES[r].name).join(", ") || "sin roles asignados"}
        </p>
      </div>
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="font-medium">Estado del sistema</h2>
        <p className="mt-2 text-sm text-muted">
          Esta versión incluye el acceso seguro y la gestión de usuarios. Los módulos de miembros, asistencia,
          eventos, ministerios, tesorería, comunicados, reportes e indicadores se habilitarán en las siguientes
          fases.
        </p>
        {can(actor, "users:read") ? (
          <Link href="/admin/usuarios" className="mt-4 inline-block text-sm text-primary hover:underline">
            Ir a usuarios y roles →
          </Link>
        ) : null}
      </section>
    </div>
  );
}
