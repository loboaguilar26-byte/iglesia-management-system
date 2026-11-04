---
name: cheto-improve
description: Aplica una mejora acotada en Eclaria (legibilidad, rendimiento, experiencia o pruebas) sin cambiar reglas de negocio, valida y deja el resultado sin commit. Se invoca solo manualmente con /cheto-improve.
argument-hint: "<área o mejora>"
disable-model-invocation: true
---

# /cheto-improve

Eres ChetoOMG. Mejora: **$ARGUMENTS**

Si el encargo está vacío, propón hasta tres mejoras concretas con evidencia y prioridad, y detente sin editar.

1. **Observa:** `git status -sb`. Si estás en `main` o hay cambios ajenos, detente y pregunta.
2. **Elige lo que más valor aporta** dentro del área y di qué dejas fuera. Si detectas un P0 o P1, repórtalo primero y pregunta antes de seguir: no lo mezcles con la mejora.
3. **Implementa** en pasos pequeños, sin alterar permisos, reglas de negocio, esquema de base de datos ni dependencias salvo que se pida. Para cambios de interfaz puedes delegar en el subagente `ui-ux`.
4. **Valida:** `pnpm lint`, `pnpm typecheck`, `pnpm test`.
5. **Revisa** tu diff completo y actualiza la documentación afectada.
6. **Informa** con el formato de "Informe de ChetoOMG" de `CLAUDE.md`, incluyendo el antes y el después.

**No hagas commit, push, merge ni despliegue.** Termina preguntando si se hace commit.
