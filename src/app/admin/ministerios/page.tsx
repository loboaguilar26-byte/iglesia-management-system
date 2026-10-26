import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { CheckboxField, Field, TextArea } from "@/components/ui/field";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/layout";
import { can } from "@/lib/authz";
import { requirePageActor } from "@/lib/session";
import { listMinistries } from "@/modules/ministries/service";
import { createMinistryAction } from "./actions";

export const metadata: Metadata = { title: "Ministerios" };

export default async function MinistriesPage() {
  const actor = await requirePageActor();
  if (!can(actor, "ministries:read")) notFound();
  const ministries = await listMinistries(actor);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Ministerios" description="Grupos de servicio de la iglesia, sus coordinadores e integrantes. Los nombres se configuran libremente." />
      {ministries.length === 0 ? (
        <EmptyState title="Sin ministerios" description={can(actor, "ministries:create") ? "Crea el primero abajo (p. ej. Alabanza, Jóvenes, Niños, Enseñanza, Servicio)." : "No coordinas ministerios todavía."} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {ministries.map((m) => {
            const coordinators = m.memberships.filter((x) => x.role === "COORDINATOR");
            return (
              <li key={m.id}>
                <Link href={`/admin/ministerios/${m.id}`} className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-display text-xl font-semibold">{m.name}</h2>
                    <span className="flex gap-1">{m.isPublic ? <Badge tone="success">Público</Badge> : null}{m.isActive ? null : <Badge>Inactivo</Badge>}</span>
                  </div>
                  {m.description ? <p className="line-clamp-2 text-sm text-muted">{m.description}</p> : null}
                  <div className="mt-auto flex flex-wrap gap-2 text-xs">
                    <Badge tone="info">{m.memberships.length} integrantes</Badge>
                    <Badge tone="accent">{coordinators.length ? `Coordina: ${coordinators.map((c) => c.member.firstName).join(", ")}` : "Sin coordinador"}</Badge>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {can(actor, "ministries:create") ? (
        <Card title="Nuevo ministerio" className="max-w-2xl">
          <ActionForm action={createMinistryAction}>
            <Field label="Nombre" name="name" required placeholder="Alabanza y música" />
            <TextArea label="Descripción" name="description" rows={3} />
            <CheckboxField label="Mostrar en el sitio público" name="isPublic" hint="Solo se publican el nombre y la descripción, nunca los integrantes." />
            <SubmitButton>Crear ministerio</SubmitButton>
          </ActionForm>
        </Card>
      ) : null}
    </div>
  );
}
