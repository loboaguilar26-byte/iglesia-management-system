# Instalación (desarrollo local)

Verificado en Windows 11 con Node 24.18, pnpm 11.1 y PostgreSQL 17.11 (22/10/2026).

## Requisitos
- Node.js ≥ 22 y pnpm ≥ 10
- PostgreSQL 16 o superior (nativo, Docker con `docker compose up -d`, o un servicio gestionado)
- Git

## 1. PostgreSQL

### Windows (nativo)
```powershell
winget install --id PostgreSQL.PostgreSQL.17 -e
```
El instalador pide una contraseña para el superusuario `postgres`. Después crea un usuario y dos bases (desarrollo y pruebas):
```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -h localhost -U postgres -c "CREATE ROLE iglesia LOGIN CREATEDB PASSWORD 'elige-una-contraseña';" -c "CREATE DATABASE iglesia_dev OWNER iglesia;" -c "CREATE DATABASE iglesia_test OWNER iglesia;"
```

### Con Docker
`docker compose up -d` levanta PostgreSQL con el usuario `iglesia` y la base `iglesia_dev`; crea `iglesia_test` manualmente.

## 2. Proyecto
```bash
git clone https://github.com/loboaguilar26-byte/iglesia-management-system.git
cd iglesia-management-system
cp .env.example .env
```
Edita `.env`:
- `DATABASE_URL` y `TEST_DATABASE_URL` con la contraseña elegida.
- `BETTER_AUTH_SECRET`: valor aleatorio, p. ej. `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
- `CONFESSIONS_ENCRYPTION_KEY`: clave independiente de 32 bytes en base64, generada con `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Respáldala de forma segura: sin ella los datos cifrados de confesiones son irrecuperables.

```bash
pnpm install          # también genera el cliente Prisma
pnpm db:migrate       # aplica migraciones a iglesia_dev
pnpm db:seed          # roles, permisos y catálogos (sin datos personales)
pnpm setup:admin      # crea el primer administrador (solo si no hay usuarios)
pnpm db:seed:demo     # opcional: datos ficticios (48 personas, ministerios, eventos, asistencia, aportaciones)
pnpm dev              # http://localhost:3000 (sitio) · /login (panel)
```

## 3. Pruebas
```bash
pnpm test                            # unitarias + integración (usa TEST_DATABASE_URL)
pnpm build
pnpm exec playwright install chromium   # solo la primera vez
pnpm test:e2e                        # E2E contra el build de producción en el puerto 3100
```

## Recuperación de contraseña en desarrollo
No hay proveedor de correo conectado todavía. En desarrollo, el enlace de restablecimiento se imprime en la consola donde corre `pnpm dev`. En producción no se envía ni se registra el enlace (ver `seguridad.md`).

## Nota sobre OneDrive
Si el repositorio está dentro de OneDrive, `node_modules` y `.next` (decenas de miles de archivos) se sincronizan y pueden causar lentitud o archivos bloqueados. Se recomienda clonar fuera de OneDrive (p. ej. `C:\dev\iglesia-management-system`).
