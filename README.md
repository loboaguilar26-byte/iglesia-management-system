# Iglesia Management System

Sistema integral de gestión multidenominacional de iglesias: sitio público institucional y panel administrativo privado (miembros, asistencia, eventos, ministerios, aportaciones, comunicados, reportes y configuración). Preparado para una futura app móvil (React Native + Expo).

> **Estado:** Fase 0 completada (investigación, requisitos, arquitectura y plan). La aplicación aún no está implementada; comienza en la Fase 1.

## Stack previsto
Next.js (App Router) · TypeScript · Tailwind CSS · PostgreSQL · Prisma · Better Auth · Zod · Vitest · Playwright · GitHub Actions.

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
Ver [docs/instalacion.md](docs/instalacion.md) (se completará en la Fase 1).

## Reglas del repositorio
- Repositorio **privado**. No subir `.env`, secretos ni datos reales de la congregación.
- Ramas `feat/*`, `fix/*`, `docs/*`; integración a `main` por pull request.
