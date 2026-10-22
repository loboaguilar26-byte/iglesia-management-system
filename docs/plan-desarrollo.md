# Plan de desarrollo

Cada fase se trabaja en ramas `feat/*`, se integra a `main` por pull request con CI en verde, y actualiza `CHANGELOG.md`.

| Fase | Rama(s) | Depende de | Estado |
|---|---|---|---|
| 0 Preparación y análisis | `main` (commit inicial) | — | ✅ Completada (22/10/2026) |
| 1 Fundamentos | `feat/project-foundation`, `feat/authentication` | 0 | Siguiente |
| 2 Sitio público | `feat/public-website` | 1 | Pendiente |
| 3 Miembros y ministerios | `feat/members`, `feat/ministries` | 1 | Pendiente |
| 4 Eventos y asistencia | `feat/events`, `feat/attendance` | 3 | Pendiente |
| 5 Tesorería | `feat/finances` | 1, 3 | Pendiente |
| 6 Comunicados y dashboard | `feat/announcements`, `feat/dashboard` | 3, 4, 5 | Pendiente |
| 7 Reportes y configuración | `feat/reports`, `feat/settings` | 3–6 | Pendiente |
| 8 Estabilización | `fix/*` | 1–7 | Pendiente |
| 9 Preparación móvil | `docs/mobile-api` | 8 | Pendiente |

## Fase 1 — Fundamentos (detalle)

1. Next.js + TypeScript estricto + Tailwind + ESLint + Prettier con pnpm.
2. Prisma + esquema completo de `modelo-datos.md` + primera migración + CHECKs/índices parciales en SQL.
3. `lib/db.ts`, `lib/authz.ts`, `lib/audit.ts`, `lib/money.ts`, `lib/dates.ts`.
4. Better Auth: login, logout, recuperación (en desarrollo el correo se imprime en consola: **así se documenta**, no se simula un envío real), sesiones, rate limit.
5. Seed de roles/permisos (idempotente) + `pnpm setup:admin` interactivo.
6. Layout `/admin` con guard, sidebar responsive, página de login.
7. Gestión de usuarios (alta, roles, activar/desactivar) con regla de no autoasignación.
8. Vitest (unit + integración con BD de prueba) y Playwright (login).
9. GitHub Actions: lint, typecheck, test, build.

**Criterios de aceptación Fase 1:** `pnpm install && pnpm db:migrate && pnpm setup:admin && pnpm dev` funciona siguiendo el README; login/logout/recuperación pasan en Playwright; pruebas de autorización (401/403, autoasignación) pasan; CI verde en el PR.

## Criterios por módulo
Ver `requisitos.md` (cada RF lista sus criterios) y `pruebas.md`.
