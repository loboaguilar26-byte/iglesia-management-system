# Problemas conocidos y limitaciones de ChetoOMG

Última verificación: 03/11/2026, con Claude Code 2.1.303 en Windows 11.

## Sin verificar en una ejecución real

La sesión de prueba cargó la configuración, pero no pudo ejecutar el modelo porque la autenticación de la línea de comandos había vencido. Por eso:

| Capacidad | Qué sí se comprobó | Qué falta comprobar |
|---|---|---|
| Subagentes | Claude Code reconoce los 8. | Que cada uno cumpla su encargo. |
| Comandos `/cheto-*` | Claude Code reconoce los 10. | Que cada uno se ejecute de principio a fin. |
| `context: fork` con `agent` | Está en la documentación oficial y los agentes existen. | Que `/cheto-audit`, `/cheto-security` y `/cheto-plan` corran en su subagente. |
| Hook `proteger-secretos.mjs` | Ejecutado directamente con casos de prueba. | Que Claude Code lo invoque desde `settings.json` y bloquee la herramienta. |
| Reglas de `settings.json` | JSON válido y sintaxis según la documentación oficial. | Que cada regla se aplique en una sesión. |

Para comprobarlo, abre una sesión nueva en la rama y prueba `/cheto-status` y `/cheto-audit src/lib/money.ts`. Después pide leer `.env`: debe bloquearse.

## Límites del diseño

- **Los permisos no son un sandbox.** Una regla de Bash compara el texto del comando, así que no detecta el mismo programa invocado de otra forma (por ejemplo, dentro de `sh -c`). Las reglas `Read` y `Edit` no alcanzan a un proceso que abre archivos por su cuenta. Para un bloqueo real a nivel de sistema operativo hay que activar el sandbox de Claude Code.
- **El hook revisa el texto del comando.** No detecta rutas armadas en tiempo de ejecución ni comodines como `.en*`, y bloquea cualquier mención literal de `.env`, aunque el comando sea inofensivo (por ejemplo, `git check-ignore .env`). Si recibe una entrada que no es JSON válido, la deja pasar.
- **`allowed-tools` no restringe.** Solo evita preguntar. Lo que impide editar en los comandos de solo lectura es `disallowed-tools`, y dura hasta tu siguiente mensaje.
- **`/cheto-status`, `/cheto-review`, `/cheto-report` y `/cheto-test` conservan Bash.** Que no escriban archivos con la terminal depende de la instrucción, no de una restricción técnica.
- **Modos de permisos.** Un modo como `bypassPermissions` omite las preguntas de la lista "Preguntar". Las reglas de denegar y el hook siguen siendo la protección en ese caso.

## Del entorno

- **`pnpm check:unused`** puede terminar con `RangeError` en este equipo. El 03/11/2026 pasó limpio con `NODE_OPTIONS=--max-old-space-size=6144`; no se comprobó que esa variable sea la causa. El CI lo ejecuta de todos modos.
- **`pnpm test` exige `TEST_DATABASE_URL`.** Una copia de trabajo nueva no tiene `.env`, y las sesiones que comparten `iglesia_test` pueden interferir entre sí porque las pruebas de integración usan la misma base.

## Abiertos

- **PR 21 se traslapa con este trabajo.** El PR [`feat: add ChetoOMG orchestration infrastructure`](https://github.com/loboaguilar26-byte/iglesia-management-system/pull/21) (rama `feature/ajustes-iniciales`) agrega su propio `CLAUDE.md`, `docs/orchestrator/` y agentes con otros nombres, usa `.claude/commands/` y también cambia `src/` y `knip.json`. Si ambos se fusionan habrá conflictos y comandos duplicados, así que el equipo debe decidir cuál conservar.
