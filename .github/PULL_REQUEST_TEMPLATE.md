## Qué cambia
<!-- Describe el cambio y por qué es necesario. -->

## Cómo lo probé
<!-- Pasos para revisarlo (ruta, rol con el que entraste, datos de prueba). -->

## Lista de verificación
- [ ] Partí de `main` actualizado y no dupliqué páginas ya existentes (sitio en `(public)`, panel en `admin`, portal en `mi-cuenta`).
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build` pasan.
- [ ] Si cambié la base de datos, incluí la migración y no edité migraciones que ya estaban en `main`.
- [ ] Si agregué permisos, actualicé `src/lib/permissions.ts` y `docs/permisos.md`.
- [ ] No incluí `.env`, contraseñas, llaves ni datos reales.
