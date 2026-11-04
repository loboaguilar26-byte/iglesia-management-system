---
name: cheto-security
description: Audita la seguridad y privacidad de Eclaria (aislamiento entre iglesias y capillas, roles validados en servidor, finanzas, confesiones cifradas, peticiones de oración, menores, secretos, LFPDPPP) sin modificar archivos. Úsalo antes de publicar cambios sensibles o cuando pidan una revisión de seguridad.
argument-hint: "[ruta o módulo, p. ej. src/modules/confessions]"
context: fork
agent: security-specialist
background: false
---

Audita la seguridad de este alcance de Eclaria: **$ARGUMENTS**

Si el alcance está vacío, revisa `src/modules/`, `src/lib/`, `src/proxy.ts` y `src/app/api/`.

Pasos:

1. Lee `docs/seguridad.md` y `docs/permisos.md`; los límites ya documentados se reportan como conocidos, no como descubrimientos.
2. Recorre tus controles en orden: aislamiento entre iglesias y capillas, autorización en servidor, finanzas, confesiones, oración y notas pastorales, datos públicos, LFPDPPP, entrada y salida, secretos.
3. Para cada hallazgo describe el ataque concreto (quién, qué petición, qué obtiene) con ruta:línea.

No modifiques archivos ni leas `.env*`. Entrega la tabla de hallazgos ordenada de P0 a P3, los controles revisados sin hallazgos y lo que no se pudo revisar.
