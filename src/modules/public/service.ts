import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { PUBLIC_TAG } from "@/lib/public-cache";

/*
 * Datos del sitio público. Cada consulta selecciona campos explícitos y filtra lo marcado como
 * público: nunca devuelve miembros, contactos personales, asistencia ni información financiera.
 * Se guardan en caché unos minutos y se invalidan al editar desde el panel (refreshPublicSite).
 */

export async function getPublicSite() {
  "use cache";
  cacheTag(PUBLIC_TAG);
  cacheLife("minutes");
  const [settings, schedules] = await Promise.all([
    db.churchSettings.findUnique({
      where: { id: "default" },
      select: {
        name: true,
        tagline: true,
        welcomeText: true,
        firstVisitText: true,
        aboutText: true,
        mission: true,
        vision: true,
        valuesText: true,
        scheduleText: true,
        address: true,
        phone: true,
        email: true,
        whatsapp: true,
        mapUrl: true,
        facebookUrl: true,
        instagramUrl: true,
        youtubeUrl: true,
        privacyNotice: true,
        logoPath: true,
        timezone: true,
      },
    }),
    db.serviceSchedule.findMany({
      where: { isPublic: true },
      orderBy: [{ sortOrder: "asc" }, { dayOfWeek: "asc" }, { startTime: "asc" }],
      select: { id: true, name: true, dayOfWeek: true, startTime: true, endTime: true, location: true, description: true },
    }),
  ]);
  return {
    settings: settings ?? { name: "Iglesia", tagline: null, welcomeText: null, firstVisitText: null, aboutText: null, mission: null, vision: null, valuesText: null, scheduleText: null, address: null, phone: null, email: null, whatsapp: null, mapUrl: null, facebookUrl: null, instagramUrl: null, youtubeUrl: null, privacyNotice: null, logoPath: null, timezone: "America/Mexico_City" },
    schedules,
  };
}

const publicEventSelect = {
  id: true,
  title: true,
  startsAt: true,
  endsAt: true,
  location: true,
  description: true,
  status: true,
  type: { select: { name: true } },
} as const;

export async function getPublicEvents(take = 30) {
  "use cache";
  cacheTag(PUBLIC_TAG);
  cacheLife("minutes");
  return db.event.findMany({
    where: { visibility: "PUBLIC", status: { not: "COMPLETED" }, endsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    take,
    select: publicEventSelect,
  });
}

export async function getPublicEvent(id: string) {
  "use cache";
  cacheTag(PUBLIC_TAG);
  cacheLife("minutes");
  return db.event.findFirst({ where: { id, visibility: "PUBLIC" }, select: publicEventSelect });
}

/** Ministerios marcados como públicos: solo nombre y descripción (nunca integrantes). */
export async function getPublicMinistries() {
  "use cache";
  cacheTag(PUBLIC_TAG);
  cacheLife("minutes");
  return db.ministry.findMany({
    where: { isPublic: true, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, description: true },
  });
}

/** Eventos públicos de un mes (para el calendario del sitio). */
export async function getPublicEventsInRange(fromIso: string, toIso: string) {
  "use cache";
  cacheTag(PUBLIC_TAG);
  cacheLife("minutes");
  return db.event.findMany({
    where: { visibility: "PUBLIC", startsAt: { gte: new Date(fromIso), lt: new Date(toIso) } },
    orderBy: { startsAt: "asc" },
    select: publicEventSelect,
  });
}

export async function getPublicAnnouncements(take = 20) {
  "use cache";
  cacheTag(PUBLIC_TAG);
  cacheLife("minutes");
  const now = new Date();
  return db.announcement.findMany({
    where: { visibility: "PUBLIC", status: "PUBLISHED", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
    take,
    select: { id: true, title: true, body: true, isFeatured: true, publishedAt: true },
  });
}

export async function getPublicAnnouncement(id: string) {
  "use cache";
  cacheTag(PUBLIC_TAG);
  cacheLife("minutes");
  const now = new Date();
  return db.announcement.findFirst({
    where: { id, visibility: "PUBLIC", status: "PUBLISHED", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    select: { id: true, title: true, body: true, isFeatured: true, publishedAt: true },
  });
}
