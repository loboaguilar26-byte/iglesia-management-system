import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buttonClass } from "@/components/ui/button";
import { Badge, EmptyState, PageHeader } from "@/components/ui/layout";
import { Pagination } from "@/components/ui/pagination";
import { can } from "@/lib/authz";
import { formatDateTime } from "@/lib/dates";
import { requirePageActor } from "@/lib/session";
import { ENTITY_LABEL, describeAction, listAudit } from "@/modules/audit/service";
import { getChurchTimezone } from "@/modules/settings/service";

export const metadata: Metadata = { title: "Bitácora" };

function summarize(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const m = metadata as Record<string, unknown>;
  if (Array.isArray(m.changed) && m.changed.length) return `Campos: ${m.changed.join(", ")}`;
  if (typeof m.reason === "string") return `Motivo: ${m.reason}`;
  if (Array.isArray(m.after)) return `Roles: ${(m.before as string[] | undefined)?.join(", ") || "—"} → ${m.after.join(", ") || "—"}`;
  if (typeof m.name === "string") return m.name;
  if (typeof m.title === "string") return m.title;
  if (typeof m.format === "string") return `Formato ${String(m.format).toUpperCase()}`;
  return null;
}

export default async function AuditPage({ searchParams }: PageProps<"/admin/bitacora">) {
  const actor = await requirePageActor();
  if (!can(actor, "audit:read") && !can(actor, "audit:read_finance")) notFound();
  const sp = await searchParams;
  const entidad = typeof sp.entidad === "string" ? sp.entidad : "";
  const [{ data, meta, entities }, tz] = await Promise.all([listAudit(actor, { page: sp.page, entidad: entidad || undefined }), getChurchTimezone()]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Bitácora de auditoría" description="Registro inalterable de operaciones sensibles: quién hizo qué y cuándo. No incluye contraseñas ni tokens." />
      <form className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          Tipo de registro
          <select name="entidad" defaultValue={entidad} className="min-h-10 rounded-lg border border-border bg-surface px-3">
            <option value="">Todos</option>
            {entities.map((e) => <option key={e} value={e}>{ENTITY_LABEL[e]}</option>)}
          </select>
        </label>
        <button className={buttonClass("secondary")} type="submit">Filtrar</button>
      </form>
      {data.length === 0 ? (
        <EmptyState title="Sin registros" />
      ) : (
        <ol className="relative flex flex-col gap-3 border-l-2 border-border pl-6">
          {data.map((r) => {
            const detail = summarize(r.metadata);
            const denied = r.action.includes("denied");
            return (
              <li key={r.id} className="relative rounded-xl border border-border bg-surface p-4 shadow-sm">
                <span aria-hidden className={`absolute -left-[31px] top-5 size-3 rounded-full ring-4 ring-background ${denied ? "bg-danger" : "bg-accent"}`} />
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{r.actor?.name ?? "Sistema"}</span>
                  <span className={denied ? "text-danger" : "text-muted"}>{describeAction(r.action)}</span>
                  <Badge tone="info">{ENTITY_LABEL[r.entityType] ?? r.entityType}</Badge>
                  <span className="ml-auto text-xs text-muted">{formatDateTime(r.createdAt, tz)}</span>
                </div>
                {detail ? <p className="mt-1 text-sm text-muted">{detail}</p> : null}
              </li>
            );
          })}
        </ol>
      )}
      <Pagination {...meta} hrefFor={(p) => `/admin/bitacora?${new URLSearchParams({ ...(entidad ? { entidad } : {}), page: String(p) })}`} />
    </div>
  );
}
