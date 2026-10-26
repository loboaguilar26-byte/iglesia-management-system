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
| Finanzas | `finance:dashboard` (solo totales), `finance:read`, `finance:create`, `finance:review_giving`, `finance:update`, `finance:void`, `finance:export`, `finance:configure` |
| Comunicados | `announcements:read`, `announcements:create`, `announcements:update`, `announcements:publish`, `announcements:archive` |
| Reportes | `reports:members`, `reports:attendance`, `reports:ministries`, `reports:finance` |
| Configuración | `settings:read`, `settings:update` |
| Auditoría | `audit:read`, `audit:read_finance` |

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
| finance:dashboard (totales de hoy y semana) | ✅ | — | — | ✅ | — |
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
3. El **Administrador solo consulta totales agregados de ingresos del día y la semana** (`finance:dashboard`); no puede consultar movimientos, egresos ni reportes financieros. La Tesorería completa requiere permisos explícitos o el rol Tesorero.
4. El último usuario con `roles:assign` activo no puede desactivarse ni perder ese permiso (evita bloqueo total).
5. **Coordinador acotado (🔸):** el servicio verifica que exista `MinistryMembership` activa con `role=COORDINATOR` para el ministerio del recurso, o `EventResponsible` para el evento.
6. Reportes y exportaciones usan los **mismos** permisos que las pantallas. El dashboard ofrece solo totales agregados con `finance:dashboard`; el bloque financiero detallado requiere `finance:read`.
7. Ser coordinador de un ministerio (pertenencia) ≠ tener el rol de sistema Coordinador. Se necesitan ambos para operar en el panel.

## Permisos añadidos (25/10/2026)

| Permiso | Admin | Pastor | Secretario | Tesorero | Coordinador | Miembro |
|---|---|---|---|---|---|---|
| followup:read / followup:write (seguimiento pastoral) | — | ✅ | ✅ | — | — | — |
| portal:access (portal personal, solo datos propios) | — | — | — | — | — | ✅ |

- El rol **Miembro** no tiene acceso al panel: al iniciar sesión va a `/mi-cuenta`.
- Los cumpleaños del mes solo se muestran con acceso completo al directorio (no al Coordinador acotado).
- La constancia de aportaciones requiere `reports:finance` (Tesorero).
- El Tesorero puede aprobar o devolver reportes de ofrendas. Los reportes pendientes no se incluyen en ingresos; los anónimos no revelan el nombre del miembro al personal financiero.
