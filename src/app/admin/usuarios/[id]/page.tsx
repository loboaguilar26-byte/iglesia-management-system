import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/status-badge";
import { can } from "@/lib/authz";
import { formatDate } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { requirePageActor } from "@/lib/session";
import { getUser } from "@/modules/users/service";
import { ActiveForm, RolesForm } from "./user-forms";

export const metadata: Metadata = { title: "Usuario" };

export default async function UserDetailPage({ params, searchParams }: PageProps<"/admin/usuarios/[id]">) {
  const actor = await requirePageActor();
  if (!can(actor, "users:read")) notFound();
  const { id } = await params;
  const created = (await searchParams).creado === "1";
  const user = await getUser(actor, id).catch((e) => {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  });
  const isSelf = user.id === actor.userId;

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <Link href="/admin/usuarios" className="text-sm text-primary hover:underline">← Usuarios</Link>
      {created ? <Alert tone="success">Usuario creado correctamente.</Alert> : null}
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{user.name}</h1>
          <StatusBadge active={user.isActive} />
        </div>
        <p className="mt-1 break-all text-sm text-muted">
          {user.email} · alta {formatDate(user.createdAt)}
        </p>
      </div>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 font-medium">Roles</h2>
        {isSelf ? (
          <p className="text-sm text-muted">
            {user.roles.map((r) => r.name).join(", ") || "Sin roles"}. Por seguridad no puedes modificar tus propios
            roles; pídelo a otro administrador.
          </p>
        ) : can(actor, "roles:assign") ? (
          <RolesForm userId={user.id} roles={user.roles.map((r) => r.key)} />
        ) : (
          <p className="text-sm">{user.roles.map((r) => r.name).join(", ") || "Sin roles"}</p>
        )}
      </section>

      {!isSelf && can(actor, "users:deactivate") ? (
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-2 font-medium">Estado de la cuenta</h2>
          <p className="mb-4 text-sm text-muted">
            Desactivar no elimina al usuario; conserva su historial y le impide iniciar sesión.
          </p>
          <ActiveForm userId={user.id} isActive={user.isActive} />
        </section>
      ) : null}
    </div>
  );
}
