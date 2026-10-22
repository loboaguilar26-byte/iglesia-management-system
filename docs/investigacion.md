# Investigación: administración de iglesias

> Fecha de la investigación: 22/10/2026.
> Leyenda: **[V]** hecho verificado en una fuente · **[R]** recomendación del equipo · **[P]** pendiente de validar con la iglesia.

## 1. Referencias funcionales consultadas

| Sistema | Módulos relevantes | Qué tomamos como referencia (sin copiar código, marca ni interfaz) |
|---|---|---|
| Planning Center | People, Check-Ins, Giving, Groups, Services, Calendar | Separación por módulos independientes; un directorio central de personas que alimenta los demás módulos; asistencia ligada a eventos; grupos con líderes que toman asistencia de su propio grupo. **[V]** |
| Otros ChMS (Breeze, ChurchTrac, Elvanto) | Personas, asistencia, contribuciones, eventos, reportes | Patrón común: directorio + eventos + asistencia + aportaciones + reportes con permisos por rol. **[R]** basado en conocimiento general del mercado |

Conclusión **[R]**: el núcleo de cualquier ChMS es el **directorio de personas**. Todos los demás módulos (asistencia, ministerios, aportaciones) referencian a una persona, nunca duplican sus datos.

## 2. Organización de una congregación

- Estructuras variables: congregacional, presbiteriana, episcopal, redes independientes. **[V]** (conocimiento general de eclesiología)
- Por eso el sistema **no** codifica jerarquías ni cargos: los cargos son texto configurable; los **roles del sistema** (5 iniciales) son solo para permisos de software. **[R]**
- Distinciones que modelaremos por separado **[R]**:
  1. **Rol del sistema** (Administrador, Pastor, Secretario, Tesorero, Coordinador) → qué puede hacer en el software.
  2. **Cargo organizativo** (diácono, anciano, líder de alabanza…) → texto configurable, sin efecto en permisos.
  3. **Pertenencia a ministerio** (integrante / coordinador del ministerio) → con fechas de inicio y fin.
  4. **Responsable de evento** → asignación puntual.

## 3. Personas: visitantes, miembros activos e inactivos

- Ciclo típico: visitante → asistente regular → miembro (según el proceso propio de cada iglesia: bautismo, clase de membresía, etc.). **[V]** práctica común; los criterios exactos son **[P]**.
- **[R]** Una sola entidad `Member` (persona) con un campo `status`: `VISITOR`, `ACTIVE`, `INACTIVE`. Así un visitante puede convertirse en miembro sin duplicar registro.
- **[R]** Visitantes ocasionales en un culto se cuentan con un **contador anónimo** por evento (`visitorCount`) sin crear ficha.
- **[P]** ¿La iglesia quiere seguimiento de visitantes (llamada, visita)? Se deja como ampliación.

## 4. Cultos, reuniones y asistencia

- Cultos recurrentes (domingos, entre semana) + eventos puntuales. **[V]**
- Registro de asistencia habitual: lista nominal (pase de lista) o conteo total. **[V]** Planning Center Check-Ins soporta ambos.
- **[R]** Tres estados por persona/evento: `PRESENT`, `ABSENT`, y **sin registro = pendiente**. Nunca se asume ausencia si no se capturó.
- **[R]** Restricción única `(eventId, memberId)` en la base de datos para evitar duplicados.

## 5. Ministerios

- Un ministerio tiene coordinador(es) e integrantes; una persona puede servir en varios. **[V]**
- **[R]** `MinistryMembership` con `role` (`MEMBER` | `COORDINATOR`), `startDate`, `endDate` → historial de participación.
- **[R]** Ser coordinador de ministerio **no** otorga permisos administrativos; el permiso viene del rol de sistema `Coordinador` y se **acota** a los ministerios/eventos asignados.

## 6. Diezmos, ofrendas y aportaciones

- Prácticas comunes: conteo de ofrenda por dos personas, registro por concepto (diezmo, ofrenda, misiones, construcción), método (efectivo, transferencia), recibo/folio. **[V]** buenas prácticas de control interno en organizaciones sin fines de lucro.
- **[R]** Registros financieros inmutables: las correcciones se hacen **anulando** (con motivo) y creando un registro nuevo; nunca `DELETE`.
- **[R]** Montos en `NUMERIC(12,2)` / `Decimal` de Prisma; cálculos con `Prisma.Decimal`, no `number`.
- **[R]** Aportación anónima: `memberId = null`, sin nombre libre.
- **[P]** ¿La iglesia emite recibos deducibles (donataria autorizada ante el SAT)? Si sí, se requerirá un módulo de CFDI en el futuro — **fuera de alcance de la v1**.

## 7. Qué consulta cada rol (resumen)

| Rol | Necesidades principales |
|---|---|
| Pastor | Visión general: miembros activos, asistencia, eventos, ministerios. Finanzas solo si se le concede. |
| Secretario | Directorio, altas/bajas, asistencia, eventos, comunicados. |
| Tesorero | Registro y reportes de aportaciones. |
| Coordinador | Su(s) ministerio(s), sus integrantes, asistencia de sus actividades. |
| Administrador | Usuarios, roles, configuración. **No** finanzas por defecto. |

## 8. Procesos que requieren trazabilidad

Cambios de rol/permisos, activación/desactivación de usuarios, cualquier operación financiera (alta, corrección, anulación, exportación), desactivación de miembros, edición de asistencia ya capturada, cambios de configuración institucional. → tabla `AuditLog`.

## 9. Marco legal en México (protección de datos)

- **[V]** La **nueva Ley Federal de Protección de Datos Personales en Posesión de los Particulares** se publicó en el DOF el 20/03/2025 y entró en vigor el 21/03/2025, abrogando la de 2010.
- **[V]** Las funciones del extinto INAI en esta materia pasaron a la **Secretaría Anticorrupción y Buen Gobierno**.
- **[V]** El responsable (la iglesia, como asociación religiosa) debe poner a disposición un **aviso de privacidad** desde que recaba datos, con finalidades del tratamiento; el consentimiento debe ser libre, específico e informado.
- **[R]** Datos de creencias religiosas se consideran **datos sensibles** en la doctrina mexicana de protección de datos: la pertenencia misma a una iglesia lo es. Esto refuerza: mínimo de datos, acceso por rol, nada de directorios públicos, cifrado en tránsito y respaldos protegidos.
- **[P]** La iglesia debe redactar su aviso de privacidad con asesoría legal. **El software facilita el cumplimiento, no lo garantiza.**

## 10. Funcionalidades indispensables para la v1 (MVP)

RF-01 a RF-10 del documento de requisitos + sitio público mínimo. Se excluyen de la v1: pagos en línea, CFDI, notificaciones por correo/push reales, app móvil, multi-iglesia.

## Fuentes

- Planning Center — sitio y módulos: https://www.planningcenter.com/apps · https://planningcenter.com/calendar · https://www.planningcenter.com/groups
- LFPDPPP vigente (Cámara de Diputados): https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf
- Análisis de la nueva LFPDPPP: https://www.garrigues.com/es_ES/noticia/mexico-nueva-ley-federal-proteccion-datos-personales-posesion-particulares-introduce · https://kpmg.com/mx/es/tendencias/2025/04/flash-nueva-ley-federal-de-proteccion-de-datos-personales-en-posesion-de-los-particulares.html · https://www.littler.com/es/news-analysis/asap/mexico-tiene-nueva-ley-en-materia-de-proteccion-de-datos-personales
- Better Auth (rate limiting): https://better-auth.com/docs/1.6/concepts/rate-limit · CVE-2026-45364: https://osv.dev/vulnerability/CVE-2026-45364
- Precios de alojamiento: ver `analisis-alojamiento.md`.
