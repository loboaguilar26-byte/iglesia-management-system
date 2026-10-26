# Despliegue en Firebase App Hosting

Proyecto Firebase: **iglesia-gestion-mx** · Backend: **iglesia** · Región: `us-central1`
URL prevista: `https://iglesia--iglesia-gestion-mx.us-central1.hosted.app`

Base de datos: **PostgreSQL en Neon** (plan gratuito para iniciar).

## Pasos que hace la persona responsable (datos de pago y cuentas)
1. **Plan Blaze:** https://console.firebase.google.com/project/iglesia-gestion-mx/usage/details → “Modificar plan” → Blaze. Recomendado: crear una **alerta de presupuesto** (p. ej. US$10/mes) en Google Cloud Billing.
2. **Neon:** crear cuenta en https://neon.com, proyecto “iglesia” (región AWS us-east-1 o us-east-2, cercana a us-central1) y copiar la cadena de conexión *pooled* con `sslmode=require`.
3. **Guardar secretos** (los valores se escriben en la terminal, nunca en git ni en el chat):
   ```bash
   firebase apphosting:secrets:set DATABASE_URL
   firebase apphosting:secrets:set BETTER_AUTH_SECRET
   ```
   Para `BETTER_AUTH_SECRET` usar un valor aleatorio: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
4. Para migrar desde tu equipo, crea `.env.production.local` (ignorado por git) con `DATABASE_URL=...` de Neon.

## Pasos técnicos
```bash
# 1. Migraciones y datos base en Neon (sin datos de demostración)
pnpm dlx dotenv-cli -e .env.production.local -- pnpm db:deploy
pnpm dlx dotenv-cli -e .env.production.local -- pnpm db:seed
pnpm dlx dotenv-cli -e .env.production.local -- pnpm setup:admin

# 2. Crear el backend (una sola vez) y desplegar desde el código local
firebase apphosting:backends:create --backend iglesia --primary-region us-central1
firebase deploy --only apphosting
```

## Configuración (`apphosting.yaml`)
- 0–2 instancias (sin tráfico no hay costo de cómputo), 1 CPU, 512 MiB.
- Secretos: `DATABASE_URL`, `BETTER_AUTH_SECRET` (Secret Manager).
- `BETTER_AUTH_URL` = URL pública; actualizar si se usa dominio propio.
- `AUTH_IP_HEADERS` / `AUTH_TRUSTED_PROXIES`: IP real del cliente detrás del balanceador de Google, para que el límite de intentos sea por persona. **Verificar tras el primer despliegue** (bitácora → IP registrada) y ajustar si aparece la IP del balanceador.
- El logotipo se guarda en la BD (tabla `stored_file`), porque el disco de Cloud Run no es persistente.

## Lista de verificación previa a producción
- [ ] Plan Blaze y alerta de presupuesto.
- [ ] Secretos configurados (no en git).
- [ ] `prisma migrate deploy` aplicado (nunca `migrate dev` en producción).
- [ ] **No** ejecutar `db:seed:demo` en producción (bloqueado si `NODE_ENV=production`).
- [ ] Primer administrador con `setup:admin`.
- [ ] Respaldos: Neon conserva historial (point-in-time) según plan; además exportar `pg_dump` periódico cifrado.
- [ ] Aviso de privacidad publicado y datos institucionales reales configurados.
- [ ] Dominio propio (opcional) y actualizar `BETTER_AUTH_URL`.

## Costos estimados (verificar en la consola)
- App Hosting / Cloud Run: con 0 instancias mínimas y tráfico bajo, normalmente dentro de la capa gratuita o pocos dólares al mes.
- Neon Free: US$0 (≈0.5 GB). Plan de pago por uso si se excede.
- Fuente de precios: https://firebase.google.com/pricing · https://neon.com/pricing
