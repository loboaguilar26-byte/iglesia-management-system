"use client";

import { Building2, CalendarDays, Home, Menu, Users, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "./nav";

const ICONS = { home: Home, users: Users, churches: Building2, members: UsersRound, events: CalendarDays };

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
              className={`flex min-h-10 items-center gap-3 rounded-md px-3 text-sm ${
                active ? "bg-primary text-primary-foreground" : "hover:bg-background"
              }`}
            >
              <Icon aria-hidden className="size-4" />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function SidebarNav({ items }: { items: NavItem[] }) {
  return (
    <nav aria-label="Navegación principal" className="hidden w-60 shrink-0 border-r border-border bg-surface p-3 md:block">
      <Links items={items} />
    </nav>
  );
}

export function MobileNav({ items }: { items: NavItem[] }) {
  return (
    <details className="group relative md:hidden">
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-md px-2 hover:bg-background">
        <Menu aria-hidden className="size-5" />
        <span className="sr-only">Abrir menú</span>
      </summary>
      <nav
        aria-label="Navegación principal"
        className="absolute left-0 top-12 z-20 w-64 rounded-md border border-border bg-surface p-2 shadow-lg"
      >
        <Links
          items={items}
          onNavigate={() => document.activeElement?.closest("details")?.removeAttribute("open")}
        />
      </nav>
    </details>
  );
}
