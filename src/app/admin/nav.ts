import type { Permission } from "@/lib/permissions";

export type NavItem = { href: string; label: string; icon: "home" | "users"; permission?: Permission };

// Solo se listan módulos implementados; cada fase agrega los suyos.
export const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Inicio", icon: "home" },
  { href: "/admin/usuarios", label: "Usuarios y roles", icon: "users", permission: "users:read" },
];
