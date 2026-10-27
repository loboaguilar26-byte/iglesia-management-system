import type { Permission } from "@/lib/permissions";

export type NavIcon = "home" | "members" | "ministries" | "events" | "attendance" | "finance" | "giving" | "expenses" | "announcements" | "reports" | "users" | "settings" | "audit" | "followup" | "chapels" | "churches";
export type NavItem = { href: string; label: string; icon: NavIcon; permission?: Permission; anyOf?: Permission[] };
export type NavGroup = { label: string | null; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  { label: null, items: [{ href: "/admin", label: "Inicio", icon: "home" }] },
  {
    label: "Congregación",
    items: [
      { href: "/admin/capillas", label: "Capillas", icon: "chapels", permission: "chapels:read" },
      { href: "/admin/miembros", label: "Miembros", icon: "members", permission: "members:read" },
      { href: "/admin/seguimiento", label: "Seguimiento", icon: "followup", permission: "followup:read" },
      { href: "/admin/ministerios", label: "Ministerios", icon: "ministries", permission: "ministries:read" },
    ],
  },
  {
    label: "Actividades",
    items: [
      { href: "/admin/eventos", label: "Eventos", icon: "events", permission: "events:read" },
      { href: "/admin/asistencia", label: "Asistencia", icon: "attendance", permission: "attendance:read" },
      { href: "/admin/comunicados", label: "Comunicados", icon: "announcements", permission: "announcements:read" },
    ],
  },
  {
    label: "Finanzas e informes",
    items: [
      { href: "/admin/tesoreria", label: "Ofrendas e ingresos", icon: "finance", permission: "finance:read" },
      { href: "/admin/tesoreria/ofrendas", label: "Ofrendas por validar", icon: "giving", permission: "finance:review_giving" },
      { href: "/admin/tesoreria/gastos", label: "Gastos", icon: "expenses", permission: "finance:read" },
      { href: "/admin/reportes", label: "Reportes", icon: "reports", anyOf: ["reports:members", "reports:attendance", "reports:ministries", "reports:finance"] },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/admin/iglesias", label: "Iglesias y franquicias", icon: "churches", permission: "churches:read" },
      { href: "/admin/usuarios", label: "Usuarios y roles", icon: "users", permission: "users:read" },
      { href: "/admin/bitacora", label: "Bitácora", icon: "audit", anyOf: ["audit:read", "audit:read_finance"] },
      { href: "/admin/configuracion", label: "Configuración", icon: "settings", permission: "settings:read" },
    ],
  },
];

/** Grupos con solo los elementos permitidos (los grupos vacíos se omiten). */
export function navFor(can: (p: Permission) => boolean): NavGroup[] {
  return NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => (!i.permission || can(i.permission)) && (!i.anyOf || i.anyOf.some(can))),
  })).filter((g) => g.items.length > 0);
}
