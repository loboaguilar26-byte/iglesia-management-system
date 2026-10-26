# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [Sin publicar]

### Añadido — Bienvenida y resumen de ingresos
- Animación de apertura de Biblia al entrar al sitio público, con opción para omitirla, límite de una vez por pestaña y respeto a la preferencia de movimiento reducido.
- El inicio administrativo muestra ingresos aprobados del día y de la semana a Administradores y Tesoreros, sin exponer movimientos ni egresos a quienes no tengan acceso completo a Tesorería.
- Tesorería incorpora reportes de ofrendas de miembros pendientes de validación, gastos anulables y cortes semanales de ingresos, egresos y balance.
- Tema claro/oscuro persistente y acceso a la asistencia limitado al alcance de eventos del Coordinador.

### Añadido — Seguimiento, cumpleaños y reportes
- **Seguimiento de visitantes** (`/admin/seguimiento`, Pastor y Secretario): contactos (llamada, visita, mensaje, reunión), próxima acción, visitantes sin contactar, acciones vencidas; línea de tiempo en la ficha.
- **Cumpleaños:** fecha de nacimiento opcional y cumpleaños del mes en el Inicio (solo acceso completo al directorio).
- **Registro rápido de visitantes** desde el pase de lista (crea la ficha y marca presente).
- **Reportes nuevos:** asistencia por persona, visitantes y seguimiento, cumpleaños del mes, constancia anual de aportaciones por donante (no es CFDI).
- Permisos `followup:read` / `followup:write`; el seed concede permisos nuevos a los roles sin alterar ajustes previos.

### Añadido — Portal, panel renovado y multiplataforma
- **Portal del miembro** (`/mi-cuenta`, rol Miembro): sus datos de contacto, ministerios, asistencia, próximos eventos y aportaciones propias; acceso creado desde la ficha del miembro.
- **Panel:** menú por secciones, búsqueda global (Ctrl+K), avisos flotantes, bitácora de auditoría, pestañas con conteos en Miembros, filtro por tipo y estado "realizado" en Eventos, vínculo cuenta–ficha.
- **Sitio público:** portada con datos reales, "Tu primera visita", evento destacado, ministerios públicos, calendario público, botón Acceder.
- **Multiplataforma:** app instalable (manifiesto, íconos, service worker con página sin conexión), barra inferior en celulares, áreas seguras para pantallas con muesca.
- **Firebase App Hosting:** `apphosting.yaml`, `firebase.json`; logotipo guardado en la base de datos.

### Añadido — Fases 2 a 7 (sitio público y módulos)
- **Sitio público** (`/`, `/nosotros`, `/horarios`, `/eventos`, `/comunicados`, `/contacto`, `/privacidad`): diseño propio (Fraunces + Inter, azul profundo y dorado), responsive, SEO básico, próxima reunión calculada en vivo. Solo muestra contenido marcado como público; caché invalidada al editar desde el panel.
- **Configuración (RF-10):** datos institucionales, textos del sitio, redes, aviso de privacidad, zona horaria, moneda, logotipo validado por firma de archivo y horarios habituales.
- **Miembros (RF-02):** alta, ficha, edición, búsqueda sin acentos, filtros, detección de duplicados, desactivación sin borrado, notas confidenciales, historial.
- **Ministerios (RF-05):** coordinadores e integrantes con fechas de inicio/fin e historial; alcance del rol Coordinador a sus ministerios.
- **Eventos (RF-04):** tipos configurables, calendario mensual/semanal/lista, responsables, visibilidad, cancelación con motivo, duplicar evento, zona horaria de la iglesia.
- **Asistencia (RF-03):** pase de lista presente/ausente/pendiente, visitantes sin ficha, sin duplicados, correcciones auditadas.
- **Tesorería (RF-06):** aportaciones con Decimal exacto, anónimas, anulación y corrección trazables, resúmenes por concepto/método, catálogos configurables; acceso exclusivo de Tesorero.
- **Comunicados (RF-07):** borrador/publicado/archivado, públicos o internos, destacados, vigencia.
- **Dashboard (RF-08):** indicadores reales con periodo y criterio, gráficas de asistencia semanal e ingresos mensuales (solo autorizados), accesos rápidos por rol.
- **Reportes (RF-09):** miembros, asistencia por evento/periodo, ministerios, ingresos; exportación PDF y Excel con permisos y auditoría.
- `pnpm db:seed:demo`: datos ficticios de demostración (bloqueado en producción).

### Añadido — Fase 1 (fundamentos)
- Proyecto Next.js 16 + TypeScript + Tailwind 4, Prisma 7 + PostgreSQL 17, Better Auth, Zod.
- Esquema completo de datos y migración inicial con restricciones SQL (CHECK, índices parciales, triggers de inmutabilidad).
- Roles y 41 permisos configurables en BD; seed idempotente; `pnpm setup:admin` para el primer administrador.
- Inicio/cierre de sesión, recuperación de contraseña, límite de intentos, bloqueo de usuarios inactivos.
- Panel `/admin` responsive con gestión de usuarios y roles (sin autoasignación, auditado).
- API `/api/v1` (`me`, `users`) con formato de error uniforme.
- Pruebas: Vitest (unitarias + integración) y Playwright (E2E escritorio y móvil); CI en GitHub Actions; Dependabot.

### Añadido
- Fase 0: documentación de investigación, requisitos, arquitectura, modelo de datos, permisos, plan, decisiones técnicas, alojamiento, seguridad, instalación, pruebas y despliegue.
- Archivos base del repositorio: README, `.gitignore`, `.env.example`, `.gitattributes`, `docker-compose.yml`.
