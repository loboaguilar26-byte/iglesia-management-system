# Cómo colaborar en Eclaria

Todos trabajamos sobre **una sola versión**: la rama `main`. Nadie sube cambios directo a `main`; todo entra por pull request (PR) y solo se fusiona cuando el CI pasa.

## Flujo de trabajo

1. **Parte siempre de `main` actualizado:**
   ```bash
   git checkout main
   git pull
   pnpm install
   pnpm db:deploy
   ```
2. **Crea una rama con un nombre claro:**

   | Prefijo | Para |
   |---|---|
   | `feat/` | Funciones nuevas (`feat/agenda-capillas`) |
   | `fix/` | Correcciones (`fix/login-movil`) |
   | `docs/` | Documentación |
   | `chore/` | Mantenimiento, dependencias, limpieza |

   ```bash
   git checkout -b feat/mi-cambio
   ```
3. **Trabaja en cambios pequeños** y haz commits con mensajes que expliquen el porqué (`feat: …`, `fix: …`, `docs: …`, `chore: …`).
4. **Antes de subir, verifica** (con `pnpm dev` detenido):
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm build
   ```
5. **Sube la rama y abre un PR hacia `main`** usando la plantilla. Explica qué cambia y cómo lo probaste.
6. **Si `main` avanzó mientras trabajabas**, trae los cambios a tu rama (`git pull origin main`), resuelve conflictos conservando lo de ambos lados y vuelve a verificar. No uses `--force` sobre ramas compartidas.
7. **Fusiona solo con el CI en verde.** Después borra la rama.

## Reglas del proyecto

- **Una sola interfaz.** El sitio público está en `src/app/(public)`, el panel en `src/app/admin` y el portal en `src/app/mi-cuenta`. No crees páginas paralelas fuera de esas carpetas: si algo ya existe, mejóralo ahí.
- **La lógica va en `src/modules/<tema>/service.ts`**: ahí se validan los datos (Zod) y los permisos. Las páginas y las rutas de la API solo llaman a esos servicios.
- **Permisos en el servidor.** Cada servicio usa `requirePermission`; ocultar un botón no es seguridad. Si agregas un permiso, regístralo en `src/lib/permissions.ts` y en [docs/permisos.md](docs/permisos.md).
- **Base de datos:** cambia `prisma/schema.prisma` y crea la migración con `pnpm db:migrate --name descripcion`. Nunca edites una migración que ya está en `main`.
- **Datos sensibles:** no subas `.env`, contraseñas, llaves ni datos reales. Las confesiones y peticiones de oración no se registran en la bitácora con su contenido.
- **Código sin uso:** `pnpm check:unused` debe quedar limpio.
- **Interfaz en español**, fechas dd/mm/aaaa y montos en MXN.

## Reportar fallas o pedir funciones

Usa las plantillas de *Issues* en GitHub: **Reportar una falla** o **Proponer una función**.
