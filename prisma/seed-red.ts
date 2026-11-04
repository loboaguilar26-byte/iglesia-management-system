/**
 * Red de 20 iglesias de ejemplo vinculadas a la iglesia principal (solo desarrollo y demostraciones).
 *   pnpm db:seed:red
 * Cada sede queda en los dos apartados del panel, unidos por el mismo código:
 *   - Iglesias y franquicias (Franchise / Church): identidad y equipo en la red.
 *   - Capillas (Chapel): sitio público en /capillas/<código> y sus miembros, eventos y aportaciones.
 * Son datos ficticios: no incluye teléfonos, correos ni domicilios, solo la ciudad. Es idempotente:
 * lo que ya existe (por código) no se toca.
 */
import "dotenv/config";
import { db } from "../src/lib/db";
import { DEFAULT_TIMEZONE, zonedParts, zonedToUtc } from "../src/lib/dates";

if (process.env.NODE_ENV === "production") {
  console.error("Estos datos son ficticios: no se cargan en producción.");
  process.exit(1);
}

const FRANCHISE = { name: "Red Eclaria", slug: "red-eclaria", description: "Iglesia principal y sedes vinculadas." };

const SEDES = [
  { city: "Mérida", state: "Yucatán", code: "MERIDA", primary: "#0f5c63", accent: "#e0a83b", tagline: "Fe y hospitalidad en el corazón de Yucatán." },
  { city: "Monterrey", state: "Nuevo León", code: "MONTERREY", primary: "#1f3a6e", accent: "#f2a541", tagline: "Una comunidad firme al pie de la montaña." },
  { city: "Guadalajara", state: "Jalisco", code: "GUADALAJARA", primary: "#6b1f3a", accent: "#e8b04b", tagline: "Familias que crecen juntas en la Palabra." },
  { city: "Puebla", state: "Puebla", code: "PUEBLA", primary: "#2f4f2f", accent: "#d9a441", tagline: "Tradición, servicio y puertas abiertas." },
  { city: "Querétaro", state: "Querétaro", code: "QUERETARO", primary: "#4a2c6f", accent: "#f0b34a", tagline: "Caminamos juntos, de generación en generación." },
  { city: "León", state: "Guanajuato", code: "LEON", primary: "#7a3b12", accent: "#f2c14e", tagline: "Trabajo, fe y comunidad cada semana." },
  { city: "Toluca", state: "Estado de México", code: "TOLUCA", primary: "#17494d", accent: "#e39b3b", tagline: "Un hogar espiritual en el valle." },
  { city: "Cancún", state: "Quintana Roo", code: "CANCUN", primary: "#0b6e8f", accent: "#f4b860", tagline: "Bienvenida para vecinos y visitantes." },
  { city: "Oaxaca", state: "Oaxaca", code: "OAXACA", primary: "#8a2f24", accent: "#e9b44c", tagline: "Comunidad, cultura y esperanza." },
  { city: "Veracruz", state: "Veracruz", code: "VERACRUZ", primary: "#12507a", accent: "#f0a93b", tagline: "Junto al mar, con los brazos abiertos." },
  { city: "Tijuana", state: "Baja California", code: "TIJUANA", primary: "#3d3a7c", accent: "#efab3f", tagline: "Un lugar de encuentro en la frontera." },
  { city: "Chihuahua", state: "Chihuahua", code: "CHIHUAHUA", primary: "#6e4a1f", accent: "#e6b655", tagline: "Fe que se vive en lo cotidiano." },
  { city: "Hermosillo", state: "Sonora", code: "HERMOSILLO", primary: "#9a4a16", accent: "#f3c15f", tagline: "Calidez que se siente en cada reunión." },
  { city: "Saltillo", state: "Coahuila", code: "SALTILLO", primary: "#27496d", accent: "#dfa23a", tagline: "Servir a nuestra ciudad con alegría." },
  { city: "Morelia", state: "Michoacán", code: "MORELIA", primary: "#5a2a4f", accent: "#eab04a", tagline: "Raíces profundas y una fe viva." },
  { city: "Aguascalientes", state: "Aguascalientes", code: "AGS", primary: "#205a44", accent: "#e8a93f", tagline: "Pequeños grupos, grandes amistades." },
  { city: "San Luis Potosí", state: "San Luis Potosí", code: "SLP", primary: "#452b6b", accent: "#f1b24c", tagline: "Aprendemos y servimos en comunidad." },
  { city: "Culiacán", state: "Sinaloa", code: "CULIACAN", primary: "#1a5e4a", accent: "#ecae43", tagline: "Esperanza para cada familia." },
  { city: "Tuxtla Gutiérrez", state: "Chiapas", code: "TUXTLA", primary: "#2c5a2e", accent: "#e5a63a", tagline: "Creciendo juntos en el sureste." },
  { city: "Zacatecas", state: "Zacatecas", code: "ZACATECAS", primary: "#70331f", accent: "#e7b14d", tagline: "Una familia de fe entre cerros y cantera." },
];

const SCHEDULES = [
  "Domingo 09:00 Celebración\nMiércoles 19:30 Estudio bíblico",
  "Domingo 11:00 Celebración\nJueves 19:00 Oración",
  "Domingo 10:00 Celebración\nViernes 19:30 Jóvenes",
  "Sábado 18:00 Celebración\nMartes 19:30 Grupos pequeños",
];

const MINISTRIES = [
  { name: "Niños", description: "Enseñanza bíblica creativa y segura para niños de 3 a 12 años." },
  { name: "Jóvenes", description: "Un espacio para crecer en la fe, hacer amigos y servir juntos." },
  { name: "Acción social", description: "Despensas, visitas y apoyo a las familias de la colonia." },
];

const EVENTS = [
  { title: "Noche de alabanza", type: "Culto", at: "19:00", hours: 2, description: "Música y oración para toda la familia." },
  { title: "Jornada comunitaria", type: "Otro", at: "09:00", hours: 4, description: "Salimos a servir a nuestra colonia. ¡Ven a ayudar!" },
];

/** Fecha y hora de la iglesia, `inDays` días a partir de hoy. */
function at(inDays: number, time: string, tz: string) {
  const p = zonedParts(new Date(Date.now() + inDays * 86400000), tz);
  const pad = (n: number) => String(n).padStart(2, "0");
  return zonedToUtc(`${p.year}-${pad(p.month)}-${pad(p.day)}T${time}`, tz);
}

const slugify = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");

async function main() {
  const settings = await db.churchSettings.findUnique({ where: { id: "default" } });
  if (!settings) throw new Error("Primero corre `pnpm db:seed` (datos base).");
  const tz = settings.timezone || DEFAULT_TIMEZONE;
  const types = Object.fromEntries((await db.eventType.findMany()).map((t) => [t.name, t.id]));

  const franchise = await db.franchise.upsert({ where: { slug: FRANCHISE.slug }, update: {}, create: FRANCHISE });
  await db.church.upsert({
    where: { slug: "iglesia-principal" },
    update: {},
    create: { franchiseId: franchise.id, name: settings.name, slug: "iglesia-principal", code: "PRINCIPAL", profile: { create: {} } },
  });

  let created = 0;
  for (const [i, s] of SEDES.entries()) {
    const name = `Eclaria ${s.city}`;
    if (await db.chapel.findUnique({ where: { code: s.code }, select: { id: true } })) continue;
    const scheduleText = SCHEDULES[i % SCHEDULES.length]!;
    const aboutText = `${s.tagline} Somos una sede de ${settings.name} en ${s.city}: la misma familia de fe, con nuestra propia comunidad. Te esperamos.`;
    const address = `${s.city}, ${s.state}`;

    await db.$transaction(async (tx) => {
      const chapel = await tx.chapel.create({
        data: {
          name,
          code: s.code,
          address,
          isPublic: true,
          primaryColor: s.primary,
          accentColor: s.accent,
          tagline: s.tagline,
          aboutText,
          scheduleText,
          description: "Sede de ejemplo: edítala con los datos reales o archívala desde el panel.",
        },
      });
      await tx.church.create({
        data: {
          franchiseId: franchise.id,
          name,
          slug: slugify(name),
          code: s.code,
          profile: { create: { primaryColor: s.primary, accentColor: s.accent, address, aboutText, scheduleText, timezone: tz } },
        },
      });
      await tx.ministry.createMany({
        data: MINISTRIES.map((m) => ({ ...m, name: `${m.name} · ${s.city}`, isPublic: true, chapelId: chapel.id })),
      });
      for (const [j, e] of EVENTS.entries()) {
        const startsAt = at(7 + i + j * 14, e.at, tz);
        await tx.event.create({
          data: {
            title: e.title,
            description: e.description,
            typeId: types[e.type] ?? types["Otro"]!,
            startsAt,
            endsAt: new Date(startsAt.getTime() + e.hours * 3600000),
            location: name,
            visibility: "PUBLIC",
            status: "SCHEDULED",
            chapelId: chapel.id,
          },
        });
      }
    });
    created++;
  }

  console.log(created ? `Red cargada → sedes nuevas: ${created} de ${SEDES.length}` : "Las 20 sedes ya existían: no se cambió nada.");
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
