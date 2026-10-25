/**
 * Datos de DEMOSTRACIÓN (ficticios) para probar el sistema. Nunca se ejecuta en producción.
 *   pnpm db:seed:demo
 * Requiere que exista al menos un usuario (pnpm setup:admin). No crea usuarios ni contraseñas.
 */
import "dotenv/config";
import { db } from "../src/lib/db";
import { DEFAULT_TIMEZONE, zonedParts, zonedToUtc } from "../src/lib/dates";
import { normalizeSearch } from "../src/lib/text";
import { seedBase } from "./seed-base";

if (process.env.NODE_ENV === "production") {
  console.error("El seed de demostración está bloqueado en producción.");
  process.exit(1);
}

// Generador pseudoaleatorio determinista: los datos son iguales en cada ejecución.
let state = 42;
const rand = () => ((state = (state * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

const FIRST = ["Ana", "Luis", "María", "José", "Sofía", "Carlos", "Lucía", "Miguel", "Elena", "Jorge", "Paula", "Andrés", "Valeria", "Diego", "Camila", "Raúl", "Daniela", "Héctor", "Isabel", "Tomás"];
const LAST = ["García", "Hernández", "López", "Martínez", "Pérez", "Ramírez", "Sánchez", "Torres", "Flores", "Vargas", "Castillo", "Morales", "Ortiz", "Rojas", "Navarro"];

async function main() {
  const author = await db.user.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
  if (!author) throw new Error("Primero crea el administrador con pnpm setup:admin.");
  if (await db.member.count({ where: { email: { endsWith: "@ejemplo.org" } } })) {
    console.log("Los datos de demostración ya están cargados.");
    return;
  }
  await seedBase();
  const tz = DEFAULT_TIMEZONE;

  const settings = await db.churchSettings.findUnique({ where: { id: "default" } });
  if (!settings || settings.name.includes("(configurar)")) {
    await db.churchSettings.update({
      where: { id: "default" },
      data: {
        name: "Comunidad de Fe (DEMO)",
        tagline: "Un lugar para crecer juntos en fe, esperanza y servicio.",
        welcomeText: "Sin importar de dónde vengas, aquí hay un lugar para ti. Te invitamos a conocernos y a ser parte de esta familia.",
        aboutText: "Somos una comunidad de demostración creada para probar el sistema. Este texto es ficticio: reemplázalo desde Configuración con la historia y la identidad de tu iglesia.\n\nNos reunimos cada semana para adorar, aprender y servir a nuestra ciudad.",
        mission: "Compartir esperanza y servir a nuestra comunidad con amor.",
        vision: "Ser una familia que acompaña a cada persona a crecer y a servir.",
        valuesText: "Hospitalidad\nServicio\nIntegridad\nGenerosidad\nComunidad",
        scheduleText: "Todas nuestras reuniones son abiertas al público.",
        address: "Calle Ejemplo 123, Col. Centro (dirección de demostración)",
        phone: "55 0000 0000",
        email: "contacto@ejemplo.org",
        mapUrl: "https://www.openstreetmap.org/",
        privacyNotice: "Aviso de privacidad de demostración. La iglesia debe redactar el suyo, con asesoría legal, conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.",
      },
    });
  }

  if (!(await db.serviceSchedule.count())) {
    await db.serviceSchedule.createMany({
      data: [
        { name: "Reunión dominical", dayOfWeek: 0, startTime: "10:00", endTime: "12:00", location: "Auditorio principal", description: "Alabanza, enseñanza y actividades para niños.", sortOrder: 1 },
        { name: "Reunión de oración", dayOfWeek: 3, startTime: "19:00", endTime: "20:00", location: "Salón 2", sortOrder: 2 },
        { name: "Estudio bíblico", dayOfWeek: 4, startTime: "19:30", endTime: "21:00", location: "Salón 1", sortOrder: 3 },
        { name: "Reunión de jóvenes", dayOfWeek: 6, startTime: "18:00", endTime: "20:00", location: "Salón de jóvenes", sortOrder: 4 },
      ],
    });
  }

  const ministryNames = ["Alabanza y música", "Jóvenes", "Niños", "Enseñanza", "Servicio", "Evangelización", "Oración"];
  const ministries = [];
  for (const name of ministryNames) {
    ministries.push(await db.ministry.upsert({ where: { name }, update: {}, create: { name, description: `Ministerio de ${name.toLowerCase()} (demostración).` } }));
  }

  const members = [];
  for (let i = 0; i < 48; i++) {
    const firstName = FIRST[i % FIRST.length];
    const lastName = `${pick(LAST)} ${pick(LAST)}`;
    const status = i < 38 ? "ACTIVE" : i < 44 ? "VISITOR" : "INACTIVE";
    const joinYear = 2015 + Math.floor(rand() * 11);
    members.push(
      await db.member.create({
        data: {
          firstName,
          lastName,
          searchName: normalizeSearch(`${firstName} ${lastName}`),
          email: rand() > 0.3 ? `persona${i + 1}@ejemplo.org` : null,
          phone: rand() > 0.4 ? `55 0000 ${String(1000 + i)}` : null,
          joinDate: status === "VISITOR" ? null : new Date(Date.UTC(joinYear, Math.floor(rand() * 12), 1 + Math.floor(rand() * 27))),
          status,
          isMinor: i % 13 === 5,
          createdById: author.id,
          updatedById: author.id,
        },
      }),
    );
  }
  const active = members.filter((m) => m.status === "ACTIVE");
  for (const [idx, ministry] of ministries.entries()) {
    const group = active.filter((_, i) => (i + idx) % 4 === 0 || (i * 7 + idx) % 9 === 0).slice(0, 9);
    for (const [j, m] of group.entries()) {
      await db.ministryMembership.create({ data: { ministryId: ministry.id, memberId: m.id, role: j === 0 ? "COORDINATOR" : "MEMBER", startDate: new Date(Date.UTC(2024, j % 12, 1)) } });
    }
  }

  const types = Object.fromEntries((await db.eventType.findMany()).map((t) => [t.name, t.id]));
  const now = new Date();
  const today = zonedParts(now, tz);
  const sundayOffset = -today.weekday;
  const at = (dayOffset: number, hour: number, minute = 0) => zonedToUtc({ year: today.year, month: today.month, day: today.day + dayOffset, hour, minute }, tz);

  // Reuniones dominicales: 10 semanas pasadas y 3 futuras.
  for (let w = -10; w <= 3; w++) {
    const startsAt = at(sundayOffset + w * 7, 10);
    const ev = await db.event.create({
      data: { title: "Reunión dominical", typeId: types["Culto"], startsAt, endsAt: at(sundayOffset + w * 7, 12), location: "Auditorio principal", visibility: "PUBLIC", visitorCount: startsAt < now ? 3 + Math.floor(rand() * 9) : 0 },
    });
    if (startsAt < now) {
      await db.attendance.createMany({
        data: members.filter((m) => m.status !== "INACTIVE").map((m) => ({ eventId: ev.id, memberId: m.id, status: rand() > 0.22 ? ("PRESENT" as const) : ("ABSENT" as const), recordedById: author.id })),
      });
    }
  }
  const youth = ministries.find((m) => m.name === "Jóvenes")!;
  const upcoming = [
    { title: "Noche de jóvenes", type: "Actividad juvenil", day: 6, hour: 18, ministryId: youth.id, visibility: "PUBLIC" as const, description: "Música, convivencia y una charla para jóvenes de 15 a 25 años." },
    { title: "Ensayo de alabanza", type: "Ensayo", day: 5, hour: 19, ministryId: ministries[0].id, visibility: "PRIVATE" as const },
    { title: "Reunión de líderes", type: "Reunión administrativa", day: 9, hour: 20, ministryId: null, visibility: "PRIVATE" as const },
    { title: "Campaña de ayuda comunitaria", type: "Otro", day: 13, hour: 9, ministryId: ministries[4].id, visibility: "PUBLIC" as const, description: "Recolección de víveres para familias de la colonia. ¡Todos pueden participar!" },
    { title: "Festival infantil", type: "Actividad infantil", day: 20, hour: 11, ministryId: ministries[2].id, visibility: "PUBLIC" as const, description: "Juegos, manualidades y una obra de teatro para niños." },
  ];
  for (const u of upcoming) {
    await db.event.create({ data: { title: u.title, typeId: types[u.type], startsAt: at(u.day, u.hour), endsAt: at(u.day, u.hour + 2), location: "Instalaciones de la iglesia", ministryId: u.ministryId, visibility: u.visibility, description: u.description ?? null } });
  }
  await db.event.create({ data: { title: "Retiro de fin de semana", typeId: types["Otro"], startsAt: at(16, 8), endsAt: at(16, 18), location: "Por definir", visibility: "PUBLIC", status: "CANCELLED", cancelledReason: "Se reprogramará (demostración)." } });

  const concepts = Object.fromEntries((await db.donationConcept.findMany()).map((c) => [c.name, c.id]));
  const methods = Object.fromEntries((await db.paymentMethod.findMany()).map((c) => [c.name, c.id]));
  for (let d = 180; d >= 1; d -= 7) {
    const day = new Date(Date.UTC(today.year, today.month - 1, today.day - d));
    for (let k = 0; k < 6; k++) {
      const anonymous = rand() > 0.6;
      await db.donation.create({
        data: {
          receivedAt: day,
          amount: (Math.round((100 + rand() * 1900) / 10) * 10).toFixed(2),
          conceptId: pick([concepts["Diezmo"], concepts["Diezmo"], concepts["Ofrenda"], concepts["Ofrenda"], concepts["Misiones"]]),
          methodId: pick([methods["Efectivo"], methods["Efectivo"], methods["Transferencia"]]),
          memberId: anonymous ? null : pick(active).id,
          createdById: author.id,
        },
      });
    }
  }

  await db.announcement.createMany({
    data: [
      { title: "Bienvenidos al nuevo sitio (demostración)", body: "Este es un comunicado de ejemplo. Desde el panel puedes crear avisos públicos o internos, destacarlos y definir su vigencia.", authorId: author.id, visibility: "PUBLIC", status: "PUBLISHED", isFeatured: true, publishedAt: now },
      { title: "Inscripciones abiertas para el festival infantil", body: "Invita a los niños de tu familia y vecinos. Habrá actividades para todas las edades.", authorId: author.id, visibility: "PUBLIC", status: "PUBLISHED", publishedAt: now },
      { title: "Reunión de coordinadores", body: "Aviso interno: los coordinadores de ministerio se reúnen el próximo martes. (Solo visible en el panel.)", authorId: author.id, visibility: "PRIVATE", status: "PUBLISHED", publishedAt: now },
    ],
  });
  console.log("Datos de demostración cargados: 48 personas, 7 ministerios, eventos, asistencia, aportaciones y comunicados.");
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
