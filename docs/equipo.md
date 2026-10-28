# Acceso del equipo

Todo el equipo usa **el mismo sitio y la misma base de datos**:

- Sitio y panel: **https://eclaria-gilt.vercel.app** (panel en `/admin`, portal en `/mi-cuenta`)
- Base de datos: PostgreSQL en Neon, conectada al sitio publicado

Lo que cada quien crea o edita en el panel lo ven todos al instante.

## Cada persona tiene su propia cuenta

Las contraseñas **no** se guardan en la repo ni se comparten por chat. En la base solo existe su
huella cifrada (hash); nadie, ni el administrador, puede leerlas. Compartir una sola cuenta impide
saber quién hizo qué en la bitácora y deja el panel abierto si alguien sale del equipo.

### Dar de alta a un compañero (lo hace un administrador)

1. Entra a `/admin/usuarios/nuevo`.
2. Captura nombre completo, correo y una **contraseña inicial** (mínimo 10 caracteres).
3. Elige el rol según lo que necesita hacer (ver [permisos.md](permisos.md)):

   | Necesita… | Rol |
   |---|---|
   | Administrar todo, incluidos usuarios y configuración | Administrador |
   | Miembros, seguimiento pastoral y oración | Pastor |
   | Miembros, eventos, asistencia y comunicados | Secretario |
   | Ofrendas, gastos y reportes financieros | Tesorero |
   | Leer y responder confesiones | Sacerdote |
   | Su ministerio y la asistencia de sus eventos | Coordinador |

4. Entrégale la contraseña inicial **en persona o por un canal privado** (nunca en un grupo, en
   GitHub ni en un documento compartido).

   > Pendiente: el sitio publicado aún no tiene proveedor de correo, así que *¿Olvidaste tu
   > contraseña?* no envía el enlace en producción. Mientras tanto, elige una contraseña inicial
   > robusta; cuando el inicio con Google esté activo, cada quien puede entrar con su cuenta de Google.
5. Si sale del equipo: *Usuarios → la persona → Desactivar*. Su historial queda en la bitácora.

Nadie puede asignarse roles a sí mismo, y el rol Administrador no da acceso automático a finanzas
detalladas (ver [permisos.md](permisos.md)).

### Entrar con Google

Cuando el inicio con Google esté activo (ver [despliegue.md](despliegue.md)), un compañero que ya
tenga cuenta puede usar el botón *Continuar con Google* con **el mismo correo** y se vincula a su
cuenta. Si crea una cuenta nueva con Google, recibe solo el rol Miembro hasta que un administrador
le asigne otro rol.

## Desarrollo en tu equipo

Para programar no uses la base de producción: cada quien corre su propia base local con datos
ficticios ([instalacion.md](instalacion.md)):

```bash
pnpm db:deploy && pnpm db:seed && pnpm setup:admin && pnpm db:seed:demo
```

El código se comparte por GitHub (rama → pull request → CI en verde → `main`; ver
[CONTRIBUTING.md](../CONTRIBUTING.md)). Para publicar una versión nueva del sitio, ver
[despliegue.md](despliegue.md).
