"use client";

import {
  CalendarDays,
  ClipboardCheck,
  FileBarChart,
  HandHeart,
  LayoutDashboard,
  Megaphone,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavIcon, NavItem } from "./nav";

const ICONS: Record<NavIcon, typeof Users> = {
  home: LayoutDashboard,
  members: Users,
  ministries: HandHeart,
  events: CalendarDays,
  attendance: ClipboardCheck,
  finance: Wallet,
  announcements: Megaphone,
  reports: FileBarChart,
  users: ShieldCheck,
  settings: Settings,
};

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

function Links({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = isActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm transition ${
                active ? "bg-white/12 font-medium text-white shadow-[inset_3px_0_0_var(--accent)]" : "text-sidebar-foreground/85 hover:bg-white/6 hover:text-white"
              }`}
            >
              <Icon aria-hidden className={`size-4 ${active ? "text-accent" : ""}`} />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function SidebarNav({ items, brand }: { items: NavItem[]; brand: React.ReactNode }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar p-4 text-sidebar-foreground lg:flex">
      <div className="mb-6 px-2">{brand}</div>
      <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto">
        <Links items={items} />
      </nav>
      <Link href="/" className="mt-4 rounded-lg px-3 py-2 text-xs text-sidebar-foreground/70 hover:bg-white/6 hover:text-white">
        Ver sitio público ↗
      </Link>
    </aside>
  );
}

export function MobileNav({ items, brand }: { items: NavItem[]; brand: React.ReactNode }) {
  return (
    <details className="group relative lg:hidden">
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-lg px-2 hover:bg-surface-2">
        <Menu aria-hidden className="size-5" />
        <span className="sr-only">Abrir menú</span>
      </summary>
      <nav aria-label="Navegación principal" className="fixed inset-x-3 top-16 z-40 max-h-[80vh] overflow-y-auto rounded-2xl bg-sidebar p-3 text-sidebar-foreground shadow-2xl">
        <div className="mb-3 px-2">{brand}</div>
        <Links items={items} onNavigate={() => document.activeElement?.closest("details")?.removeAttribute("open")} />
      </nav>
    </details>
  );
}
