# Matriz de roles y permisos

> Propuesta inicial **pendiente de validación con la iglesia**. Los permisos se guardan en BD (`RolePermission`) y se pueden ajustar sin cambiar código. Un usuario con varios roles recibe la **unión** de permisos.

## Catálogo de permisos

| Módulo | Permisos |
|---|---|
| Usuarios | `users:read`, `users:create`, `users:update`, `users:deactivate`, `roles:assign` |
| Miembros | `members:read`, `members:create`, `members:update`, `members:deactivate`, `members:export`, `members:read_notes` |
| Asistencia | `attendance:read`, `attendance:record`, `attendance:update` |
| Eventos | `events:read`, `events:create`, `events:update`, `events:cancel` |
| Ministerios | `ministries:read`, `ministries:create`, `ministries:update`, `ministries:manage_members` |
| Finanzas | `finance:read`, `finance:create`, `finance:update`, `finance:void`, `finance:export`, `finance:configure` |
| Comunicados | `announcements:read`, `announcements:create`, `announcements:update`, `announcements:publish`, `announcements:archive` |
| Reportes | `reports:members`, `reports:attendance`, `reports:ministries`, `reports:finance` |
| Configuración | `settings:read`, `settings:update` |
| Auditoría | `audit:read`, `audit:read_finance` |
| Franquicias e iglesias | `churches:read`, `churches:create`, `churches:update`, `churches:manage_members` |

### Jerarquía agregada

La base conserva la unión de permisos actual y agrega un nivel para ordenar la responsabilidad administrativa por sede:

| Nivel | Rol |
|---:|---|
| 100 | Administrador |
| 80 | Pastor |
| 60 | Secretario / Tesorero |
| 40 | Coordinador |

El nivel es informativo para la interfaz y no sustituye la autorización por permiso.

## Asignación inicial

Leyenda: ✅ total · 🔸 acotado a lo asignado (scope) · — sin acceso

| Permiso | Admin | Pastor | Secretario | Tesorero | Coordinador |
|---|---|---|---|---|---|
| users:read | ✅ | ✅ | — | — | — |
| users:create/update/deactivate, roles:assign | ✅ | — | — | — | — |
| members:read | ✅ | ✅ | ✅ | — | 🔸 integrantes de sus ministerios |
| members:create/update/deactivate | ✅ | — | ✅ | — | — |
| members:export | ✅ | — | ✅ | — | — |
| members:read_notes | — | ✅ | — | — | — |
| attendance:read | ✅ | ✅ | ✅ | — | 🔸 sus eventos |
| attendance:record/update | ✅ | — | ✅ | — | 🔸 sus eventos |
| events:read | ✅ | ✅ | ✅ | ✅ | ✅ |
| events:create/update/cancel | ✅ | ✅ | ✅ | — | 🔸 eventos de sus ministerios o donde es responsable |
| ministries:read | ✅ | ✅ | ✅ | — | 🔸 sus ministerios |
| ministries:create/update | ✅ | ✅ | — | — | — |
| ministries:manage_members | ✅ | ✅ | — | — | 🔸 sus ministerios |
| **finance:\*** | — | — | — | ✅ | — |
| announcements:read | ✅ | ✅ | ✅ | ✅ | ✅ |
| announcements:create/update | ✅ | ✅ | ✅ | — | ✅ (propios) |
| announcements:publish/archive | ✅ | ✅ | ✅ | — | — |
| reports:members | ✅ | ✅ | ✅ | — | — |
| reports:attendance | ✅ | ✅ | ✅ | — | 🔸 |
| reports:ministries | ✅ | ✅ | ✅ | — | 🔸 |
| reports:finance | — | — | — | ✅ | — |
| settings:read | ✅ | ✅ | ✅ | ✅ | ✅ |
| settings:update | ✅ | — | — | — | — |
| audit:read | ✅ | — | — | — | — |
| audit:read_finance | — | — | — | ✅ | — |

## Reglas transversales

1. **Autorización en servidor** en cada servicio; la UI solo refleja permisos.
2. **Nadie modifica sus propios roles** (`roles:assign` con `targetUserId === actor.id` → 403 + auditoría).
3. El **Administrador no tiene finanzas** por defecto. Para concederlas, otro administrador asigna el rol Tesorero o un permiso explícito, y queda auditado.
4. El último usuario con `roles:assign` activo no puede desactivarse ni perder ese permiso (evita bloqueo total).
5. **Coordinador acotado (🔸):** el servicio verifica que exista `MinistryMembership` activa con `role=COORDINATOR` para el ministerio del recurso, o `EventResponsible` para el evento.
6. Reportes y exportaciones usan los **mismos** permisos que las pantallas; las respuestas del dashboard omiten el bloque financiero sin `finance:read` (no lo envían vacío: no existe en la respuesta).
7. Ser coordinador de un ministerio (pertenencia) ≠ tener el rol de sistema Coordinador. Se necesitan ambos para operar en el panel.
