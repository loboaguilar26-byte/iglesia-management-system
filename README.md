# Eclaria · Gestión integral de iglesias

Sistema multidenominacional para administrar una iglesia y su red de capillas: sitio público, panel administrativo, portal del miembro y app para Android e iOS, todo sobre la misma base.

> Repositorio **privado**. No subas `.env`, contraseñas, llaves ni datos reales de la congregación.

## Apartados

| Apartado | Ruta | Para quién |
|---|---|---|
| Sitio público | `/` | Visitantes, sin cuenta: inicio, nosotros, horarios, eventos, ministerios, comunicados, contacto, confesiones y privacidad |
| Panel administrativo | `/admin` | Personal según su rol |
| Portal del miembro | `/mi-cuenta` | Miembros con cuenta: solo sus propios datos |
| App móvil | `android/`, `ios/` | La misma plataforma dentro de una app nativa (Capacitor) |

**Panel:** inicio con indicadores, capillas, miembros, seguimiento pastoral, peticiones de oración, confesiones, ministerios, eventos y asistencia, tesorería (ofrendas, validación, gastos), comunicados, reportes PDF/Excel, iglesias y franquicias, usuarios y roles, bitácora y configuración.

**Portal del miembro:** agenda con confirmación de asistencia y descarga al calendario, ministerios (solicitar unirse), oración, aportaciones con constancia anual en PDF, asistencia con rachas y descarga de "mis datos" (derecho de acceso LFPDPPP).

**Confesiones:** cita en la iglesia o una capilla y mensaje anónimo; todo se cifra (AES-256-GCM) y solo el rol Sacerdote lo lee.

Los permisos se comprueban en el servidor; ver [docs/permisos.md](docs/permisos.md).

## Inicio rápido

Requisitos: Node 22 o superior, pnpm 11 y PostgreSQL 17 (ver [docs/instalacion.md](docs/instalacion.md)).

```bash
cp .env.example .env    # y completa los valores (genera tus propias claves)
pnpm install
pnpm db:deploy          # aplica las migraciones
pnpm db:seed            # roles, permisos y catálogos
pnpm setup:admin        # primer administrador
pnpm db:seed:demo       # opcional: datos ficticios de demostración
pnpm dev                # http://localhost:3000
```

## Comandos

| Comando | Para qué |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` / `pnpm start` | Compilación y servidor de producción |
| `pnpm lint` · `pnpm typecheck` | Estilo y tipos |
| `pnpm check:unused` | Archivos, exports y dependencias sin uso (knip) |
| `pnpm test` · `pnpm test:e2e` | Pruebas unitarias/integración (Vitest) y de punta a punta (Playwright) |
| `pnpm db:migrate` | Crear una migración nueva en desarrollo |
| `pnpm db:deploy` · `pnpm db:seed` | Aplicar migraciones y datos base |
| `pnpm mobile:apk` | APK de prueba de Android ([docs/movil.md](docs/movil.md)) |

Antes de compilar (`pnpm build`) detén `pnpm dev`: ambos usan la carpeta `.next`.

## Estructura de carpetas

```
.
├── src/
│   ├── app/                 Páginas y rutas (Next.js App Router)
│   │   ├── (public)/        Sitio público
│   │   ├── (auth)/          Inicio de sesión y recuperación de contraseña
│   │   ├── admin/           Panel administrativo (un folder por apartado)
│   │   ├── mi-cuenta/       Portal del miembro
│   │   └── api/v1/          API REST (mismos permisos que el panel)
│   ├── modules/             Lógica de negocio por tema: service.ts (reglas y permisos) y schema.ts (validación)
│   ├── components/          Componentes de interfaz compartidos (ui/ = botones, campos, tarjetas)
│   ├── lib/                 Utilidades: autenticación, permisos, fechas, dinero, errores, bitácora
│   └── generated/           Cliente de Prisma (se genera; no se edita ni se sube)
├── prisma/                  Esquema de la base de datos, migraciones y datos iniciales (seed)
├── tests/                   Pruebas unitarias e integración (Vitest)
├── e2e/                     Pruebas de punta a punta (Playwright)
├── docs/                    Documentación del proyecto (índice en docs/README.md)
├── public/                  Logotipo, íconos y service worker
├── android/ · ios/          Proyectos nativos de la app (Capacitor)
├── mobile/www/              Pantalla "sin conexión" incluida en la app
├── scripts/                 Primer administrador, íconos móviles y verificación completa
├── dataconnect/             Configuración de la base de datos en Firebase
└── .github/                 CI, Dependabot y plantillas de PR e issues
```

## Cómo colaborar

Todo cambio entra a `main` por pull request y con el CI en verde. El flujo completo está en [CONTRIBUTING.md](CONTRIBUTING.md); el historial de cambios, en [CHANGELOG.md](CHANGELOG.md).

## Stack

Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind CSS 4 · PostgreSQL 17 · Prisma 7 · Better Auth · Zod · Capacitor 8 · Vitest · Playwright · GitHub Actions.
