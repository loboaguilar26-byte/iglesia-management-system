# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [Sin publicar]

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
