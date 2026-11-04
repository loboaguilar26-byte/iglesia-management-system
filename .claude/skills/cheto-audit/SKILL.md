---
name: cheto-audit
description: Audita la calidad del código de Eclaria en un módulo o ruta y reporta hallazgos con prioridad P0–P3 y evidencia, sin modificar archivos. Úsalo para revisar errores de lógica, código muerto, duplicación y apego a las reglas del proyecto.
argument-hint: "[ruta o módulo, p. ej. src/modules/finance]"
context: fork
agent: code-auditor
background: false
---

Audita este alcance de Eclaria: **$ARGUMENTS**

Si el alcance está vacío, audita `src/modules/` y `src/lib/`, empezando por `finance`, `members` y `users`.

Pasos:

1. Lee `CONTRIBUTING.md` para las reglas del proyecto y después el código del alcance.
2. Busca defectos demostrables: lógica, dinero, fechas, validación Zod, `requirePermission` ausente, manejo de errores, duplicación y pruebas faltantes en `tests/`.
3. Confirma cada hallazgo con ruta:línea y un escenario concreto. Lo que no puedas demostrar va como "a verificar".

No modifiques archivos. Entrega la tabla de hallazgos ordenada de P0 a P3, un resumen de 2–3 líneas y lo que no alcanzaste a revisar.
