/**
 * Contenido público inicial del sitio (textos, horarios, ministerios, eventos, comunicados y
 * capillas de ejemplo) para que el sitio no se vea vacío al publicarlo.
 *   pnpm db:seed:contenido
 * - Solo llena lo que está vacío: nunca sobrescribe textos ni registros que ya existan.
 * - No crea personas, cuentas ni datos de contacto: dirección, teléfono y correo se capturan en
 *   Configuración. Todo se edita o elimina desde el panel.
 */
import "dotenv/config";
import { db } from "../src/lib/db";
import { DEFAULT_TIMEZONE, zonedParts, zonedToUtc } from "../src/lib/dates";

const TEXTS = {
  tagline: "Un lugar para crecer juntos en fe, esperanza y servicio.",
  welcomeText:
    "Seas quien seas y vengas de donde vengas, aquí hay un lugar para ti. Somos una familia que se reúne para adorar a Dios, aprender de su Palabra y servir a nuestra ciudad.",
  firstVisitText: [
    "Llega 10 minutos antes: te recibiremos en la entrada y te ayudaremos a encontrar lugar.",
    "Ven como te sientas cómodo; no hay un código de vestimenta.",
    "Tenemos espacio para niños con maestros capacitados durante la reunión dominical.",
    "Al terminar, quédate a tomar un café y conocer a la comunidad.",
  ].join("\n"),
  aboutText:
    "Somos una comunidad de fe que busca vivir el amor de Dios en lo cotidiano. Nos reunimos cada semana para orar, estudiar la Biblia y acompañarnos como familia, y salimos a servir a nuestro barrio con alegría.",
  mission: "Acercar a cada persona al amor de Dios y acompañarla a crecer en fe, comunidad y servicio.",
  vision: "Ser una iglesia cercana, abierta y generosa que transforma vidas y familias en nuestra ciudad.",
  valuesText: ["Fe", "Hospitalidad", "Servicio", "Integridad", "Comunidad"].join("\n"),
  scheduleText: "Te esperamos en cualquiera de nuestras reuniones. Todas son abiertas al público.",
};

const SCHEDULES = [
  { name: "Celebración dominical", dayOfWeek: 0, startTime: "10:00", endTime: "11:30", description: "Alabanza, enseñanza bíblica y espacio para niños." },
  { name: "Reunión de la tarde", dayOfWeek: 0, startTime: "18:00", endTime: "19:15", description: "Una reunión tranquila para cerrar la semana." },
  { name: "Estudio bíblico y oración", dayOfWeek: 3, startTime: "19:30", endTime: "21:00", description: "Estudio en grupos pequeños y tiempo de oración." },
  { name: "Jóvenes", dayOfWeek: 5, startTime: "19:30", endTime: "21:30", description: "Para jóvenes de 15 a 25 años: música, temas actuales y amistad." },
];

const MINISTRIES = [
  { name: "Alabanza", description: "Músicos y cantantes que guían la adoración en nuestras reuniones." },
  { name: "Niños", description: "Enseñanza bíblica creativa y segura para niños de 3 a 12 años." },
  { name: "Jóvenes", description: "Un espacio para crecer en la fe, hacer amigos y servir juntos." },
  { name: "Matrimonios y familias", description: "Talleres y acompañamiento para fortalecer el hogar." },
  { name: "Acción social", description: "Despensas, visitas y apoyo a familias de nuestro barrio." },
  { name: "Oración", description: "Intercedemos por la iglesia, la ciudad y cada petición que recibimos." },
];

const EVENTS = [
  { title: "Noche de alabanza", type: "Culto", inDays: 9, at: "19:00", hours: 2, description: "Una noche especial de música y oración para toda la familia." },
  { title: "Taller para matrimonios", type: "Otro", inDays: 16, at: "18:00", hours: 2, description: "Herramientas prácticas para fortalecer la comunicación en pareja." },
  { title: "Campaña de ayuda comunitaria", type: "Otro", inDays: 20, at: "09:00", hours: 4, description: "Armamos y entregamos despensas a familias del barrio. ¡Ven a ayudar!" },
  { title: "Festival infantil", type: "Actividad infantil", inDays: 27, at: "11:00", hours: 3, description: "Juegos, música y una historia bíblica para niños de todas las edades." },
  { title: "Retiro de jóvenes", type: "Actividad juvenil", inDays: 34, at: "09:00", hours: 8, description: "Un día de convivencia, reflexión y actividades al aire libre." },
];

const ANNOUNCEMENTS = [
  { title: "Bienvenidos a nuestro nuevo sitio", body: "Aquí encontrarás horarios, eventos, ministerios y comunicados de la iglesia. Si eres miembro, entra a tu portal para ver tu agenda y tus aportaciones.", isFeatured: true },
  { title: "Inscripciones abiertas para el festival infantil", body: "Invita a los niños de tu familia y de tu colonia. Habrá actividades para todas las edades y un espacio seguro con maestros capacitados.", isFeatured: false },
  { title: "Necesitamos voluntarios para la campaña comunitaria", body: "Si quieres servir armando o entregando despensas, acércate al ministerio de Acción social después de la reunión dominical.", isFeatured: false },
];

const CHAPELS = [
  { name: "Capilla Norte", code: "NORTE", primaryColor: "#1f5f4a", accentColor: "#e0a83b", tagline: "Una comunidad que crece junto a sus vecinos.", scheduleText: "Domingo 09:00 Celebración\nJueves 19:00 Oración" },
  { name: "Capilla Centro", code: "CENTRO", primaryColor: "#5b2a86", accentColor: "#f2a541", tagline: "En el corazón de la ciudad, con las puertas abiertas.", scheduleText: "Domingo 12:00 Celebración\nMartes 19:30 Estudio bíblico" },
];

/** Fecha y hora de la iglesia, `inDays` días a partir de hoy. */
function at(inDays: number, time: string, tz: string) {
  const p = zonedParts(new Date(Date.now() + inDays * 86400000), tz);
  const pad = (n: number) => String(n).padStart(2, "0");
  return zonedToUtc(`${p.year}-${pad(p.month)}-${pad(p.day)}T${time}`, tz);
}

async function main() {
  const settings = await db.churchSettings.findUnique({ where: { id: "default" } });
  if (!settings) throw new Error("Primero corre `pnpm db:seed` (datos base).");
  const tz = settings.timezone || DEFAULT_TIMEZONE;
  const log: string[] = [];

  const missing = Object.fromEntries(Object.entries(TEXTS).filter(([k]) => !settings[k as keyof typeof TEXTS]));
  if (Object.keys(missing).length) {
    await db.churchSettings.update({ where: { id: "default" }, data: missing });
    log.push(`textos del sitio: ${Object.keys(missing).length}`);
  }

  if (!(await db.serviceSchedule.count())) {
    await db.serviceSchedule.createMany({ data: SCHEDULES.map((s, i) => ({ ...s, isPublic: true, sortOrder: i })) });
    log.push(`horarios: ${SCHEDULES.length}`);
  }

  if (!(await db.ministry.count({ where: { isPublic: true, isActive: true } }))) {
    for (const m of MINISTRIES) {
      await db.ministry.upsert({ where: { name: m.name }, update: { isPublic: true }, create: { ...m, isPublic: true } });
    }
    log.push(`ministerios públicos: ${MINISTRIES.length}`);
  }

  if (!(await db.event.count({ where: { visibility: "PUBLIC", status: "SCHEDULED", endsAt: { gte: new Date() } } }))) {
    const types = Object.fromEntries((await db.eventType.findMany()).map((t) => [t.name, t.id]));
    for (const e of EVENTS) {
      const startsAt = at(e.inDays, e.at, tz);
      await db.event.create({
        data: {
          title: e.title,
          description: e.description,
          typeId: types[e.type] ?? types["Otro"]!,
          startsAt,
          endsAt: new Date(startsAt.getTime() + e.hours * 3600000),
          location: "Instalaciones de la iglesia",
          visibility: "PUBLIC",
          status: "SCHEDULED",
        },
      });
    }
    log.push(`eventos: ${EVENTS.length}`);
  }

  if (!(await db.announcement.count({ where: { visibility: "PUBLIC", status: "PUBLISHED" } }))) {
    const author = await db.user.findFirst({ where: { isActive: true, roles: { some: { role: { key: "ADMIN" } } } }, orderBy: { createdAt: "asc" } });
    if (author) {
      await db.announcement.createMany({
        data: ANNOUNCEMENTS.map((a) => ({ ...a, authorId: author.id, visibility: "PUBLIC" as const, status: "PUBLISHED" as const, publishedAt: new Date() })),
      });
      log.push(`comunicados: ${ANNOUNCEMENTS.length}`);
    } else {
      log.push("comunicados: omitidos (crea primero el administrador con `pnpm setup:admin` y vuelve a correr este comando)");
    }
  }

  if (!(await db.chapel.count())) {
    for (const c of CHAPELS) {
      await db.chapel.create({
        data: {
          ...c,
          isPublic: true,
          description: "Capilla de ejemplo: edítala con los datos reales o archívala desde el panel.",
          aboutText: `${c.tagline} Te esperamos para conocernos y caminar juntos en la fe.`,
        },
      });
    }
    log.push(`capillas de ejemplo: ${CHAPELS.length}`);
  }

  console.log(log.length ? `Contenido inicial cargado → ${log.join(" · ")}` : "No había nada vacío: no se cambió ningún contenido.");
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
