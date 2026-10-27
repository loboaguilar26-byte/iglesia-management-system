import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { can } from "@/lib/authz";
import { ROLES } from "@/lib/permissions";
import { requirePageActor } from "@/lib/session";
import { ThemeToggle } from "@/components/theme-toggle";
import { getSettingsInternal } from "@/modules/settings/service";
import { MobileNav, MobileTabBar, SidebarNav } from "./admin-nav";
import { CommandSearch } from "./command-search";
import { navFor } from "./nav";
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
  const groups = navFor((p) => can(actor, p));
  const initials = actor.name.split(/\s+/).map((w) => w.charAt(0)).slice(0, 2).join("").toUpperCase();
  const brand = (
    <Link href="/admin" className="flex items-center gap-3">
      {settings.logoPath ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/media/logo?v=${encodeURIComponent(settings.logoPath)}`} alt="" className="size-10 rounded-xl bg-white object-contain p-1" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/igletech-mark.svg" alt="" className="size-10 rounded-xl object-contain shadow" />
      )}
      <div className="min-w-0">
        <p className="truncate font-display text-base font-semibold leading-tight text-white">{settings.name}</p>
        <p className="text-xs text-sidebar-foreground/60">Panel administrativo</p>
      </div>
    </Link>
  );
  return (
    <div className="flex min-h-screen">
      <SidebarNav groups={groups} brand={brand} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-surface/85 px-4 backdrop-blur sm:px-6">
          <MobileNav groups={groups} brand={brand} />
          <div className="min-w-0 flex-1">
            <CommandSearch />
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle className="shrink-0" />
            {can(actor, "portal:access") ? (
              <Link href="/mi-cuenta" className="hidden rounded-lg px-3 py-2 text-sm hover:bg-surface-2 md:inline-block">Mi portal</Link>
            ) : null}
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{actor.name}</p>
              <p className="text-xs text-muted">{actor.roles.map((r) => ROLES[r].name).join(", ") || "Sin rol"}</p>
            </div>
            <span aria-hidden className="flex size-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">{initials}</span>
            <SignOutButton />
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 pb-28 sm:p-6 sm:pb-28 lg:p-8 lg:pb-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
      <MobileTabBar groups={groups} />
    </div>
  );
}

function AdminSkeleton() {
  return (
    <div className="flex min-h-screen" aria-busy="true">
      <div className="hidden w-64 bg-sidebar lg:block" />
      <div className="flex-1">
        <div className="h-16 border-b border-border bg-surface" />
        <div className="space-y-4 p-8">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-surface-2" />
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface-2" />)}
          </div>
        </div>
      </div>
    </div>
  );
}
