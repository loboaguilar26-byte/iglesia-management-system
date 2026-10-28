# Arquitectura de ChetoOMG

## Límites

ChetoOMG es una capa de instrucciones y automatización de desarrollo. No añade rutas, tablas, componentes ni permisos a la aplicación. Opera sobre el repositorio mediante Claude Code, Git y los scripts ya definidos por el proyecto.

## Flujo

1. **Observar:** estado Git, instrucciones, arquitectura y herramientas disponibles.
2. **Analizar:** causa, dependencias, riesgos y hechos verificables.
3. **Planificar:** alcance, criterios de aceptación, pruebas y aprobaciones.
4. **Delegar:** agentes especializados solo para trabajo independiente y acotado.
5. **Implementar:** cambios mínimos en archivos autorizados.
6. **Validar:** lint, tipos, pruebas, build u otras comprobaciones existentes.
7. **Revisar:** diff, secretos, regresiones y archivos inesperados.
8. **Documentar:** actualizar solo documentación relacionada.
9. **Informar:** resultados, limitaciones, Git y siguiente acción.

## Seguridad de operación

Las auditorías usan `permissionMode: plan` y no editan. El agente Developer puede editar, pero recibe una tarea concreta. No hay hooks que sustituyan la autorización del propietario, ni comandos que hagan commit, push, merge, migraciones destructivas o despliegues.
