# Despliegue en Vercel + Neon

Sitio publicado: **https://eclaria-gilt.vercel.app**

| Pieza | Servicio | Plan |
|---|---|---|
| Aplicación (Next.js) | Vercel, proyecto `eclaria` | Hobby (gratis) |
| Base de datos (PostgreSQL) | Neon, conectado desde la integración de Vercel | Free (≈0.5 GB) |

Todos usan **la misma base de datos**: el sitio publicado, el panel y la app móvil leen y escriben en Neon.
Para que el equipo entre al panel, el administrador crea una cuenta para cada persona (ver
[equipo.md](equipo.md)); no se comparten contraseñas ni se suben a la repo.

> El plan Hobby de Vercel es para uso no comercial y tiene un solo dueño. Si el proyecto crece o se
> necesita que varias personas administren Vercel, evaluar Vercel Pro (ver [analisis-alojamiento.md](analisis-alojamiento.md)).

## Variables de entorno (Vercel → Settings → Environment Variables, producción)

| Variable | Origen |
|---|---|
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` y demás `PG*` | Las agrega la integración de Neon |
| `BETTER_AUTH_URL` | `https://eclaria-gilt.vercel.app` (cambiar si se usa dominio propio) |
| `BETTER_AUTH_SECRET` | Aleatorio: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `CONFESSIONS_ENCRYPTION_KEY` | Aleatorio (mismo comando). **Respáldala fuera de la base**: sin ella no se pueden leer las confesiones |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Cloud (opcional; ver abajo) |

Los valores se escriben en la terminal o en el panel de Vercel, nunca en git ni en el chat:

```bash
vercel env add NOMBRE production
```

## Publicar una nueva versión

El proyecto de Vercel no está conectado a GitHub: se publica desde el código local de `main`.

```bash
git switch main && git pull
vercel deploy --prod --yes
```

Vercel corre `pnpm vercel-build` (`prisma generate && next build`). Las migraciones **no** corren
solas: si la versión trae migraciones nuevas, aplícalas antes de publicar (siguiente sección).

## Migraciones y datos en Neon

Copia las variables de producción a `.env.production.local` (ignorado por git) con
`vercel env pull .env.production.local --environment=production`, y usa la conexión directa
(`DATABASE_URL_UNPOOLED`). En PowerShell:

```powershell
$env:DATABASE_URL = (Select-String -Path .env.production.local -Pattern '^DATABASE_URL_UNPOOLED=').Line.Split('=',2)[1].Trim('"')
pnpm db:deploy          # migraciones (nunca `db:migrate` en producción)
pnpm db:seed            # roles, permisos y catálogos (idempotente)
pnpm setup:admin        # primer administrador (una sola vez)
pnpm db:seed:contenido  # textos y contenido de ejemplo; solo llena lo vacío
```

`db:seed:demo` está bloqueado en producción: no cargues datos ficticios de personas en Neon.

## Inicio de sesión con Google (opcional)

1. En https://console.cloud.google.com → *Google Auth Platform*:
   - *Branding*: nombre "Eclaria", correo de soporte. *Audience*: **External** y luego *Publish app*
     (mientras esté "En pruebas" solo entran los correos agregados como usuarios de prueba).
   - *Clients → Create client → Web application*:
     - Orígenes de JavaScript: `https://eclaria-gilt.vercel.app` y `http://localhost:3000`
     - URI de redirección: `https://eclaria-gilt.vercel.app/api/auth/callback/google` y
       `http://localhost:3000/api/auth/callback/google`
2. Guarda el ID y el secreto en Vercel (`vercel env add GOOGLE_CLIENT_ID production` y
   `vercel env add GOOGLE_CLIENT_SECRET production --sensitive`) y vuelve a publicar.
3. En tu `.env` local también puedes ponerlos para probarlo en `localhost`.

Quien crea su cuenta con Google recibe solo el rol **Miembro** (portal). Si existe una ficha con su
mismo correo, se vincula sola; si no, secretaría la vincula desde *Usuarios*. El personal que ya
tiene cuenta puede entrar con Google si usa el mismo correo (se vincula; no se crea otra).

## Archivos e imágenes

Logotipo, portada y fotos de capillas se guardan en la base (tabla `stored_file`), porque el disco
de Vercel no es persistente.

## Lista de verificación

- [x] Migraciones aplicadas en Neon y datos base cargados.
- [x] Primer administrador creado.
- [x] Secretos solo en Vercel y en `.env.production.local` (no en git).
- [ ] Datos reales de contacto, foto de portada y aviso de privacidad en *Configuración*.
- [ ] Capillas de ejemplo editadas o archivadas.
- [ ] Respaldo: Neon Free guarda historial corto; exportar `pg_dump` cifrado periódicamente.
- [ ] Dominio propio (opcional): agregarlo en Vercel y actualizar `BETTER_AUTH_URL`.
