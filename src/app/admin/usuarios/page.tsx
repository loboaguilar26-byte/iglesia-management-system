import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClass } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { can } from "@/lib/authz";
import { formatDate } from "@/lib/dates";
import { requirePageActor } from "@/lib/session";
import { listUsers } from "@/modules/users/service";

export const metadata: Metadata = { title: "Usuarios y roles" };

export default async function UsersPage({ searchParams }: PageProps<"/admin/usuarios">) {
  const actor = await requirePageActor();
  if (!can(actor, "users:read")) notFound();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const page = typeof sp.page === "string" ? sp.page : "1";
  const { data, meta } = await listUsers(actor, { q, page });

  const hrefFor = (p: number) => `/admin/usuarios?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Usuarios y roles</h1>
        {can(actor, "users:create") && can(actor, "roles:assign") ? (
          <Link href="/admin/usuarios/nuevo" className={buttonClass()}>
            Nuevo usuario
          </Link>
        ) : null}
      </div>

      <form role="search" className="flex gap-2">
        <label htmlFor="q" className="sr-only">
          Buscar por nombre o correo
        </label>
        <input
          id="q"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre o correo"
          className="min-h-10 w-full max-w-sm rounded-md border border-border bg-surface px-3"
        />
        <button className={buttonClass("secondary")} type="submit">
          Buscar
        </button>
      </form>

      {data.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
          {q ? "Ningún usuario coincide con la búsqueda." : "Aún no hay usuarios."}
        </p>
      ) : (
        <>
          {/* Escritorio: tabla */}
          <div className="hidden overflow-hidden rounded-xl border border-border bg-surface md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-background text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Nombre</th>
                  <th scope="col" className="px-4 py-3 font-medium">Correo</th>
                  <th scope="col" className="px-4 py-3 font-medium">Roles</th>
                  <th scope="col" className="px-4 py-3 font-medium">Estado</th>
                  <th scope="col" className="px-4 py-3 font-medium">Alta</th>
                </tr>
              </thead>
              <tbody>
                {data.map((u) => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <Link href={`/admin/usuarios/${u.id}`} className="font-medium text-primary hover:underline">
                        {u.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3">{u.roles.map((r) => r.name).join(", ") || "—"}</td>
                    <td className="px-4 py-3"><StatusBadge active={u.isActive} /></td>
                    <td className="px-4 py-3">{formatDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Móvil: tarjetas */}
          <ul className="flex flex-col gap-3 md:hidden">
            {data.map((u) => (
              <li key={u.id}>
                <Link href={`/admin/usuarios/${u.id}`} className="block rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{u.name}</span>
                    <StatusBadge active={u.isActive} />
                  </div>
                  <p className="mt-1 break-all text-sm text-muted">{u.email}</p>
                  <p className="mt-1 text-sm">{u.roles.map((r) => r.name).join(", ") || "Sin roles"}</p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      <Pagination {...meta} hrefFor={hrefFor} />
    </div>
  );
}
