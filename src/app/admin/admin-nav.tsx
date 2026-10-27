"use client";

import {
  CalendarDays,
  ClipboardCheck,
  FileBarChart,
  Gift,
  HandHeart,
  HeartHandshake,
  History,
  LayoutDashboard,
  Megaphone,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
  ReceiptText,
  X,
  Building2,
  Church,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { NavGroup, NavIcon } from "./nav";

const ICONS: Record<NavIcon, typeof Users> = {
  home: LayoutDashboard,
  members: Users,
  ministries: HandHeart,
  events: CalendarDays,
  attendance: ClipboardCheck,
  finance: Wallet,
  giving: Gift,
  expenses: ReceiptText,
  announcements: Megaphone,
  reports: FileBarChart,
  users: ShieldCheck,
  settings: Settings,
  audit: History,
  followup: HeartHandshake,
  chapels: Church,
  churches: Building2,
  prayer: Sparkles,
};

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

function Groups({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex flex-col gap-5">
      {groups.map((g, gi) => (
        <div key={g.label ?? gi}>
          {g.label ? <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/45">{g.label}</p> : null}
          <ul className="flex flex-col gap-0.5">
            {g.items.map((item) => {
              const Icon = ICONS[item.icon];
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`group flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm transition ${
                      active ? "bg-white/12 font-medium text-white shadow-[inset_3px_0_0_var(--accent)]" : "text-sidebar-foreground/80 hover:bg-white/6 hover:text-white"
                    }`}
                  >
                    <Icon aria-hidden className={`size-4 transition ${active ? "text-accent" : "opacity-80 group-hover:opacity-100"}`} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function SidebarNav({ groups, brand }: { groups: NavGroup[]; brand: ReactNode }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
      <div className="px-5 pb-5 pt-5">{brand}</div>
      <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto px-3 pb-4">
        <Groups groups={groups} />
      </nav>
      <div className="border-t border-white/8 p-3">
        <Link href="/" className="flex items-center justify-between rounded-lg px-3 py-2 text-xs text-sidebar-foreground/70 hover:bg-white/6 hover:text-white">
          Ver sitio público <span aria-hidden>↗</span>
        </Link>
      </div>
    </aside>
  );
}

const TAB_PRIORITY = ["/admin", "/admin/miembros", "/admin/eventos", "/admin/asistencia", "/admin/tesoreria", "/admin/comunicados"];

/** Barra inferior para celulares: accesos principales permitidos + "Más" (abre el menú completo). */
export function MobileTabBar({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  const all = groups.flatMap((g) => g.items);
  const tabs = TAB_PRIORITY.map((href) => all.find((i) => i.href === href)).filter((i): i is NonNullable<typeof i> => !!i).slice(0, 4);
  return (
    <nav aria-label="Accesos rápidos" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}>
        {tabs.map((t) => {
          const Icon = ICONS[t.icon];
          const active = isActive(pathname, t.href);
          return (
            <li key={t.href}>
              <Link href={t.href} aria-current={active ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${active ? "text-primary" : "text-muted"}`}>
                <span className={`rounded-full px-4 py-1 transition ${active ? "bg-accent-soft" : ""}`}><Icon aria-hidden className="size-5" /></span>
                {t.label}
              </Link>
            </li>
          );
        })}
        <li>
          <button type="button" onClick={() => window.dispatchEvent(new Event("admin-menu:open"))} className="flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted">
            <span className="px-4 py-1"><Menu aria-hidden className="size-5" /></span>
            Más
          </button>
        </li>
      </ul>
    </nav>
  );
}

/** Menú lateral deslizable para móvil y tableta. */
export function MobileNav({ groups, brand }: { groups: NavGroup[]; brand: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // eslint-disable-next-line react-hooks/set-state-in-effect -- cerrar al cambiar de ruta
  useEffect(() => setOpen(false), [pathname]);
  // La barra inferior abre este menú con el botón "Más".
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("admin-menu:open", onOpen);
    return () => window.removeEventListener("admin-menu:open", onOpen);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <div className="lg:hidden">
      <button type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="menu-panel" className="flex min-h-10 items-center gap-2 rounded-lg px-2 hover:bg-surface-2">
        <Menu aria-hidden className="size-5" />
        <span className="sr-only">Abrir menú</span>
      </button>
      {open ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menú">
          <button type="button" aria-label="Cerrar menú" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <nav id="menu-panel" aria-label="Navegación principal" className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-sidebar p-4 text-sidebar-foreground shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-2">
              {brand}
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-white/10" aria-label="Cerrar menú">
                <X aria-hidden className="size-5" />
              </button>
            </div>
            <Groups groups={groups} onNavigate={() => setOpen(false)} />
            <Link href="/" className="mt-6 rounded-lg px-3 py-2 text-xs text-sidebar-foreground/70 hover:bg-white/6">Ver sitio público ↗</Link>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
