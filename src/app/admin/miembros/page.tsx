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
import { listMembers, memberStatusCounts } from "@/modules/members/service";
import { statusTone } from "./status-tone";

export const metadata: Metadata = { title: "Miembros" };


export default async function MembersPage({ searchParams }: PageProps<"/admin/miembros">) {
  const actor = await requirePageActor();
  if (!can(actor, "members:read")) notFound();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const status = typeof sp.estado === "string" ? sp.estado : "";
  const [{ data, meta }, counts] = await Promise.all([listMembers(actor, { q, status, page: sp.page }), memberStatusCounts(actor)]);
  const hrefFor = (p: number) => `/admin/miembros?${new URLSearchParams({ q, estado: status, page: String(p) })}`;
  const tabs = [
    { value: "", label: "Todos", count: counts.total },
    { value: "ACTIVE", label: "Activos", count: counts.ACTIVE },
    { value: "VISITOR", label: "Visitantes", count: counts.VISITOR },
    { value: "INACTIVE", label: "Inactivos", count: counts.INACTIVE },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Miembros"
        description="Directorio de la congregación. Solo personal autorizado lo consulta; nunca se publica."
        actions={can(actor, "members:create") ? <Link href="/admin/miembros/nuevo" className={buttonClass()}>Registrar persona</Link> : null}
      />
      <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t.value}
            href={`/admin/miembros?${new URLSearchParams({ ...(q ? { q } : {}), ...(t.value ? { estado: t.value } : {}) })}`}
            aria-current={status === t.value ? "page" : undefined}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${status === t.value ? "bg-primary text-primary-foreground shadow-sm" : "border border-border bg-surface hover:bg-surface-2"}`}
          >
            {t.label}
            <span className={`rounded-full px-2 text-xs tabular-nums ${status === t.value ? "bg-white/20" : "bg-surface-2 text-muted"}`}>{t.count}</span>
          </Link>
        ))}
      </nav>
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
                <Link href={`/admin/miembros/${m.id}`} className="inline-flex items-center gap-3 font-medium hover:text-primary">
                  <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
                    {`${m.firstName.charAt(0)}${m.lastName.charAt(0)}`.toUpperCase()}
                  </span>
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
