// Catálogo de permisos y asignación inicial por rol.
// Fuente única para el seed y para docs/permisos.md. Los permisos efectivos se leen de la BD.

export const PERMISSIONS = {
  "users:read": "Consultar usuarios del sistema",
  "users:create": "Crear usuarios",
  "users:update": "Editar usuarios",
  "users:deactivate": "Activar o desactivar usuarios",
  "roles:assign": "Asignar roles a otros usuarios",

  "members:read": "Consultar miembros",
  "members:create": "Registrar miembros",
  "members:update": "Editar miembros",
  "members:deactivate": "Activar o desactivar miembros",
  "members:export": "Exportar miembros",
  "members:read_notes": "Leer notas pastorales de miembros",

  "attendance:read": "Consultar asistencia",
  "attendance:record": "Registrar asistencia",
  "attendance:update": "Corregir asistencia registrada",

  "events:read": "Consultar eventos",
  "events:create": "Crear eventos",
  "events:update": "Editar eventos",
  "events:cancel": "Cancelar eventos",

  "ministries:read": "Consultar ministerios",
  "ministries:create": "Crear ministerios",
  "ministries:update": "Editar ministerios",
  "ministries:manage_members": "Gestionar integrantes de ministerios",

  "finance:read": "Consultar aportaciones",
  "finance:create": "Registrar aportaciones",
  "finance:update": "Corregir aportaciones",
  "finance:void": "Anular aportaciones",
  "finance:export": "Exportar información financiera",
  "finance:configure": "Configurar conceptos y métodos de aportación",

  "announcements:read": "Consultar comunicados",
  "announcements:create": "Redactar comunicados",
  "announcements:update": "Editar comunicados",
  "announcements:publish": "Publicar comunicados",
  "announcements:archive": "Archivar comunicados",

  "reports:members": "Reportes de miembros",
  "reports:attendance": "Reportes de asistencia",
  "reports:ministries": "Reportes de ministerios",
  "reports:finance": "Reportes financieros",

  "settings:read": "Consultar configuración institucional",
  "settings:update": "Editar configuración institucional",

  "audit:read": "Consultar bitácora de auditoría (no financiera)",
  "audit:read_finance": "Consultar bitácora de auditoría financiera",
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const ROLE_KEYS = ["ADMIN", "PASTOR", "SECRETARY", "TREASURER", "COORDINATOR"] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

const all = (prefix: string) =>
  (Object.keys(PERMISSIONS) as Permission[]).filter((p) => p.startsWith(prefix));

export const ROLES: Record<RoleKey, { name: string; description: string; permissions: Permission[] }> = {
  ADMIN: {
    name: "Administrador",
    description: "Administra usuarios, roles y configuración. Sin acceso financiero por defecto.",
    permissions: [
      ...all("users:"),
      "roles:assign",
      ...all("members:").filter((p) => p !== "members:read_notes"),
      ...all("attendance:"),
      ...all("events:"),
      ...all("ministries:"),
      ...all("announcements:"),
      "reports:members",
      "reports:attendance",
      "reports:ministries",
      ...all("settings:"),
      "audit:read",
    ],
  },
  PASTOR: {
    name: "Pastor",
    description: "Supervisa la congregación, eventos y ministerios.",
    permissions: [
      "users:read",
      "members:read",
      "members:read_notes",
      "attendance:read",
      ...all("events:"),
      ...all("ministries:"),
      ...all("announcements:"),
      "reports:members",
      "reports:attendance",
      "reports:ministries",
      "settings:read",
    ],
  },
  SECRETARY: {
    name: "Secretario",
    description: "Gestiona el directorio, la asistencia, los eventos y los comunicados.",
    permissions: [
      ...all("members:").filter((p) => p !== "members:read_notes"),
      ...all("attendance:"),
      ...all("events:"),
      "ministries:read",
      ...all("announcements:"),
      "reports:members",
      "reports:attendance",
      "reports:ministries",
      "settings:read",
    ],
  },
  TREASURER: {
    name: "Tesorero",
    description: "Registra y reporta las aportaciones económicas.",
    permissions: [
      ...all("finance:"),
      "reports:finance",
      "audit:read_finance",
      "events:read",
      "announcements:read",
      "settings:read",
    ],
  },
  COORDINATOR: {
    name: "Coordinador",
    description:
      "Gestiona sus ministerios y eventos asignados. Los permisos se acotan a lo asignado en cada servicio.",
    permissions: [
      "members:read",
      "attendance:read",
      "attendance:record",
      "attendance:update",
      "events:read",
      "events:create",
      "events:update",
      "events:cancel",
      "ministries:read",
      "ministries:manage_members",
      "announcements:read",
      "announcements:create",
      "announcements:update",
      "reports:attendance",
      "reports:ministries",
      "settings:read",
    ],
  },
};

/** Roles cuyos permisos se limitan a ministerios/eventos asignados (ver docs/permisos.md, regla 5). */
export const SCOPED_ROLES: RoleKey[] = ["COORDINATOR"];
