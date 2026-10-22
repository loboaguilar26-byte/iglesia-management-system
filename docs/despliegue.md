# Despliegue

> **No se ha desplegado nada.** Cualquier despliegue requiere autorización expresa.

## Propuesta (pendiente de aprobación)
Ver `analisis-alojamiento.md`. Principal: Railway; alternativa: Vercel Pro + Neon.

## Lista de verificación previa a producción
- [ ] `BETTER_AUTH_SECRET` aleatorio (≥ 32 bytes) en variables del proveedor, no en git.
- [ ] `DATABASE_URL` con TLS (`sslmode=require`).
- [ ] Migraciones con `prisma migrate deploy` (nunca `migrate dev` en producción).
- [ ] **No** ejecutar seed de demostración en producción (el script lo bloquea si `NODE_ENV=production`).
- [ ] Crear primer admin con `setup:admin`.
- [ ] Respaldos diarios + prueba de restauración.
- [ ] Dominio y HTTPS.
- [ ] Aviso de privacidad publicado.

## Respaldos
`pg_dump --format=custom` diario, cifrado (age/gpg), retención 30 días, copia fuera del proveedor principal. Restauración: `pg_restore --clean --if-exists`. Probar trimestralmente.
