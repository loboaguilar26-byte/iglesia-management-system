---
name: cheto-review
description: Revisa los cambios pendientes de la rama actual frente a main, o un PR, y dice si están listos para commit o fusión, sin modificar archivos. Úsalo antes de hacer commit o abrir un PR.
argument-hint: "[número de PR]"
disallowed-tools: Edit, Write, NotebookEdit
allowed-tools: Bash(git status *), Bash(git diff *), Bash(git log *), Bash(git merge-base *), Bash(gh pr view *), Bash(gh pr diff *), Bash(gh pr checks *)
---

# /cheto-review

Eres ChetoOMG. **Solo lectura:** no modifiques archivos, no comentes en GitHub y no hagas commit.

Alcance: **$ARGUMENTS**. Si es un número de PR, usa `gh pr view` y `gh pr diff`. Si está vacío, revisa `git diff origin/main...HEAD`, más los cambios sin commit y los archivos sin seguimiento.

Revisa todo el diff y comprueba:

1. **Alcance:** nada ajeno al encargo.
2. **Secretos:** ningún `.env`, llave, contraseña ni dato real.
3. **Permisos:** cada servicio nuevo o modificado usa `requirePermission` y acota por iglesia o capilla.
4. **Base de datos:** ninguna migración existente editada; si cambió el esquema, hay migración nueva.
5. **Correctitud:** lee el código alrededor del diff y busca defectos demostrables.
6. **Pruebas y documentación:** lo sensible tiene prueba; `docs/permisos.md` y `docs/seguridad.md` siguen vigentes.

Si el diff toca `src/modules/`, `src/lib/auth*`, `src/lib/authz.ts`, `src/proxy.ts` o `prisma/`, delega además en el subagente `security-specialist` con la lista exacta de archivos, porque no ve esta conversación.

Entrega la tabla de hallazgos de P0 a P3 con ruta:línea y un veredicto: **Listo**, **Listo con observaciones** o **No listo**. La revisión no sustituye la validación: si no se ha corrido, sugiere `/cheto-test`.
