import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui/layout";
import { can } from "@/lib/authz";
import { requirePageActor } from "@/lib/session";
import { managerUserOptions } from "@/modules/chapels/service";
import { createChapelAction } from "../actions";
import { ChapelForm } from "../chapel-form";

export const metadata: Metadata = { title: "Nueva capilla" };

export default async function NewChapelPage() {
  const actor = await requirePageActor();
  if (!can(actor, "chapels:manage")) notFound();
  const users = await managerUserOptions(actor);
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader title="Dar de alta una capilla" back={{ href: "/admin/capillas", label: "Capillas" }} description="Después podrás asignarle personas, ministerios, eventos y aportaciones." />
      <Card>
        <ChapelForm action={createChapelAction} users={users} submitLabel="Dar de alta" />
      </Card>
    </div>
  );
}
