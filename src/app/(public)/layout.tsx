import Link from "next/link";
import type { Metadata } from "next";
import { getPublicSite } from "@/modules/public/service";
import { Suspense } from "react";
import { InstallAppButton } from "@/components/pwa";
import { BookOpeningIntro } from "./book-opening-intro";
import { SiteHeader } from "./site-header";

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getPublicSite();
  return {
    title: { absolute: settings.name },
    description: settings.tagline ?? settings.welcomeText?.slice(0, 160) ?? `Sitio oficial de ${settings.name}.`,
    openGraph: { title: settings.name, description: settings.tagline ?? undefined, type: "website", locale: "es_MX" },
  };
}

export default async function PublicLayout({ children }: LayoutProps<"/">) {
  const { settings: s } = await getPublicSite();
  const social = [
    s.facebookUrl && { href: s.facebookUrl, label: "Facebook" },
    s.instagramUrl && { href: s.instagramUrl, label: "Instagram" },
    s.youtubeUrl && { href: s.youtubeUrl, label: "YouTube" },
  ].filter(Boolean) as { href: string; label: string }[];
  return (
    <div className="flex min-h-screen flex-col">
      <BookOpeningIntro churchName={s.name} />
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2">Saltar al contenido</a>
      <Suspense fallback={<div className="h-16 border-b border-border/70 bg-background" />}>
        <SiteHeader name={s.name} logo={s.logoPath} />
      </Suspense>
      <main id="contenido" className="flex-1">{children}</main>
      <footer className="bg-sidebar text-sidebar-foreground">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
          <div>
            <p className="font-display text-xl font-semibold text-white">{s.name}</p>
            {s.tagline ? <p className="mt-2 text-sm opacity-80">{s.tagline}</p> : null}
          </div>
          <div className="text-sm">
            <p className="mb-2 font-semibold text-white">Visítanos</p>
            {s.address ? <p className="opacity-85">{s.address}</p> : null}
            {s.phone ? <p className="opacity-85">Tel. {s.phone}</p> : null}
            {s.email ? <p className="opacity-85">{s.email}</p> : null}
          </div>
          <div className="text-sm">
            <p className="mb-2 font-semibold text-white">Enlaces</p>
            <ul className="flex flex-col gap-1 opacity-85">
              {social.map((l) => <li key={l.label}><a href={l.href} target="_blank" rel="noopener noreferrer" className="hover:text-white hover:underline">{l.label}</a></li>)}
              <li><Link href="/privacidad" className="hover:text-white hover:underline">Aviso de privacidad</Link></li>
              <li><Link href="/login?next=/mi-cuenta" className="hover:text-white hover:underline">Portal del miembro</Link></li>
              <li><Link href="/login" className="hover:text-white hover:underline">Acceso administrativo</Link></li>
            </ul>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 border-t border-white/10 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-xs">
          <span className="opacity-60">© {s.name}</span>
          <InstallAppButton className="text-white" />
        </div>
      </footer>
    </div>
  );
}
