import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClass } from "@/components/ui/button";
import { Badge, EmptyState, PageHeader } from "@/components/ui/layout";
import { can } from "@/lib/authz";
import { formatDate } from "@/lib/dates";
import { requirePageActor } from "@/lib/session";
import { ANNOUNCEMENT_STATUS_LABEL, listAnnouncements } from "@/modules/announcements/service";
import { getChurchTimezone } from "@/modules/settings/service";

export const metadata: Metadata = { title: "Comunicados" };

export default async function AnnouncementsPage({ searchParams }: PageProps<"/admin/comunicados">) {
  const actor = await requirePageActor();
  if (!can(actor, "announcements:read")) notFound();
  const archived = (await searchParams).archivados === "1";
  const [items, tz] = await Promise.all([listAnnouncements(actor, archived ? "ARCHIVED" : undefined), getChurchTimezone()]);

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <PageHeader
        title="Comunicados"
        description="Avisos para la congregación. Los públicos aparecen en el sitio web; los internos solo en el panel."
        actions={
          <>
            <Link href={archived ? "/admin/comunicados" : "/admin/comunicados?archivados=1"} className={buttonClass("secondary")}>{archived ? "Ver vigentes" : "Ver archivados"}</Link>
            {can(actor, "announcements:create") ? <Link href="/admin/comunicados/nuevo" className={buttonClass()}>Nuevo comunicado</Link> : null}
          </>
        }
      />
      {items.length === 0 ? (
        <EmptyState title={archived ? "No hay comunicados archivados" : "No hay comunicados"} />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((a) => (
            <li key={a.id}>
              <Link href={`/admin/comunicados/${a.id}`} className={`block rounded-2xl border bg-surface p-5 shadow-sm lift ${a.isFeatured ? "border-accent" : "border-border"}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{a.title}</h2>
                  <Badge tone={a.status === "PUBLISHED" ? "success" : a.status === "DRAFT" ? "warning" : "neutral"}>{ANNOUNCEMENT_STATUS_LABEL[a.status]}</Badge>
                  <Badge tone={a.visibility === "PUBLIC" ? "info" : "neutral"}>{a.visibility === "PUBLIC" ? "Público" : "Interno"}</Badge>
                  {a.isFeatured ? <Badge tone="accent">Destacado</Badge> : null}
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-muted">{a.body}</p>
                <p className="mt-2 text-xs text-muted">
                  {a.author.name} · {a.publishedAt ? `publicado ${formatDate(a.publishedAt, tz)}` : `creado ${formatDate(a.createdAt, tz)}`}
                  {a.expiresAt ? ` · vigente hasta ${formatDate(a.expiresAt, tz)}` : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
