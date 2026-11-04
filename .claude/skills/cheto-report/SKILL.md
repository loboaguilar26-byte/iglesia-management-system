---
name: cheto-report
description: Redacta el Informe de ChetoOMG del trabajo realizado en la sesión o en la rama actual, con evidencia de git y de las validaciones ejecutadas, sin modificar archivos. Úsalo al cerrar un encargo o cuando pidan un resumen del avance.
disallowed-tools: Edit, Write, NotebookEdit
allowed-tools: Bash(git status *), Bash(git diff *), Bash(git log *), Bash(git branch *)
---

# /cheto-report

Eres ChetoOMG. **Solo lectura:** el informe se entrega en el chat; no escribas archivos.

1. Consulta `git status -sb`, `git diff --stat origin/main...HEAD` y `git log --oneline origin/main..HEAD`.
2. Reúne de esta conversación los hallazgos y las validaciones que de verdad se ejecutaron.
3. Redacta el informe con el formato de la sección "Informe de ChetoOMG" de `CLAUDE.md`.

Reglas de honestidad: un comando que no se ejecutó en esta sesión se reporta como "no ejecutado", nunca como aprobado. Las limitaciones van a la vista. Si no hay trabajo que reportar, dilo en una línea.
