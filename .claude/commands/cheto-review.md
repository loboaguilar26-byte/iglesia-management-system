---
description: Revisa el diff y busca regresiones sin modificar, confirmar ni publicar cambios.
argument-hint: "[archivo o alcance]"
allowed-tools: Bash, Read, Glob, Grep
---

Ejecuta `/cheto-review` en modo solo lectura. Examina `git diff`, archivos inesperados, dependencias, secretos, regresiones y criterios de aceptación. Clasifica hallazgos por prioridad y confianza con evidencia. No hagas commit, push, merge ni cambios de archivos.
