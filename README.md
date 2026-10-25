# Iglesia Management System

Sistema integral de gestión multidenominacional de iglesias: sitio público institucional y panel administrativo privado (miembros, asistencia, eventos, ministerios, aportaciones, comunicados, reportes y configuración). Preparado para una futura app móvil (React Native + Expo).

> **Estado:** sitio público y los 10 módulos administrativos (RF-01 a RF-10) implementados y probados localmente. Pendiente: estabilización, despliegue (requiere autorización) y preparación móvil.

## Qué incluye
- **Sitio público:** inicio, nosotros, horarios, eventos, comunicados, contacto y aviso de privacidad, editables desde el panel.
- **Panel `/admin`:** inicio con indicadores, miembros, ministerios, eventos y calendario, asistencia, tesorería, comunicados, reportes (PDF/Excel), usuarios y roles, configuración.
- Permisos por rol aplicados en el servidor (ver [docs/permisos.md](docs/permisos.md)).

## Inicio rápido
```bash
pnpm install
pnpm db:migrate
pnpm db:seed          # roles, permisos y catálogos
pnpm setup:admin      # primer administrador
pnpm db:seed:demo     # opcional: datos ficticios de demostración
pnpm dev
```

## Stack
Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · PostgreSQL 17 · Prisma 7 · Better Auth · Zod · Vitest · Playwright · GitHub Actions.

## Documentación
| Documento | Contenido |
|---|---|
| [docs/investigacion.md](docs/investigacion.md) | Procesos de iglesias, referencias, marco legal México |
| [docs/requisitos.md](docs/requisitos.md) | RF-01…RF-11, RNF, pendientes de validar |
| [docs/arquitectura.md](docs/arquitectura.md) | Arquitectura y estructura de carpetas |
| [docs/modelo-datos.md](docs/modelo-datos.md) | Entidades, relaciones y reglas |
| [docs/permisos.md](docs/permisos.md) | Matriz de roles y permisos |
| [docs/plan-desarrollo.md](docs/plan-desarrollo.md) | Fases y criterios de aceptación |
| [docs/decisiones-tecnicas.md](docs/decisiones-tecnicas.md) | ADRs |
| [docs/analisis-alojamiento.md](docs/analisis-alojamiento.md) | Comparación de hosting y recomendación |
| [docs/seguridad.md](docs/seguridad.md) | Controles de seguridad y privacidad |
| [docs/instalacion.md](docs/instalacion.md) | Instalación local |
| [docs/pruebas.md](docs/pruebas.md) | Estrategia y registro de pruebas |
| [docs/despliegue.md](docs/despliegue.md) | Despliegue y respaldos |

## Instalación
Ver [docs/instalacion.md](docs/instalacion.md).

## Reglas del repositorio
- Repositorio **privado**. No subir `.env`, secretos ni datos reales de la congregación.
- Ramas `feat/*`, `fix/*`, `docs/*`; integración a `main` por pull request.
