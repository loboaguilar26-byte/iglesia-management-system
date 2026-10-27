# Arquitectura

## Resumen

**Monolito modular** en Next.js (App Router, TypeScript) que expone:
1. Sitio público (`/`) — Server Components, solo DTOs públicos.
2. Panel administrativo (`/admin`) — protegido por sesión + permisos.
3. API REST versionada (`/api/v1/...`) — consumida por el panel cuando conviene y por integraciones externas. La app móvil (Capacitor) abre la misma web, ver `movil.md`.

Toda la lógica de negocio vive en `src/modules/<modulo>/` y **no** depende de React. Las páginas, Server Actions y rutas API son adaptadores delgados que llaman a los servicios.

```mermaid
flowchart LR
  subgraph Clientes
    W[Navegador: sitio público]
    A[Navegador: panel /admin]
    M[App móvil futura]
  end
  subgraph Next.js
    P[Páginas públicas]
    AD[Páginas admin + Server Actions]
    API[/api/v1 REST/]
    AUTH[Better Auth]
    subgraph Módulos de dominio
      S1[members] --- S2[events] --- S3[attendance]
      S4[ministries] --- S5[finance] --- S6[announcements]
      S7[reports] --- S8[settings] --- S9[users/authz] --- S10[audit]
    end
  end
  DB[(PostgreSQL)]
  W --> P --> S6
  A --> AD --> S1
  M --> API --> S1
  AD --> AUTH
  API --> AUTH
  Módulos de dominio --> PR[Prisma] --> DB
```

## Estructura de carpetas

```
src/
  app/
    (public)/            # sitio público: layout propio
    admin/               # panel: layout con sidebar, guard de sesión
    api/v1/              # rutas REST
    api/auth/[...all]/   # handler de Better Auth
  modules/
    <modulo>/
      schema.ts          # Zod: contratos de entrada/salida (compartidos cliente/servidor)
      service.ts         # casos de uso; reciben `actor` y verifican permisos
      repository.ts      # acceso a Prisma (solo si el servicio lo justifica)
      dto.ts             # mapeos a DTOs (públicos / admin)
  lib/
    auth.ts              # configuración Better Auth
    authz.ts             # can(actor, permiso, recurso?) + requirePermission
    db.ts                # cliente Prisma singleton
    audit.ts             # registrar AuditLog
    money.ts             # utilidades Decimal
    dates.ts             # zona horaria y formato dd/mm/aaaa
  components/ui/         # tabla, formulario, diálogo, paginación, etc.
prisma/
  schema.prisma
  migrations/
  seed.ts
scripts/setup-admin.ts
tests/ (unit, integration) · e2e/ (Playwright)
```

## Capas

| Capa | Responsabilidad | Ubicación |
|---|---|---|
| Presentación | UI, formularios, navegación | `app/`, `components/` |
| Adaptadores | Server Actions / rutas API: parsean entrada, obtienen sesión, llaman servicio, traducen errores a HTTP | `app/admin/**/actions.ts`, `app/api/v1/**/route.ts` |
| Aplicación/dominio | Reglas de negocio, autorización por recurso, transacciones, auditoría | `modules/*/service.ts` |
| Persistencia | Prisma | `lib/db.ts`, `modules/*/repository.ts` |

**Regla:** autorización siempre en el servicio (`requirePermission(actor, "members:update")`), aunque la UI también oculte botones.

## Autenticación

- **Better Auth** con adaptador Prisma: correo + contraseña, recuperación, sesiones en BD (revocables), rate limiting en BD (no en memoria: compatible con serverless).
- Web: cookie de sesión `HttpOnly`.
- Móvil: la app Android/iOS (Capacitor) abre la plataforma web y usa la misma cookie de sesión. Si algún día hay un cliente nativo propio, usaría el plugin de token (bearer) de Better Auth contra `/api/v1`.
- Registro público **deshabilitado**; usuarios los crea un administrador.

## Errores de API

Formato uniforme:
```json
{ "error": { "code": "FORBIDDEN", "message": "No tienes permiso para esta acción." } }
```
Códigos: `UNAUTHENTICATED` 401, `FORBIDDEN` 403, `NOT_FOUND` 404, `VALIDATION_ERROR` 422 (con `details`), `CONFLICT` 409, `RATE_LIMITED` 429, `INTERNAL` 500.

Paginación: `?page=1&pageSize=25` → `{ data: [], meta: { page, pageSize, total } }`.

## Multi-iglesia futura

v1 es **una instalación = una iglesia**. Para no cerrar la puerta: todas las tablas de negocio podrán recibir `organizationId` en una migración futura; los servicios ya reciben un `actor` (contexto) donde se añadiría la organización. No se implementa ahora (evita complejidad innecesaria).

## Despliegue

Ver `analisis-alojamiento.md` y `despliegue.md`. Local: Node 24 + PostgreSQL (instalado o Docker).
