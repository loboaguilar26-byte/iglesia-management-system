import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { can } from "@/lib/authz";
import { ROLES } from "@/lib/permissions";
import { requirePageActor } from "@/lib/session";
import { getSettingsInternal } from "@/modules/settings/service";
import { MobileNav, SidebarNav } from "./admin-nav";
import { NAV_ITEMS } from "./nav";
import { SignOutButton } from "./sign-out-button";

export const metadata: Metadata = { title: "Panel", robots: { index: false } };

// Todo el panel depende de la sesión de cada petición: no hay contenido estático que prerenderizar.
export const instant = false;

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
  const settings = await getSettingsInternal();
  const items = NAV_ITEMS.filter(
    (item) => (!item.permission || can(actor, item.permission)) && (!item.anyOf || item.anyOf.some((p) => can(actor, p))),
  );
  const brand = (
    <div className="flex items-center gap-3">
      {settings.logoPath ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/media/logo?v=${encodeURIComponent(settings.logoPath)}`} alt="" className="size-10 rounded-lg bg-white object-contain p-1" />
      ) : (
        <span aria-hidden className="flex size-10 items-center justify-center rounded-lg bg-accent font-display text-lg font-semibold text-white">
          {settings.name.trim().charAt(0).toUpperCase()}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate font-display text-base font-semibold leading-tight text-white">{settings.name}</p>
        <p className="text-xs text-sidebar-foreground/70">Panel administrativo</p>
      </div>
    </div>
  );
  return (
    <div className="flex min-h-screen">
      <SidebarNav items={items} brand={brand} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b border-border bg-surface/90 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2">
            <MobileNav items={items} brand={brand} />
            <span className="font-display font-semibold lg:hidden">{settings.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{actor.name}</p>
              <p className="text-xs text-muted">{actor.roles.map((r) => ROLES[r].name).join(", ") || "Sin rol"}</p>
            </div>
            <SignOutButton />
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function AdminSkeleton() {
  return (
    <div className="flex min-h-screen" aria-busy="true">
      <div className="hidden w-64 bg-sidebar lg:block" />
      <div className="flex-1">
        <div className="h-16 border-b border-border bg-surface" />
        <p className="p-8 text-sm text-muted">Cargando…</p>
      </div>
    </div>
  );
}
