import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, GitBranch, Palette, UsersRound } from "lucide-react";
import { can } from "@/lib/authz";
import { formatDate } from "@/lib/dates";
import { requirePageActor } from "@/lib/session";
import { listChurches, listFranchises } from "@/modules/churches/service";
import { CreateChurchForm } from "./create-church-form";

export const metadata: Metadata = { title: "Iglesias y franquicias" };

export default async function ChurchesPage() {
  const actor = await requirePageActor();
  if (!can(actor, "churches:read")) notFound();
  const [franchises, churches] = await Promise.all([listFranchises(actor), listChurches(actor)]);

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Estructura de franquicia</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Iglesias y franquicias</h1>
        <p className="mt-2 max-w-2xl text-muted">Organiza varias iglesias con la misma plataforma y conserva la identidad, los datos y los permisos de cada sede.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard icon={<GitBranch aria-hidden />} label="Franquicias activas" value={String(franchises.length)} />
        <SummaryCard icon={<Building2 aria-hidden />} label="Iglesias registradas" value={String(churches.length)} />
        <SummaryCard icon={<Palette aria-hidden />} label="Identidad por sede" value="Lista" />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        {can(actor, "churches:create") ? (
          <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-start gap-3">
              <div className="rounded-xl bg-primary/10 p-2 text-primary"><Building2 aria-hidden className="size-5" /></div>
              <div><h2 className="text-lg font-semibold">Agregar una iglesia</h2><p className="mt-1 text-sm text-muted">Crea una sede nueva dentro de una franquicia existente o inicia una nueva.</p></div>
            </div>
            <CreateChurchForm franchises={franchises} />
          </section>
        ) : null}

        <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-start gap-3">
            <div className="rounded-xl bg-accent/10 p-2 text-accent"><GitBranch aria-hidden className="size-5" /></div>
            <div><h2 className="text-lg font-semibold">Sedes configuradas</h2><p className="mt-1 text-sm text-muted">La información se prepara para poder separar datos y permisos por iglesia.</p></div>
          </div>
          {churches.length ? (
            <ul className="grid gap-3">
              {churches.map((church) => (
                <li key={church.id} className="rounded-xl border border-border p-4 transition hover:border-primary/40 hover:shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{church.name}</p>
                      <p className="mt-1 text-sm text-muted">{church.franchise.name} · <code className="text-xs">{church.slug}</code></p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success"><UsersRound aria-hidden className="size-3.5" /> Activa</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted">
                    <span className="rounded-full border border-border px-2.5 py-1">Color propio</span>
                    <span className="rounded-full border border-border px-2.5 py-1">{church.profile?.currency ?? "MXN"}</span>
                    <span className="rounded-full border border-border px-2.5 py-1">Creada {formatDate(church.createdAt)}</span>
                    {can(actor, "churches:update") ? <Link href={`/admin/iglesias/${church.id}`} className="rounded-full border border-primary/30 px-2.5 py-1 text-primary hover:bg-primary/10">Editar configuración</Link> : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">Todavía no hay iglesias registradas. Agrega la primera para comenzar la estructura de franquicia.</div>
          )}
        </section>
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm"><div className="flex items-center gap-2 text-primary">{icon}<span className="text-sm text-muted">{label}</span></div><p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p></div>;
}
