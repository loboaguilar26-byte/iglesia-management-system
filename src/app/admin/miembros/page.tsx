import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClass } from "@/components/ui/button";
import { Badge, EmptyState, PageHeader, ResponsiveTable } from "@/components/ui/layout";
import { Pagination } from "@/components/ui/pagination";
import { can } from "@/lib/authz";
import { formatDateOnly } from "@/lib/dates";
import { requirePageActor } from "@/lib/session";
import { MEMBER_STATUSES, MEMBER_STATUS_LABEL } from "@/modules/members/schema";
import { listMembers } from "@/modules/members/service";
import { statusTone } from "./status-tone";

export const metadata: Metadata = { title: "Miembros" };


export default async function MembersPage({ searchParams }: PageProps<"/admin/miembros">) {
  const actor = await requirePageActor();
  if (!can(actor, "members:read")) notFound();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const status = typeof sp.estado === "string" ? sp.estado : "";
  const { data, meta } = await listMembers(actor, { q, status, page: sp.page });
  const hrefFor = (p: number) => `/admin/miembros?${new URLSearchParams({ q, estado: status, page: String(p) })}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Miembros"
        description="Directorio de la congregación. Solo personal autorizado lo consulta; nunca se publica."
        actions={can(actor, "members:create") ? <Link href="/admin/miembros/nuevo" className={buttonClass()}>Registrar persona</Link> : null}
      />
      <form role="search" className="flex flex-wrap gap-2">
        <label htmlFor="q" className="sr-only">Buscar por nombre</label>
        <input id="q" name="q" defaultValue={q} placeholder="Buscar por nombre (sin importar acentos)" className="min-h-10 w-full max-w-sm flex-1 rounded-lg border border-border bg-surface px-3" />
        <label htmlFor="estado" className="sr-only">Estado</label>
        <select id="estado" name="estado" defaultValue={status} className="min-h-10 rounded-lg border border-border bg-surface px-3">
          <option value="">Todos los estados</option>
          {MEMBER_STATUSES.map((s) => <option key={s} value={s}>{MEMBER_STATUS_LABEL[s]}</option>)}
        </select>
        <button className={buttonClass("secondary")} type="submit">Filtrar</button>
      </form>
      {data.length === 0 ? (
        <EmptyState title={q || status ? "Sin resultados" : "Aún no hay personas registradas"} description={q || status ? "Prueba con otro nombre o estado." : "Registra a los miembros y visitantes de la congregación."} />
      ) : (
        <ResponsiveTable
          rows={data}
          rowKey={(m) => m.id}
          caption="Miembros"
          columns={[
            {
              header: "Nombre",
              cell: (m) => (
                <Link href={`/admin/miembros/${m.id}`} className="font-medium text-primary hover:underline">
                  {m.lastName}, {m.firstName}
                  {m.isMinor ? <span className="ml-2 text-xs text-muted">(menor)</span> : null}
                </Link>
              ),
            },
            { header: "Estado", cell: (m) => <Badge tone={statusTone[m.status]}>{MEMBER_STATUS_LABEL[m.status]}</Badge> },
            { header: "Contacto", cell: (m) => <span className="text-muted">{[m.phone, m.email].filter(Boolean).join(" · ") || "—"}</span> },
            { header: "Ministerios", cell: (m) => m.ministryMemberships.map((x) => x.ministry.name).join(", ") || "—" },
            { header: "Ingreso", cell: (m) => (m.joinDate ? formatDateOnly(m.joinDate) : "—") },
          ]}
        />
      )}
      <Pagination {...meta} hrefFor={hrefFor} />
    </div>
  );
}
