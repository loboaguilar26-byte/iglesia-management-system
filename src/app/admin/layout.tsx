import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { can } from "@/lib/authz";
import { ROLES } from "@/lib/permissions";
import { requirePageActor } from "@/lib/session";
import { MobileNav, SidebarNav } from "./admin-nav";
import { NAV_ITEMS } from "./nav";
import { SignOutButton } from "./sign-out-button";

export const metadata: Metadata = { title: "Panel", robots: { index: false } };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}

// Lee la sesión en cada petición; sin sesión válida redirige al login.
async function AdminShell({ children }: { children: ReactNode }) {
  const actor = await requirePageActor();
  const items = NAV_ITEMS.filter((item) => !item.permission || can(actor, item.permission));
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex min-h-16 items-center justify-between gap-3 border-b border-border bg-surface/95 px-4 shadow-sm backdrop-blur sm:px-6">
        <div className="flex items-center gap-2">
          <MobileNav items={items} />
          <div>
            <span className="block text-sm font-semibold tracking-tight sm:text-base">Panel de la iglesia</span>
            <span className="hidden text-xs text-muted sm:block">Operación y administración</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden text-right sm:block" title={actor.email}>
            <span className="block text-sm font-medium">{actor.name}</span>
            <span className="text-xs text-muted">{actor.roles.map((role) => ROLES[role].name).join(" · ") || "Sin roles"}</span>
          </div>
          <SignOutButton />
        </div>
      </header>
      <div className="flex flex-1">
        <SidebarNav items={items} />
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

function AdminSkeleton() {
  return (
    <div className="flex min-h-screen flex-col" aria-busy="true">
      <div className="h-14 border-b border-border bg-surface" />
      <p className="p-6 text-sm text-muted">Cargando…</p>
    </div>
  );
}
