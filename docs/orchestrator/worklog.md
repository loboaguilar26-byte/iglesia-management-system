# Bitácora de ChetoOMG

Memoria del trabajo del orquestador: qué se hizo, en qué rama y con qué evidencia. Las entradas nuevas van al inicio. Sin secretos ni datos reales.

## 03/11/2026 — Implementación inicial

- **Rama:** `ai/cheto-orchestrator`, desde `main` en `5a1d3a7`.
- **Encargo:** implementar ChetoOMG con mecanismos nativos de Claude Code, sin cambiar la aplicación.
- **Resultado:** `CLAUDE.md`, 8 subagentes, 10 comandos, `.claude/settings.json`, el hook `proteger-secretos.mjs` y esta documentación. Además, `knip.json` registra el hook como punto de entrada y `.gitignore` excluye `.claude/settings.local.json`.
- **Verificado con Claude Code 2.1.303:**

| Comprobación | Resultado |
|---|---|
| Carga en sesión de Claude Code | Reconoce los 8 subagentes y los 10 comandos |
| Frontmatter YAML, JSON, rutas y nombres citados | Sin fallas |
| Hook ejecutado directamente | 16 casos correctos |
| `pnpm lint` | Aprobado |
| `pnpm typecheck` | Aprobado |
| `pnpm test` | 61 de 61, en un PostgreSQL 17 temporal y aislado |
| `pnpm check:unused` | Aprobado, con `NODE_OPTIONS=--max-old-space-size=6144` |

- **No ejecutado:** `pnpm build` y `pnpm test:e2e`, porque no hay cambios en la aplicación; los ejecuta el CI. Tampoco se probaron los comandos con el modelo: ver [known-issues.md](known-issues.md).
- **Hallazgos durante la validación:** la descripción de `ui-ux` tenía YAML inválido por un `: ` sin comillas, el hook no detectaba `.env` seguido de `\` y `knip` marcaba el hook como archivo sin uso, lo que habría roto el CI. Los tres quedaron corregidos.
- **Pendiente:** decidir qué hacer con el traslape con el PR 21 ([known-issues.md](known-issues.md#abiertos)).
