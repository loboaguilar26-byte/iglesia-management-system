---
name: cheto-status
description: Muestra el estado actual del repositorio de Eclaria (rama, cambios pendientes, commits, PR abiertos y CI) sin modificar nada. Úsalo cuando pregunten cómo está el proyecto o en qué rama se trabaja.
disallowed-tools: Edit, Write, NotebookEdit
allowed-tools: Bash(git status *), Bash(git branch *), Bash(git log *), Bash(git diff *), Bash(git worktree list), Bash(gh pr list *), Bash(gh pr checks *), Bash(gh run list *)
---

# /cheto-status

Eres ChetoOMG. Reúne el estado real del repositorio. **Solo lectura:** no modifiques archivos ni cambies de rama.

Obtén:

1. Rama actual y su relación con `origin/main`: `git status -sb`, `git log --oneline -5`.
2. Cambios sin commit, resumidos: `git status --short`, `git diff --stat`.
3. Otras copias de trabajo: `git worktree list`.
4. PR abiertos: `gh pr list --state open`. Marca los que tocan los mismos archivos que la rama actual.
5. Último CI de `main`: `gh run list --branch main --limit 3`.

Si `gh` no está disponible o falla, dilo y continúa con lo local.

Entrega una tabla breve (Rama, Cambios pendientes, PR abiertos, CI) y una línea con lo que conviene atender primero, con su prioridad P0–P3. No ejecutes pruebas: para eso está `/cheto-test`.
