import type { Permission } from "@/lib/permissions";

export type NavIcon = "home" | "members" | "ministries" | "events" | "attendance" | "finance" | "announcements" | "reports" | "users" | "settings";
export type NavItem = { href: string; label: string; icon: NavIcon; permission?: Permission; anyOf?: Permission[] };

export const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Inicio", icon: "home" },
  { href: "/admin/miembros", label: "Miembros", icon: "members", permission: "members:read" },
  { href: "/admin/ministerios", label: "Ministerios", icon: "ministries", permission: "ministries:read" },
  { href: "/admin/eventos", label: "Eventos", icon: "events", permission: "events:read" },
  { href: "/admin/asistencia", label: "Asistencia", icon: "attendance", permission: "attendance:read" },
  { href: "/admin/tesoreria", label: "Tesorería", icon: "finance", permission: "finance:read" },
  { href: "/admin/comunicados", label: "Comunicados", icon: "announcements", permission: "announcements:read" },
  { href: "/admin/reportes", label: "Reportes", icon: "reports", anyOf: ["reports:members", "reports:attendance", "reports:ministries", "reports:finance"] },
  { href: "/admin/usuarios", label: "Usuarios y roles", icon: "users", permission: "users:read" },
  { href: "/admin/configuracion", label: "Configuración", icon: "settings", permission: "settings:read" },
];
