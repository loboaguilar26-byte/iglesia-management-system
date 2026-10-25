import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui/layout";
import { can } from "@/lib/authz";
import { requirePageActor } from "@/lib/session";
import { createMemberAction } from "../actions";
import { MemberForm } from "../member-form";

export const metadata: Metadata = { title: "Registrar persona" };

export default async function NewMemberPage() {
  const actor = await requirePageActor();
  if (!can(actor, "members:create")) notFound();
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader title="Registrar persona" back={{ href: "/admin/miembros", label: "Miembros" }} description="Registra solo los datos necesarios. Correo y teléfono son opcionales." />
      <Card>
        <MemberForm action={createMemberAction} canNotes={can(actor, "members:read_notes")} canStatus={can(actor, "members:deactivate")} submitLabel="Registrar" />
      </Card>
    </div>
  );
}
