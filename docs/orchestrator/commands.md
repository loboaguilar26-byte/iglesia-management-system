# Comandos de ChetoOMG

Son skills de `.claude/skills/<nombre>/SKILL.md` y se invocan escribiendo `/<nombre>` en Claude Code. **Ninguno hace commit, push, merge ni despliegue.**

## Solo lectura de archivos

| Comando | Argumento | Qué entrega | Cómo se ejecuta |
|---|---|---|---|
| `/cheto-status` | — | Rama, cambios, PR abiertos, CI y qué atender primero. | En la conversación |
| `/cheto-audit` | `[ruta o módulo]` | Hallazgos de calidad P0–P3 con evidencia. | Subagente `code-auditor` |
| `/cheto-security` | `[ruta o módulo]` | Hallazgos de seguridad y privacidad con escenario de ataque. | Subagente `security-specialist` |
| `/cheto-plan` | `<qué construir>` | Plan por pasos, riesgos y decisiones pendientes. | Subagente `architect` |
| `/cheto-review` | `[número de PR]` | Revisión del diff y veredicto. Sin número revisa la rama actual. | En la conversación; `security-specialist` si toca zonas sensibles |
| `/cheto-test` | `[rapido \| completo]` | Resultado real de la verificación y diagnóstico de fallas. | En la conversación |
| `/cheto-report` | — | Informe de ChetoOMG en el chat. | En la conversación |

`/cheto-test` no edita código, aunque sus comandos sí generan archivos ignorados por git, como `.next/`. Claude puede usar estos comandos por iniciativa propia cuando el pedido coincide con su descripción.

## Modifican archivos

Solo se ejecutan cuando tú los escribes: Claude no los inicia por su cuenta (`disable-model-invocation: true`).

| Comando | Argumento | Qué hace |
|---|---|---|
| `/cheto-fix` | `<falla>` | Localiza la causa raíz, aplica el cambio mínimo, agrega la prueba que corresponda y valida. |
| `/cheto-improve` | `<área>` | Aplica una mejora acotada sin cambiar reglas de negocio. Sin argumento solo propone tres opciones. |
| `/cheto-orchestrate` | `<objetivo>` | Recorre el ciclo completo y delega en subagentes. Pide confirmación del plan si toca esquema, permisos, finanzas, confesiones o más de un módulo. |

Los tres dejan los cambios sin commit y terminan preguntando si se hace.

## Flujos sugeridos

- **Corrección:** `/cheto-status` → `/cheto-fix <falla>` → `/cheto-review`.
- **Función nueva:** `/cheto-plan <función>` → `/cheto-orchestrate <función>` → `/cheto-security <módulo>` → `/cheto-test completo`.
- **Antes de un PR:** `/cheto-review` → `/cheto-test completo` → `/cheto-report`.
