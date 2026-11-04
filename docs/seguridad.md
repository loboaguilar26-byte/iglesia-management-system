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
| Confesiones | Contenido cifrado AES-256-GCM; lectura protegida por `PRIEST` y permisos; clave independiente respaldada fuera de la BD. |
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

## Clave del módulo de confesiones

Genera `CONFESSIONS_ENCRYPTION_KEY` con `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` y guárdala en el gestor de secretos del entorno. Mantén una copia de recuperación cifrada, con acceso restringido y separada de los respaldos de PostgreSQL. **No pierdas ni reemplaces la clave:** los mensajes y contactos existentes no se pueden descifrar con una clave nueva. Una rotación requiere un procedimiento de re-cifrado que conserve temporalmente ambas claves; no basta con cambiar la variable.

**Límite actual:** el esquema de confesiones aún no incluye un `churchId`, y el contexto sacerdotal es global. Mantén el módulo en una sola iglesia hasta que cada registro y autorización se vincule y filtre por iglesia; no está completo el aislamiento multi-tenant.

## Implementado en la Fase 1 (22/10/2026)
- Better Auth 1.7.12 (≥ versión que corrige CVE-2026-45364); registro público en `/registro` (correo o Google) solo con rol Miembro: con correo y contraseña el correo no se verifica, no se vincula a ninguna ficha, y si el dueño entra después con Google se anulan esa contraseña y sus sesiones; límite de 5 altas cada 5 min; contraseñas 10–128 caracteres; sesiones de 7 días revocables; token de recuperación de 30 min y un solo uso; al restablecer se cierran todas las sesiones.
- Rate limit en BD: `/sign-in/email` 5/min, `/request-password-reset` 3/5 min, `/reset-password` 5/5 min. **Requiere `AUTH_IP_HEADERS` en producción** (ADR-015).
- Usuario desactivado: no puede crear sesión (hook de BD) y sus sesiones se eliminan.
- No autoasignación de roles (auditado como `roles.self_assign_denied`); siempre queda al menos un usuario activo con `roles:assign`.
- Triggers de BD: `audit_log` es de solo inserción; `donation` no admite `DELETE`.
- Los correos en producción no se envían (no hay proveedor) y el enlace de recuperación nunca se escribe en logs de producción.
