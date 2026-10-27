import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { hasPanelAccess } from "@/lib/permissions";
import { requirePortalActor } from "@/lib/session";
import { getSettingsInternal } from "@/modules/settings/service";
import { ThemeToggle } from "@/components/theme-toggle";
import { BookOpeningIntro } from "../(public)/book-opening-intro";
import { SignOutButton } from "../admin/sign-out-button";
import { PortalNav } from "./portal-nav";

export const metadata: Metadata = { title: "Mi cuenta", robots: { index: false } };
export const instant = false;

export default function PortalLayout({ children }: LayoutProps<"/mi-cuenta">) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" aria-busy="true" />}>
      <PortalShell>{children}</PortalShell>
    </Suspense>
  );
}

async function PortalShell({ children }: { children: ReactNode }) {
  const actor = await requirePortalActor();
  const settings = await getSettingsInternal();
  return (
    <div className="flex min-h-screen flex-col">
      <BookOpeningIntro churchName={settings.name} playOnMount />
      <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            {settings.logoPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/media/logo?v=${encodeURIComponent(settings.logoPath)}`} alt="" className="size-9 rounded-lg object-contain" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/eclaria-icon.png" alt="" className="size-9 rounded-lg object-contain" />
            )}
            <span className="min-w-0">
              <span className="block truncate font-display font-semibold leading-tight">{settings.name}</span>
              <span className="block text-xs text-muted">Portal del miembro</span>
            </span>
          </Link>
          <nav aria-label="Cuenta" className="flex items-center gap-1">
            <ThemeToggle />
            {hasPanelAccess(actor.permissions) ? (
              <Link href="/admin" className="hidden rounded-lg px-3 py-2 text-sm hover:bg-surface-2 sm:inline-block">Panel administrativo</Link>
            ) : null}
            <SignOutButton />
          </nav>
        </div>
        <PortalNav />
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
