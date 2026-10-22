# Análisis de alojamiento

> Consulta: 22/10/2026. Precios en USD sin impuestos (en México se suma IVA 16 % a servicios digitales extranjeros). Varios datos provienen de comparadores de terceros porque las páginas oficiales no siempre se pudieron leer; **confirmar en la página oficial antes de contratar.** No se ha contratado nada.

## Supuestos

| Escenario | Supuesto |
|---|---|
| Inicio | 1 iglesia, ≤ 500 personas registradas, 5–15 usuarios del panel, sitio público con < 5 000 visitas/mes, BD < 500 MB |
| Crecimiento | ≤ 5 000 personas, 50 usuarios, < 50 000 visitas/mes, BD 1–5 GB, logotipos/imágenes < 5 GB |

## Opciones comparadas

### A) Vercel (app) + Neon (PostgreSQL gestionado)
- **Vercel Hobby**: gratis, pero sus términos **prohíben uso comercial**; una iglesia no lucra, pero el término es ambiguo → riesgo. **Vercel Pro**: ~US$20/usuario/mes (1 usuario basta).
- **Neon Free**: US$0, ~0.5 GB por proyecto, 100 CU-h/mes; **Neon Launch**: pago por uso, ~US$0.106/CU-h, sin mínimo (según página oficial).
- Inicio: US$0 (Hobby+Free, con riesgo de términos) o ~US$20–25/mes (Pro+Launch). Anual: ~US$240–300.
- SSL automático; dominio propio ~US$10–15/año aparte.
- Respaldos: Neon ofrece restauración a un punto en el tiempo (ventana según plan).
- Mantenimiento: mínimo. Escalabilidad: alta. Datos: regiones EE. UU. (Neon tiene regiones en EE. UU.; no hay región México).
- Riesgos: dependencia del proveedor (funciones serverless), arranque en frío de la BD en plan gratis, límites de ejecución de funciones para generar PDFs grandes.
- Móvil: sin limitación (API HTTPS pública).

### B) Railway o Render (PaaS con app + Postgres)
- **Railway Hobby**: US$5/mes incluye US$5 de consumo; app + Postgres pequeña suele caber en US$5–10/mes.
- **Render**: web Starter US$7/mes + Postgres de pago desde ~US$6–7/mes ⇒ ~US$13–14/mes. Su Postgres gratis **expira a los 30 días** (no apto).
- Anual: Railway ~US$60–120; Render ~US$160–170.
- SSL incluido; respaldos de Postgres según plan (verificar retención).
- Mantenimiento: bajo (despliegue con git push, contenedor Node normal — sin restricciones serverless).
- Riesgos: precios por consumo variables (Railway); dependencia moderada (es un contenedor estándar, fácil de mover).

### C) VPS (Hetzner / DigitalOcean) autoadministrado
- **Hetzner** 2 vCPU/4 GB: ~€4–5/mes (tras el aumento de abril 2026; cifras de terceros discrepan entre CX22/CX23); respaldos automáticos +20 %. Centros de datos en Alemania, Finlandia, EE. UU. y Singapur.
- **DigitalOcean** 2 vCPU/4 GB: US$24/mes; 1 vCPU/1 GB existe más barato.
- Anual: Hetzner ~US$60–70; DigitalOcean ~US$150–290.
- SSL con Let's Encrypt (Caddy). Todo (Postgres, respaldos, parches del SO, firewall) lo mantiene el equipo.
- Riesgos: **mantenimiento y seguridad recaen en nosotros**; si nadie parchea el servidor, el riesgo para datos sensibles es alto.

### D) Supabase (solo como BD gestionada, referencia)
- Free: pausa tras 1 semana sin actividad (no apto para producción). Pro: US$25/mes con respaldos diarios 7 días.

## Tabla resumen (escenario de inicio)

| Opción | Mensual aprox. | Anual aprox. | Mantenimiento | Respaldos | Comentario |
|---|---|---|---|---|---|
| A Vercel Pro + Neon Launch | US$20–25 | US$240–300 | Muy bajo | Sí (Neon) | Más simple; más caro |
| A' Vercel Hobby + Neon Free | US$0 | US$0 | Muy bajo | Limitados | Riesgo de términos; solo para piloto |
| B Railway Hobby | US$5–10 | US$60–120 | Bajo | Verificar | Mejor costo/simplicidad |
| B' Render | US$13–14 | US$160–170 | Bajo | Sí (pago) | Precio fijo predecible |
| C Hetzner VPS | US$5–6 | US$60–70 | **Alto** | Configurar | Más barato, más trabajo |

## Recomendación

- **Principal: Railway (Hobby)** con la app como contenedor Node y su PostgreSQL gestionado, **más** un respaldo diario `pg_dump` cifrado a almacenamiento externo (p. ej. Cloudflare R2, capa gratuita) para no depender de un solo proveedor. Costo estimado US$5–10/mes. Motivos: barato, sin restricciones serverless (PDF/Excel en servidor sin límites de tiempo cortos), se mueve a otro proveedor fácilmente porque es un contenedor estándar.
- **Alternativa: Vercel Pro + Neon Launch** (~US$20–25/mes) si se prioriza cero mantenimiento y previsualizaciones por PR.
- **Piloto gratuito**: Vercel Hobby + Neon Free solo para demostración interna con datos ficticios.
- **No recomendado** para esta iglesia: VPS autoadministrado, salvo que haya una persona con experiencia en administración de Linux.

Crecimiento (≤ 5 000 personas): Railway ~US$15–25/mes; Vercel Pro + Neon ~US$25–40/mes.

**No se contrató ningún servicio ni se compró dominio.** Requiere autorización.

## Fuentes
- Vercel: https://vercel.com/docs/plans/pro/trials · https://dev.to/nayankyada/vercel-pricing-2026-what-you-actually-pay-for-a-real-nextjs-project-33md · https://modelence.com/compare/vercel-pricing
- Neon: https://neon.com/pricing · https://www.jetadmin.io/blog/neon-pricing/
- Railway / Render: https://agentdeals.dev/railway-vs-render · https://www.kunalganglani.com/blog/render-vs-railway-2026 · https://costbench.com/software/database-as-service/railway-postgres/
- Hetzner / DigitalOcean: https://betterstack.com/community/guides/web-servers/digitalocean-vs-hetzner/ · https://findstack.com/resources/hetzner-price-increase-2026 · https://apicalculators.com/compare/hetzner-vs-digitalocean
- Supabase: https://supabase.com/pricing
