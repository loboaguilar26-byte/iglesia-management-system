# ChetoOMG

ChetoOMG es la infraestructura de coordinación de ingeniería para este repositorio. Vive en la configuración de Claude Code y no forma parte de la funcionalidad de Iglesia Management System.

## Uso rápido

Desde Claude Code, los comandos disponibles son:

`/cheto-status`, `/cheto-audit`, `/cheto-security`, `/cheto-fix`, `/cheto-improve`, `/cheto-test`, `/cheto-review`, `/cheto-report`, `/cheto-plan` y `/cheto-orchestrate`.

El coordinador ejecutable se llama `chetoomg`. Puede seleccionarse al iniciar Claude Code con `claude --agent chetoomg` desde la raíz del repositorio. También puede usarse `/cheto-orchestrate <objetivo>` dentro de una sesión normal.

Las auditorías, revisiones y pruebas son de solo lectura por defecto. Los cambios funcionales requieren una solicitud explícita y validación posterior. No se hacen commits, pushes, merges ni despliegues automáticamente.

## Componentes

- `CLAUDE.md`: identidad, flujo, restricciones e informe obligatorio.
- `.claude/agents/`: `chetoomg` como coordinador y ocho agentes especializados con alcance y restricciones.
- `.claude/commands/`: comandos invocables desde Claude Code.
- `architecture.md`: límites y flujo del orquestador.
- `agents.md`: matriz de responsabilidades.
- `commands.md`: referencia de comandos.
- `worklog.md`: registro verificable de cambios de ChetoOMG.
- `known-issues.md`: limitaciones conocidas y pendientes.

La configuración fue diseñada para Claude Code 2.1.181, detectado localmente el 28 de octubre de 2026. Si la instalación cambia, comprueba la sintaxis antes de ampliar esta infraestructura.
