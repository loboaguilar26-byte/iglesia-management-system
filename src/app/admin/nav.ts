import type { Permission } from "@/lib/permissions";

export type NavItem = { href: string; label: string; icon: "home" | "users" | "churches" | "members" | "events" | "ministries" | "announcements" | "reports" | "settings"; permission?: Permission };

// Solo se listan módulos implementados; cada fase agrega los suyos.
export const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Inicio", icon: "home" },
  { href: "/admin/iglesias", label: "Iglesias y franquicias", icon: "churches", permission: "churches:read" },
  { href: "/admin/miembros", label: "Miembros", icon: "members", permission: "members:read" },
  { href: "/admin/eventos", label: "Eventos", icon: "events", permission: "events:read" },
  { href: "/admin/ministerios", label: "Ministerios", icon: "ministries", permission: "ministries:read" },
  { href: "/admin/comunicados", label: "Comunicados", icon: "announcements", permission: "announcements:read" },
  { href: "/admin/reportes", label: "Reportes", icon: "reports", permission: "reports:members" },
  { href: "/admin/configuracion", label: "Configuración", icon: "settings", permission: "settings:read" },
  { href: "/admin/usuarios", label: "Usuarios y roles", icon: "users", permission: "users:read" },
];
