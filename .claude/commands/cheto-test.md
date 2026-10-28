---
description: Ejecuta las validaciones disponibles y registra resultados reproducibles.
argument-hint: "[selector opcional]"
allowed-tools: Bash, Read, Glob, Grep
---

Ejecuta `/cheto-test`. Lee `package.json` y las configuraciones de Vitest, Playwright, ESLint y TypeScript antes de elegir comandos. Ejecuta las comprobaciones pertinentes sin modificar código funcional. Registra cada comando, resultado, duración si está disponible y cualquier bloqueo real; no inventes pruebas ni declares éxito sin salida verificable.
