---
name: cheto-plan
description: Produce un plan de implementación por pasos para una función o cambio en Eclaria, con prioridades P0–P3, archivos implicados y validación, sin modificar nada. Úsalo antes de empezar un cambio grande.
argument-hint: "<qué se quiere construir o cambiar>"
context: fork
agent: architect
background: false
---

Planifica este encargo en Eclaria: **$ARGUMENTS**

Si el encargo está vacío, responde únicamente que `/cheto-plan` necesita una descripción de lo que se quiere construir.

Pasos:

1. Lee `docs/arquitectura.md`, `docs/modelo-datos.md`, `docs/permisos.md` y el código relacionado. Busca primero si algo parecido ya existe.
2. Decide dónde va cada pieza: servicio, ruta o página, esquema de Prisma, permisos, pruebas y documentación.
3. Divide el trabajo en pasos pequeños y verificables.

No modifiques archivos. Entrega el diagnóstico, el plan numerado (prioridad, archivos y cómo validar cada paso), los riesgos y las decisiones que le tocan al usuario.
