# Decisiones técnicas (ADR resumidos)

Formato: decisión · alternativas evaluadas · motivo. Estado: **Aceptada** salvo indicación.

## ADR-001 Monolito modular en Next.js (App Router) + TypeScript
- Alternativas: Next.js + backend separado (NestJS/Fastify); Remix; SPA + API.
- Motivo: un solo despliegue y repositorio para un equipo pequeño; Server Components para el sitio público (SEO); rutas `/api/v1` sirven para la app móvil. Un backend separado duplicaría infraestructura sin beneficio en v1. Si la API crece, los módulos de `src/modules` se pueden mover a un servicio aparte sin reescribirlos.

## ADR-002 PostgreSQL + Prisma ORM
- Alternativas: Drizzle ORM; SQL puro (Kysely).
- Motivo: Prisma ofrece migraciones versionadas, tipo `Decimal` para dinero, consultas parametrizadas (protección SQLi) y es el ORM más documentado. Drizzle es más ligero pero Prisma reduce errores para mantenedores con menos experiencia. Restricciones que Prisma no expresa (CHECK, índices parciales) se añaden con SQL en la migración.

## ADR-003 Autenticación con Better Auth
- Alternativas: Auth.js (NextAuth) — su proveedor de credenciales está desaconsejado por los propios autores y no trae recuperación de contraseña; Lucia — descontinuado como biblioteca; Clerk/Auth0 — servicios externos de pago y datos fuera de nuestro control.
- Motivo: Better Auth incluye correo+contraseña, hash seguro, recuperación con tokens de un uso, sesiones en BD revocables, rate limiting configurable con almacenamiento en BD y soporte para clientes móviles por token (bearer) si se necesitaran. Se auto-aloja: los datos quedan en nuestra BD.
- Condición: fijar versión ≥ la que corrige CVE-2026-45364 (evasión de rate limit con IPv6) y revisar avisos de seguridad en cada actualización.

## ADR-004 Validación con Zod
- Esquemas en `modules/*/schema.ts` compartidos por formularios (react-hook-form) y servidor. El servidor **siempre** vuelve a validar.

## ADR-005 UI: Tailwind CSS + componentes accesibles (shadcn/ui sobre Radix)
- Alternativas: MUI, Chakra.
- Motivo: los componentes se copian al repositorio (sin dependencia cerrada), accesibles por teclado, fácil de tematizar (colores configurables por iglesia, estilo neutral).

## ADR-006 Pruebas: Vitest + Playwright
- Vitest para servicios y reglas (con BD PostgreSQL de prueba para integración); Playwright para flujos E2E.

## ADR-007 Reportes: `exceljs` (XLSX) y `@react-pdf/renderer` o `pdfkit` (PDF) generados en servidor
- Se decide la librería PDF en la fase 7 tras prueba rápida; ambas corren en Node sin navegador headless.

## ADR-008 Gestor de paquetes: pnpm
- Disponible en el entorno (11.x); instalación más rápida y estricta (evita dependencias fantasma).

## ADR-009 Fechas en UTC + zona horaria de la iglesia
- Se guarda UTC; se presenta con `Intl`/`date-fns-tz` usando `ChurchSettings.timezone`. Formato `dd/mm/aaaa`.

## ADR-010 Una instalación = una iglesia (v1)
- Multi-iglesia (`organizationId`) se pospone; ver `arquitectura.md`.

## ADR-011 Archivos subidos (logo)
- v1: almacenamiento en disco/volumen o en el almacenamiento del proveedor elegido, validando tipo por firma (magic bytes) y tamaño. Se abstrae en `lib/storage.ts` para cambiar a S3/R2 sin tocar módulos.

## ADR-012 Base de datos local sin Docker
- Docker no está instalado en el equipo de desarrollo. **Decisión (22/10/2026):** PostgreSQL 17 nativo en Windows (winget), con bases `iglesia_dev` e `iglesia_test`. Se conserva `docker-compose.yml` para quien sí tenga Docker.

## ADR-013 Next.js 16 con Cache Components
- `create-next-app` instala Next.js 16.4 con `cacheComponents` y `partialPrefetching` activos; Next indica que serán el comportamiento por defecto en la próxima versión mayor, así que se conservan.
- Consecuencias: la sesión se lee dentro de un `<Suspense>` (layout de `/admin`); el sitio público usará funciones `'use cache'` con `cacheTag` y se invalidan con `updateTag` desde Server Actions. Las páginas que llaman `notFound()` dentro de contenido en streaming responden con estado HTTP 200 (el contenido sí es la página 404, sin datos); la API `/api/v1` sí devuelve 401/403/404 reales.
- `middleware` ahora se llama `proxy` (`src/proxy.ts`): solo hace una verificación optimista de cookie; la autorización real está en el servidor.

## ADR-014 Prisma 7 fijado a versión estable
- La etiqueta `latest` de npm apuntaba a una versión candidata (8.0.0-rc). Se fija `prisma`, `@prisma/client` y `@prisma/adapter-pg` en **7.10.1** (estable) con el adaptador de `pg`. El cliente se genera en `src/generated/prisma` (ignorado por git; `postinstall` lo regenera).

## ADR-015 IP del cliente para límite de intentos
- Better Auth no confía en encabezados de proxy por defecto (no se puede falsificar la IP), pero sin IP usa un contador compartido por ruta: detrás de un proxy, todos los usuarios compartirían el límite de 5 intentos/min. En producción se debe definir `AUTH_IP_HEADERS` (y `AUTH_TRUSTED_PROXIES` si hay cadena de proxies) según el proveedor. Ver `despliegue.md`.

## ADR-016 App móvil con Capacitor
- En lugar de una app nativa separada (React Native/Expo), Android e iOS usan **Capacitor 8**: un contenedor nativo que abre la plataforma web. Un solo código para web, panel, portal y app; cada mejora llega a la app sin publicar otra versión.
- Consecuencias: la app necesita el sistema publicado con HTTPS (en red local se permite HTTP solo para pruebas); comparte la sesión por cookie; iOS se compila en una Mac. Detalles en `movil.md`.

## ADR-017 Política de contenido (CSP)
- `script-src` permite `'unsafe-inline'` (scripts en línea de Next y el ajuste de tema) y, **solo en desarrollo**, `'unsafe-eval'` para la recarga en caliente. Mejora futura: nonces por petición para quitar `'unsafe-inline'`.
