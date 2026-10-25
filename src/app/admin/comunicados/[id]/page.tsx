import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/ui/action-button";
import { Badge, Card, PageHeader } from "@/components/ui/layout";
import { can, canFully } from "@/lib/authz";
import { formatDateTime, toDateInput } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { requirePageActor } from "@/lib/session";
import { ANNOUNCEMENT_STATUS_LABEL, getAnnouncement } from "@/modules/announcements/service";
import { getChurchTimezone } from "@/modules/settings/service";
import { setAnnouncementStatusAction, updateAnnouncementAction } from "../actions";
import { AnnouncementForm } from "../announcement-form";

export const metadata: Metadata = { title: "Comunicado" };

export default async function AnnouncementPage({ params }: PageProps<"/admin/comunicados/[id]">) {
  const actor = await requirePageActor();
  const { id } = await params;
  const a = await getAnnouncement(actor, id).catch((e) => {
    if (e instanceof AppError && (e.code === "NOT_FOUND" || e.code === "FORBIDDEN")) notFound();
    throw e;
  });
  const tz = await getChurchTimezone();
  const canEdit = can(actor, "announcements:update") && (canFully(actor, "announcements:update") || a.authorId === actor.userId) && a.status !== "ARCHIVED";

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader
        title={a.title}
        back={{ href: "/admin/comunicados", label: "Comunicados" }}
        description={<span className="flex flex-wrap items-center gap-2"><Badge tone={a.status === "PUBLISHED" ? "success" : a.status === "DRAFT" ? "warning" : "neutral"}>{ANNOUNCEMENT_STATUS_LABEL[a.status]}</Badge>{a.author.name}{a.publishedAt ? ` · publicado ${formatDateTime(a.publishedAt, tz)}` : ""}</span>}
        actions={
          <>
            {a.status === "DRAFT" && can(actor, "announcements:publish") ? <ActionButton action={setAnnouncementStatusAction.bind(null, a.id, "PUBLISHED")} variant="primary">Publicar</ActionButton> : null}
            {a.status !== "ARCHIVED" && can(actor, "announcements:archive") ? <ActionButton action={setAnnouncementStatusAction.bind(null, a.id, "ARCHIVED")} confirmMessage="¿Archivar este comunicado? Dejará de mostrarse." variant="secondary">Archivar</ActionButton> : null}
            {a.status === "ARCHIVED" && can(actor, "announcements:publish") ? <ActionButton action={setAnnouncementStatusAction.bind(null, a.id, "PUBLISHED")}>Restaurar</ActionButton> : null}
          </>
        }
      />
      <Card>
        {canEdit ? (
          <AnnouncementForm
            action={updateAnnouncementAction.bind(null, a.id)}
            values={{ title: a.title, body: a.body, visibility: a.visibility, isFeatured: a.isFeatured, expiresOn: a.expiresAt ? toDateInput(a.expiresAt, tz) : "" }}
            canPublish={can(actor, "announcements:publish")}
            alreadyPublished={a.status === "PUBLISHED"}
            submitLabel="Guardar cambios"
          />
        ) : (
          <p className="whitespace-pre-line">{a.body}</p>
        )}
      </Card>
    </div>
  );
}
