import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { can } from "@/lib/authz";
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
      <header className="flex h-14 items-center justify-between gap-2 border-b border-border bg-surface px-4">
        <div className="flex items-center gap-2">
          <MobileNav items={items} />
          <span className="font-semibold">Panel de la iglesia</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-muted sm:inline" title={actor.email}>
            {actor.name}
          </span>
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
