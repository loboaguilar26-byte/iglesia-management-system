import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Building2, ShieldCheck, Users } from "lucide-react";
import { can } from "@/lib/authz";
import { ROLES } from "@/lib/permissions";
import { requirePageActor } from "@/lib/session";

export default async function AdminHomePage() {
  const actor = await requirePageActor();
  return (
    <div className="flex max-w-6xl flex-col gap-7">
      <div className="rounded-2xl bg-primary px-6 py-7 text-primary-foreground shadow-lg sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-foreground/70">Resumen administrativo</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Bienvenido, {actor.name}</h1>
        <p className="mt-2 max-w-2xl text-sm text-primary-foreground/80">
          Tu panel conserva la operación actual y suma una estructura preparada para crecer a varias iglesias.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatusCard icon={<ShieldCheck aria-hidden />} label="Acceso seguro" value="Activo" detail="Sesión y permisos vigentes" />
        <StatusCard icon={<Users aria-hidden />} label="Tu jerarquía" value={actor.roles.map((r) => ROLES[r].name).join(" · ") || "Sin roles"} detail="Permisos efectivos de tu cuenta" />
        <StatusCard icon={<Building2 aria-hidden />} label="Estructura" value="Multiiglesia" detail="Franquicias y sedes listas" />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {can(actor, "churches:read") ? <ActionCard href="/admin/iglesias" icon={<Building2 aria-hidden />} title="Iglesias y franquicias" description="Registra sedes, agrúpalas y define una identidad visual por iglesia." /> : null}
        {can(actor, "users:read") ? <ActionCard href="/admin/usuarios" icon={<Users aria-hidden />} title="Usuarios y roles" description="Administra cuentas y revisa la jerarquía de responsabilidades." /> : null}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold">Lo que ya está funcionando</h2>
        <p className="mt-2 text-sm text-muted">La autenticación, usuarios, roles existentes y sus permisos se mantienen sin cambios. Las nuevas capacidades se agregan de forma incremental sobre esa base.</p>
      </section>
    </div>
  );
}

function StatusCard({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm"><div className="flex items-center gap-2 text-primary">{icon}<span className="text-sm text-muted">{label}</span></div><p className="mt-3 truncate text-lg font-semibold" title={value}>{value}</p><p className="mt-1 text-xs text-muted">{detail}</p></div>;
}

function ActionCard({ href, icon, title, description }: { href: string; icon: ReactNode; title: string; description: string }) {
  return <Link href={href} className="group rounded-2xl border border-border bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"><div className="flex items-start justify-between gap-4"><div className="rounded-xl bg-primary/10 p-2.5 text-primary">{icon}</div><ArrowRight aria-hidden className="size-5 text-muted transition group-hover:translate-x-1 group-hover:text-primary" /></div><h2 className="mt-5 text-lg font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-muted">{description}</p></Link>;
}
