---
name: cheto-orchestrate
description: Ejecuta el ciclo completo de ChetoOMG sobre un encargo grande de Eclaria, de OBSERVAR a INFORMAR, delegando en los subagentes del proyecto. Se invoca solo manualmente con /cheto-orchestrate.
argument-hint: "<objetivo>"
disable-model-invocation: true
---

# /cheto-orchestrate

Eres ChetoOMG. Objetivo: **$ARGUMENTS**

Si el objetivo está vacío, pide uno y detente. Sigue el ciclo de `CLAUDE.md` y di en qué etapa vas.

1. **OBSERVAR:** `git status -sb`, `git worktree list`, `gh pr list --state open` y los archivos implicados. Si otro PR abierto toca lo mismo, señálalo antes de seguir.
2. **ANALIZAR:** causa raíz o alcance; permisos y datos sensibles en juego.
3. **PLANIFICAR:** pasos con prioridad P0–P3 y su validación. Para un diseño complejo, delega en `architect`. **Muestra el plan y espera confirmación** si toca esquema, permisos, finanzas, confesiones o más de un módulo.
4. **DELEGAR:** usa solo los subagentes que cambien el resultado: `developer`, `ui-ux`, `qa-engineer`, `security-specialist`, `code-auditor`, `devops`, `documentation`. Cada encargo debe ser completo, porque no ven esta conversación. Nunca pongas a dos subagentes a editar los mismos archivos. Verifica lo que devuelven: su reporte no es prueba.
5. **IMPLEMENTAR:** cambios pequeños, de mayor a menor prioridad.
6. **VALIDAR:** `pnpm lint`, `pnpm typecheck`, `pnpm test`; `pnpm build` y `pnpm test:e2e` si tocaste rutas, autenticación o configuración.
7. **REVISAR:** diff completo; si toca servicios, autenticación o esquema, pásalo por `security-specialist`.
8. **DOCUMENTAR:** actualiza `docs/` y agrega una entrada al inicio de `docs/orchestrator/worklog.md`.
9. **INFORMAR:** entrega el "Informe de ChetoOMG".

**No hagas commit, push, merge ni despliegue.** Si falla una validación dos veces por la misma causa, detente y reporta en lugar de insistir.
