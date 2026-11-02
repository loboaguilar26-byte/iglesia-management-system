# Requisitos

> **[C]** confirmado por el cliente (prompt maestro) · **[R]** recomendación · **[P]** pendiente de validar con la iglesia.

## Requisitos funcionales

### RF-01 Inicio de sesión y usuarios [C]
- Alta administrativa de usuarios (no hay registro público).
- Login/logout con correo y contraseña; recuperación con token aleatorio, de un solo uso, vencimiento 30 min.
- Usuarios activos/inactivos; un usuario inactivo no puede iniciar sesión y sus sesiones se revocan.
- Roles: Administrador, Pastor, Secretario, Tesorero, Coordinador. Un usuario puede tener varios roles. **[R]**
- Nadie puede modificar sus propios roles/permisos. **[C]**
- Primer administrador creado con comando CLI `pnpm setup:admin` que solo funciona si no existe ningún usuario. **[R]**
- Rate limit en login y recuperación.

**Criterios de aceptación:** login correcto/incorrecto; mensaje de error genérico ("Credenciales inválidas"); usuario inactivo rechazado; token de recuperación usado dos veces → rechazado; token vencido → rechazado; API protegida devuelve 401 sin sesión y 403 sin permiso; intento de autoasignarse rol → 403 y registro en auditoría.

### RF-02 Miembros [C]
- CRUD (sin borrado físico), listado paginado, búsqueda por nombre (insensible a acentos y mayúsculas **[R]**), filtro por estado.
- Campos: id, nombre(s), apellidos, teléfono (opcional), correo (opcional), fecha de ingreso, estado (`VISITOR`/`ACTIVE`/`INACTIVE`), cargo organizativo (opcional, texto), notas (restringidas), creado/actualizado por y fecha.
- Duplicados: aviso si coincide nombre normalizado + (teléfono o correo); el correo es único si existe. **[R]**
- Menores de edad: campo `isMinor`; nunca visibles en sitio público. **[R]** **[P]** ¿se registrarán menores?

**Criterios:** crear, editar, buscar "jose" encuentra "José"; desactivar no elimina; validación en cliente y servidor con el mismo esquema Zod.

### RF-03 Asistencia [C]
- Seleccionar evento (que ya tiene fecha), listar miembros activos (o integrantes del ministerio del evento), marcar `PRESENT`/`ABSENT`; sin registro = pendiente.
- Contador de visitantes anónimos por evento.
- Historial por persona y por evento; resúmenes semanal y mensual.
- Edición posterior registrada en auditoría.
- Restricción única (evento, miembro).

### RF-04 Eventos [C]
- Crear, editar, cancelar (estado `CANCELLED`, no se borra), detalle, calendario mensual/semanal, próximos eventos.
- Campos: título, tipo (configurable), inicio, fin, lugar, descripción, responsables, ministerio (opcional), visibilidad (`PUBLIC`/`PRIVATE`), estado (`SCHEDULED`/`CANCELLED`/`COMPLETED`).
- Fechas almacenadas en UTC; se muestran en la zona horaria de la iglesia (por defecto `America/Mexico_City`). Validación fin > inicio.
- **[R]** Eventos recurrentes: v1 permite **duplicar** evento; la recurrencia automática queda para v2.

### RF-05 Ministerios [C]
- Alta/edición/activar/desactivar; coordinadores e integrantes con fecha inicio/fin; varios ministerios por persona; actividades relacionadas (eventos con `ministryId`).

### RF-06 Aportaciones [C]
- Campos: fecha, monto (Decimal 12,2), moneda (MXN por defecto), concepto (configurable: diezmo, ofrenda, misiones…), método (configurable: efectivo, transferencia…), referencia/folio opcional, donante opcional (anónimo = null), notas.
- Consulta por periodo, resumen mensual por concepto y método.
- Corrección = anulación con motivo + nuevo registro. Sin borrado físico.
- Los egresos se registran por fecha, monto, categoría, descripción y método de pago; anular requiere motivo y no hay borrado físico.
- Un miembro puede reportar una ofrenda ya entregada (no se procesa pago en línea). Tesorería la valida antes de crear el ingreso oficial. El miembro puede marcarla anónima; en ese caso su identidad se oculta también a tesorería.
- Tesorería presenta cortes semanales de ingresos confirmados, egresos vigentes y balance neto.
- Permisos separados: `finance:read`, `finance:create`, `finance:update`, `finance:void`, `finance:export`.
- Sin pagos en línea. **[C]**

### RF-07 Comunicados [C]
- Crear, editar, archivar y eliminar definitivamente, autor, fecha de publicación, vigencia (desde/hasta), destacado, visibilidad pública/privada.
- Modelo preparado para notificaciones (`AnnouncementDelivery` en v2) — no se simula.

### RF-08 Dashboard [C]
- Tarjetas: miembros activos, próximos eventos (7 días), asistencias registradas (últimos 30 días), ministerios activos; resumen financiero del mes **solo** si tiene `finance:read`.
- Gráficas: asistencia por semana (últimas 12), aportaciones por mes (solo autorizados).
- Cada indicador muestra periodo y criterio. Datos de la BD, nunca fijos.

### RF-09 Reportes [C]
- Miembros, asistencia por evento, asistencia por periodo, participación por ministerio, ingresos por periodo.
- Encabezado con nombre de la iglesia, fecha de generación, periodo, filtros, usuario que genera.
- Exportación PDF y Excel (XLSX), con mismos permisos; las exportaciones financieras quedan en auditoría.
- Los totales del reporte deben coincidir con el dashboard (misma función de cálculo en el servicio).

### RF-10 Configuración [C]
- Nombre, logotipo (PNG/JPG/WebP ≤ 1 MB, validado por firma de archivo), dirección, teléfono, correo, horarios, zona horaria, moneda, textos del sitio público, terminología (p. ej. cómo llamar a "culto", "ministerio").
- Catálogos configurables: tipos de evento, conceptos de aportación, métodos de recepción.

### RF-11 Sitio público [C, segundo prompt]
- Inicio, acerca de, horarios, ubicación/contacto, próximos eventos públicos, comunicados públicos, enlace a `/admin`.
- Solo datos marcados `PUBLIC`; DTOs públicos con campos explícitos.
- Formulario de contacto: **[P]** (requiere decidir a dónde llegan los mensajes y aviso de privacidad).

## Requisitos no funcionales

| ID | Requisito |
|---|---|
| RNF-01 Seguridad | Hash de contraseñas (scrypt/argon2 vía biblioteca de auth), sesiones con cookie `HttpOnly`, `Secure`, `SameSite=Lax`; autorización en cada handler del servidor; rate limiting; cabeceras de seguridad (CSP); validación Zod en servidor. Ver `seguridad.md`. |
| RNF-02 Privacidad | Minimización de datos, nada personal en sitio público ni en logs; seed solo ficticio. |
| RNF-03 Auditoría | `AuditLog` en operaciones sensibles, sin datos secretos. |
| RNF-04 Usabilidad | Español, `dd/mm/aaaa`, MXN, responsive, teclado, contraste AA, estados de carga/vacío/error, confirmación en acciones delicadas. |
| RNF-05 Rendimiento | Listados paginados (25 por página por defecto); índices en búsquedas; respuesta < 500 ms p95 con 5 000 miembros (supuesto). |
| RNF-06 Mantenibilidad | TypeScript estricto, módulos por dominio, lint + typecheck + tests en CI. |
| RNF-07 Portabilidad móvil | Diseño adaptable y app Android/iOS con Capacitor sobre la misma web (`docs/movil.md`); API REST `/api/v1` para integraciones. |
| RNF-08 Disponibilidad | Respaldos diarios de BD; procedimiento de restauración documentado. |

## Pendientes de validación con la iglesia [P]
1. Nombre real, logotipo, datos de contacto y horarios (se usan datos ficticios marcados como DEMO).
2. Criterios para pasar de visitante a miembro.
3. ¿Se registran menores? ¿Con qué datos?
4. ¿Quién debe ver finanzas además del tesorero (pastor, comité)?
5. ¿Se emiten recibos deducibles (CFDI)?
6. ¿Formulario de contacto público y a quién llega?
7. Política de conservación: ¿cuántos años guardar miembros inactivos y registros financieros? (sugerencia: finanzas 5 años por obligaciones fiscales; confirmar con contador).
