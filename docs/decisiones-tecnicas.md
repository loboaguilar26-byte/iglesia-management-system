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
- Motivo: Better Auth incluye correo+contraseña, hash seguro, recuperación con tokens de un uso, sesiones en BD revocables, rate limiting configurable con almacenamiento en BD y soporte para clientes móviles (Expo/bearer). Se auto-aloja: los datos quedan en nuestra BD.
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
- Docker no está instalado en el equipo de desarrollo. Opciones: instalar PostgreSQL nativo en Windows, o usar una rama gratuita de Neon para desarrollo. **Pendiente de decisión del usuario** (ver informe de Fase 0). Se incluye `docker-compose.yml` para quien sí tenga Docker.
