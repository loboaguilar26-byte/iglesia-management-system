# Estrategia de pruebas

| Nivel | Herramienta | Qué cubre |
|---|---|---|
| Unitarias | Vitest | Reglas puras: dinero, fechas, permisos (`can`), normalización de nombres |
| Integración | Vitest + PostgreSQL de prueba | Servicios con BD real: autorización, duplicados, transacciones, auditoría |
| E2E | Playwright | Flujos: login, recuperación, alta de miembro, pase de lista, registro de aportación, exportaciones; móvil y escritorio |
| Calidad | ESLint, `tsc --noEmit`, `next build`, `pnpm audit` | En CI en cada PR |

Lista mínima de casos: ver sección 11/13 del prompt maestro, replicada por módulo en `requisitos.md`.

## Registro de ejecuciones

| Fecha | Fase | Comando | Resultado |
|---|---|---|---|
| 22/10/2026 | 0 | Verificación de entorno (`git`, `gh`, `node`, `pnpm`) | OK — Docker y PostgreSQL **no** instalados |
| 22/10/2026 | 0 | Revisión de secretos en archivos a commitear | Ver informe de Fase 0 |

Aún no hay código de aplicación, por lo que no hay pruebas automatizadas que ejecutar en la Fase 0.
