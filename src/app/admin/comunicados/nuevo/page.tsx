import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui/layout";
import { can } from "@/lib/authz";
import { requirePageActor } from "@/lib/session";
import { createAnnouncementAction } from "../actions";
import { AnnouncementForm } from "../announcement-form";

export const metadata: Metadata = { title: "Nuevo comunicado" };

export default async function NewAnnouncementPage() {
  const actor = await requirePageActor();
  if (!can(actor, "announcements:create")) notFound();
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader title="Nuevo comunicado" back={{ href: "/admin/comunicados", label: "Comunicados" }} />
      <Card>
        <AnnouncementForm action={createAnnouncementAction} canPublish={can(actor, "announcements:publish")} submitLabel="Guardar" />
      </Card>
    </div>
  );
}
