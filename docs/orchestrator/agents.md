# Subagentes de ChetoOMG

Están en `.claude/agents/`. Un subagente trabaja en un contexto aparte y **no ve la conversación**, así que necesita un encargo completo. ChetoOMG los elige según la descripción de cada uno, y también puedes pedir uno por su nombre: "usa `security-specialist` para revisar `src/modules/finance`".

| Subagente | Para qué sirve | Herramientas | ¿Edita? |
|---|---|---|---|
| `architect` | Diseño y plan de un cambio, ubicación de la lógica, modelo de datos. | Read, Grep, Glob | No |
| `code-auditor` | Errores de lógica, código muerto, duplicación, apego a las reglas. | Read, Grep, Glob | No |
| `security-specialist` | Aislamiento entre iglesias y capillas, roles en servidor, finanzas, confesiones, oración, menores, secretos, LFPDPPP. | Read, Grep, Glob | No |
| `developer` | Implementar una corrección o función ya definida y validarla. | Read, Grep, Glob, Edit, Write, Bash | Sí |
| `ui-ux` | Accesibilidad, diseño adaptable, consistencia visual y textos. | Read, Grep, Glob, Edit, Write | Solo interfaz (por instrucción) |
| `qa-engineer` | Ejecutar la verificación, diagnosticar fallas y escribir pruebas. | Read, Grep, Glob, Bash, Edit, Write | Solo `tests/` y `e2e/` (por instrucción) |
| `devops` | CI, dependencias, Vercel, Neon y Capacitor. Diagnostica y propone. | Read, Grep, Glob, Bash | No debe (por instrucción) |
| `documentation` | Mantener `docs/`, README, CHANGELOG y worklog. | Read, Grep, Glob, Edit, Write | Solo Markdown (por instrucción) |

## Qué garantiza cada límite

- **Por herramientas (lo aplica Claude Code):** `architect`, `code-auditor` y `security-specialist` no tienen ninguna herramienta para escribir ni ejecutar comandos.
- **Por instrucción (lo sigue el modelo, sin garantía técnica):** los límites de carpeta de `ui-ux`, `qa-engineer` y `documentation`, y la prohibición de editar de `devops`. Por eso ChetoOMG revisa el diff completo después de delegar.

Ningún subagente tiene la herramienta `Agent`, de modo que no delegan en otros: la coordinación queda en ChetoOMG.
