import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/ui/action-button";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field } from "@/components/ui/field";
import { Badge, Card, PageHeader } from "@/components/ui/layout";
import { can } from "@/lib/authz";
import { requirePageActor } from "@/lib/session";
import { financeCatalogs } from "@/modules/finance/service";
import { addCatalogAction, toggleCatalogAction } from "../actions";

export const metadata: Metadata = { title: "Conceptos y métodos" };

export default async function CatalogsPage() {
  const actor = await requirePageActor();
  if (!can(actor, "finance:configure")) notFound();
  const { concepts, methods } = await financeCatalogs(actor);
  const sections = [
    { kind: "concept" as const, title: "Conceptos de aportación", items: concepts, placeholder: "Diezmo, Ofrenda, Misiones…" },
    { kind: "method" as const, title: "Métodos de recepción", items: methods, placeholder: "Efectivo, Transferencia…" },
  ];
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <PageHeader title="Conceptos y métodos" back={{ href: "/admin/tesoreria", label: "Tesorería" }} description="Desactivar un elemento lo oculta en nuevos registros sin afectar el historial." />
      <div className="grid gap-6 md:grid-cols-2">
        {sections.map((s) => (
          <Card key={s.kind} title={s.title}>
            <ul className="mb-4 flex flex-col divide-y divide-border">
              {s.items.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className={i.isActive ? "" : "text-muted line-through"}>{i.name}</span>
                  <span className="flex items-center gap-2">
                    {i.isActive ? null : <Badge>Inactivo</Badge>}
                    <ActionButton action={toggleCatalogAction.bind(null, s.kind, i.id, !i.isActive)} variant="ghost">{i.isActive ? "Desactivar" : "Activar"}</ActionButton>
                  </span>
                </li>
              ))}
            </ul>
            <ActionForm action={addCatalogAction.bind(null, s.kind)} className="flex items-end gap-2" showSuccess={false}>
              <div className="flex-1"><Field label="Nuevo" name="name" placeholder={s.placeholder} /></div>
              <SubmitButton>Agregar</SubmitButton>
            </ActionForm>
          </Card>
        ))}
      </div>
    </div>
  );
}
