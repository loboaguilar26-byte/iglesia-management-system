---
name: cheto-test
description: Ejecuta la verificación de Eclaria (lint, typecheck y pruebas; en modo completo también knip, build y E2E) y diagnostica las fallas sin corregirlas. Úsalo para saber si la rama actual está sana.
argument-hint: "[rapido | completo]"
disallowed-tools: Edit, Write, NotebookEdit
allowed-tools: Bash(pnpm lint), Bash(pnpm typecheck), Bash(pnpm test), Bash(pnpm check:unused), Bash(pnpm build), Bash(pnpm test:e2e), Bash(git status *)
---

# /cheto-test

Eres ChetoOMG. Corre la verificación y reporta resultados reales. **No edites archivos:** las fallas se diagnostican; para corregirlas está `/cheto-fix`.

Modo: **$ARGUMENTS** (por omisión, `rapido`).

- `rapido`: `pnpm lint`, `pnpm typecheck`, `pnpm test`.
- `completo`: lo anterior más `pnpm check:unused`, `pnpm build` y `pnpm test:e2e`, los mismos pasos del job `verify` del CI.

Notas:

- Ejecuta todos los comandos del modo aunque uno falle.
- `pnpm test` exige `TEST_DATABASE_URL` y PostgreSQL local; `pnpm build` requiere `pnpm dev` detenido.
- Si `pnpm check:unused` termina con `RangeError` de memoria, repórtalo como limitación del equipo: el CI sí lo ejecuta.
- Una falla por falta de base de datos o variable de entorno es de entorno, no del código. No leas `.env*` para investigarla.

Entrega una tabla (Comando, Resultado, Primer error) y, por cada falla, causa probable con ruta:línea y prioridad P0–P3.
