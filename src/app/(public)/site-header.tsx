"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/nosotros", label: "Nosotros" },
  { href: "/horarios", label: "Horarios" },
  { href: "/eventos", label: "Eventos" },
  { href: "/comunicados", label: "Comunicados" },
  { href: "/contacto", label: "Contacto" },
];

export function SiteHeader({ name, logo }: { name: string; logo: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-3" onClick={() => setOpen(false)}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/media/logo?v=${encodeURIComponent(logo)}`} alt="" className="size-9 rounded-lg object-contain" />
          ) : (
            <span aria-hidden className="flex size-9 items-center justify-center rounded-lg bg-primary font-display text-lg font-semibold text-primary-foreground">{name.trim().charAt(0)}</span>
          )}
          <span className="truncate font-display text-lg font-semibold">{name}</span>
        </Link>
        <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={active(l.href) ? "page" : undefined} className={`rounded-full px-3 py-2 text-sm transition ${active(l.href) ? "bg-primary text-primary-foreground" : "hover:bg-surface"}`}>
              {l.label}
            </Link>
          ))}
        </nav>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="menu-movil" className="rounded-lg p-2 hover:bg-surface md:hidden">
          {open ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
          <span className="sr-only">{open ? "Cerrar menú" : "Abrir menú"}</span>
        </button>
      </div>
      {open ? (
        <nav id="menu-movil" aria-label="Principal" className="border-t border-border bg-background px-4 pb-4 md:hidden">
          <ul className="flex flex-col py-2">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setOpen(false)} aria-current={active(l.href) ? "page" : undefined} className={`block rounded-lg px-3 py-3 ${active(l.href) ? "bg-primary text-primary-foreground" : "hover:bg-surface"}`}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
