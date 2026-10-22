# Seguridad y privacidad

## Controles planificados

| Riesgo | Control |
|---|---|
| Robo de contraseñas | Hash gestionado por Better Auth (scrypt); política mínima 10 caracteres; nunca se registran en logs. |
| Fuerza bruta | Rate limit en `/sign-in`, `/forget-password`, `/reset-password` con almacenamiento en BD; mensajes genéricos. |
| Recuperación insegura | Token aleatorio, un uso, vence en 30 min; respuesta idéntica exista o no el correo. |
| Secuestro de sesión | Cookie `HttpOnly`, `Secure`, `SameSite=Lax`; sesiones revocables; expiración 7 días con renovación. |
| CSRF | `SameSite=Lax` + verificación de origen de Better Auth y de Server Actions de Next.js. |
| XSS | React escapa por defecto; no se usa `dangerouslySetInnerHTML` salvo markdown sanitizado; CSP. |
| Inyección SQL | Solo Prisma con parámetros; `$queryRaw` solo con plantillas etiquetadas. |
| Escalada de privilegios | Autorización en servicio; no autoasignación de roles; auditoría. |
| Exposición de finanzas | Permisos `finance:*` separados; el admin no los tiene; DTO del dashboard omite el bloque. |
| Datos en sitio público | Consultas públicas con `select` explícito; pruebas que verifican que no salen teléfonos/correos. |
| Archivos maliciosos | Validación por firma, tamaño ≤ 1 MB, nombre generado, sin SVG (puede contener scripts). |
| Secretos | `.env` ignorado por git; `.env.example` sin valores reales; revisión antes de cada commit. |
| Dependencias | `pnpm audit` en CI; Dependabot. |
| Pérdida de datos | Respaldos diarios cifrados y prueba de restauración trimestral (ver `despliegue.md`). |
| CORS (móvil) | La app móvil nativa no usa CORS; solo se permiten orígenes explícitos si hay otro cliente web. |

## Privacidad desde el diseño (LFPDPPP 2025)

- La pertenencia religiosa es un dato **sensible**: acceso mínimo por rol, ningún directorio público.
- Minimización: correo y teléfono opcionales; sin CURP, RFC, domicilio particular en v1.
- Menores: marcados `isMinor`, jamás expuestos públicamente.
- Derechos ARCO: corrección desde el panel; cancelación mediante anonimización (proceso futuro).
- Aviso de privacidad: lo redacta la iglesia (con asesoría); el sitio tendrá una página para publicarlo.
- **El software no garantiza cumplimiento legal**; la iglesia es la responsable del tratamiento.

## Procedimiento ante incidentes (borrador)
1. Revocar sesiones y rotar secretos (`BETTER_AUTH_SECRET`, credenciales BD).
2. Revisar `AuditLog`.
3. Evaluar notificación a titulares conforme a la ley.
