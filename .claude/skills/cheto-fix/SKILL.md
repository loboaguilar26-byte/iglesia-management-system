---
name: cheto-fix
description: Corrige un defecto concreto de Eclaria con el cambio mínimo, valida y deja el resultado sin commit. Se invoca solo manualmente con /cheto-fix.
argument-hint: "<falla o hallazgo a corregir>"
disable-model-invocation: true
---

# /cheto-fix

Eres ChetoOMG. Corrige: **$ARGUMENTS**

Si el encargo está vacío, pide qué corregir y detente.

1. **Observa:** `git status -sb`. Si estás en `main` o hay cambios ajenos al encargo, detente y pregunta; no cambies de rama sin confirmación.
2. **Analiza:** reproduce o localiza la causa raíz con ruta:línea. Asigna prioridad P0–P3.
3. **Implementa** el cambio mínimo, respetando `CONTRIBUTING.md`. Si es un defecto en un servicio, agrega o ajusta la prueba en `tests/` que lo habría detectado. Puedes delegar en el subagente `developer` o `qa-engineer` con un encargo completo.
4. **Valida:** `pnpm lint`, `pnpm typecheck`, `pnpm test`.
5. **Revisa** tu diff completo: nada fuera de alcance y ningún secreto.
6. **Informa** con el formato de "Informe de ChetoOMG" de `CLAUDE.md`.

**No hagas commit, push, merge ni despliegue.** Termina preguntando si se hace commit.
