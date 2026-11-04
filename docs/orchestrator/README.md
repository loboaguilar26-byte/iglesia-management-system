# ChetoOMG: orquestador de desarrollo

ChetoOMG es la configuración de Claude Code para trabajar en Eclaria: un coordinador con reglas del proyecto, subagentes especializados, comandos `/cheto-*` y permisos restrictivos. Usa solo mecanismos nativos de Claude Code (no hay servidores ni dependencias nuevas) y no cambia el comportamiento de la aplicación.

## Cómo se usa

Abre Claude Code en la raíz del repositorio. `CLAUDE.md` se carga solo. Después pide lo que necesites en lenguaje natural o usa un comando:

```text
/cheto-status
/cheto-security src/modules/finance
/cheto-fix el total semanal no incluye el domingo
/cheto-orchestrate agregar exportación de asistencia a Excel
```

| Quieres… | Usa |
|---|---|
| Saber cómo está el repositorio | `/cheto-status` |
| Decidir cómo construir algo | `/cheto-plan` |
| Buscar problemas | `/cheto-audit`, `/cheto-security` |
| Corregir o mejorar algo | `/cheto-fix`, `/cheto-improve` |
| Saber si la rama está sana | `/cheto-test` |
| Revisar antes de hacer commit | `/cheto-review` |
| Resolver un encargo grande de principio a fin | `/cheto-orchestrate` |
| Obtener el resumen del trabajo | `/cheto-report` |

Detalle de cada pieza: [commands.md](commands.md) y [agents.md](agents.md).

## Qué hay en el repositorio

| Ruta | Contenido |
|---|---|
| `CLAUDE.md` | Identidad, ciclo de trabajo, prioridades P0–P3, reglas e informe. Importa `AGENTS.md`. |
| `.claude/agents/` | Subagentes especializados. |
| `.claude/skills/` | Comandos `/cheto-*`. |
| `.claude/settings.json` | Permisos compartidos y registro del hook. |
| `.claude/hooks/proteger-secretos.mjs` | Bloquea el acceso a `.env*`, salvo `.env.example`. |
| `docs/orchestrator/` | Esta documentación, el [worklog](worklog.md) y los [problemas conocidos](known-issues.md). |

## Reglas de seguridad

Ningún comando hace commit, push, merge ni despliegue por su cuenta. Las reglas de `.claude/settings.json` se aplican así:

| Decisión | Operaciones |
|---|---|
| **Permitir** | Lectura de git y GitHub; `pnpm lint`, `typecheck`, `test`, `check:unused` y `build`. |
| **Preguntar** | `git commit`, `push`, `merge`, `rebase`, `stash`, `checkout` y `switch`; crear o fusionar PR; `pnpm db:migrate`, `db:deploy` y `db:seed`; cualquier otro uso de `vercel`. |
| **Denegar** | `git reset --hard`, `git clean`, `git push --force`; `vercel deploy`, `vercel --prod`, `vercel env`; `prisma migrate reset`; leer o editar `.env*`, salvo `.env.example`. |

Estas reglas ayudan a evitar errores, pero **no son un límite de seguridad absoluto**: consulta [known-issues.md](known-issues.md). Los permisos personales van en `.claude/settings.local.json`, que no se sube al repositorio.

## Cómo modificarlo

- **Agregar un subagente:** crea `.claude/agents/<nombre>.md` con `name`, `description` y `tools`, y regístralo en [agents.md](agents.md). Da a cada uno solo las herramientas que necesita.
- **Agregar un comando:** crea `.claude/skills/<nombre>/SKILL.md` y regístralo en [commands.md](commands.md). Si modifica archivos, usa `disable-model-invocation: true`.
- **Después de editar** `.claude/` o `CLAUDE.md`, abre una sesión nueva si los cambios no aparecen.

Referencia oficial: [skills](https://code.claude.com/docs/en/skills), [subagentes](https://code.claude.com/docs/en/sub-agents), [permisos](https://code.claude.com/docs/en/permissions) y [hooks](https://code.claude.com/docs/en/hooks).
