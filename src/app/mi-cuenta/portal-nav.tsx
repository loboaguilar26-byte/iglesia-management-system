"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ClipboardCheck, HandHeart, HeartHandshake, Home, Sparkles, UserRound } from "lucide-react";

const ITEMS = [
  { href: "/mi-cuenta", label: "Inicio", icon: Home },
  { href: "/mi-cuenta/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/mi-cuenta/ministerios", label: "Ministerios", icon: HandHeart },
  { href: "/mi-cuenta/oracion", label: "Oración", icon: Sparkles },
  { href: "/mi-cuenta/aportaciones", label: "Aportaciones", icon: HeartHandshake },
  { href: "/mi-cuenta/asistencia", label: "Asistencia", icon: ClipboardCheck },
  { href: "/mi-cuenta/perfil", label: "Mi perfil", icon: UserRound },
];

/** Apartados del portal; en móvil se desplaza horizontalmente sin barra visible. */
export function PortalNav() {
  const path = usePathname();
  return (
    <nav aria-label="Apartados del portal" className="border-b border-border bg-surface/80 backdrop-blur">
      <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 py-2 [scrollbar-width:none] sm:px-5">
        {ITEMS.map((item) => {
          const active = item.href === "/mi-cuenta" ? path === item.href : path.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted hover:bg-surface-2 hover:text-foreground"}`}
              >
                <item.icon aria-hidden className="size-4" /> {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
