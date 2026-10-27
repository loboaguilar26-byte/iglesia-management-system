import { cacheLife } from "next/cache";
import { db } from "@/lib/db";
import { getSettingsInternal } from "../settings/service";

const DEFAULT_SETTINGS = {
  name: "Nombre de la iglesia",
  tagline: null, welcomeText: null, firstVisitText: null, aboutText: null,
  mission: null, vision: null, valuesText: null, scheduleText: null,
  address: null, phone: null, email: null, whatsapp: null, mapUrl: null,
  facebookUrl: null, instagramUrl: null, youtubeUrl: null, privacyNotice: null,
  timezone: "America/Mexico_City", currency: "MXN",
};

export async function getPublicSite() {
  "use cache";
  cacheLife("minutes");
  const [settings, schedules] = await Promise.all([
    getSettingsInternal().catch(() => DEFAULT_SETTINGS),
    db.serviceSchedule.findMany({
      where: { isPublic: true },
      orderBy: [{ sortOrder: "asc" }, { dayOfWeek: "asc" }, { startTime: "asc" }],
      select: { id: true, name: true, dayOfWeek: true, startTime: true, endTime: true, location: true, description: true },
    }).catch(() => []),
  ]);
  return { settings, schedules };
}

const publicEventSelect = {
  id: true, title: true, startsAt: true, endsAt: true, location: true, description: true,
  status: true, type: { select: { name: true } },
} as const;

export async function getPublicEvents(take = 30) {
  "use cache";
  cacheLife("minutes");
  return db.event.findMany({
    where: { visibility: "PUBLIC", status: { not: "CANCELLED" }, endsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" }, take, select: publicEventSelect,
  }).catch(() => []);
}

export async function getPublicEvent(id: string) {
  "use cache";
  cacheLife("minutes");
  return db.event.findFirst({ where: { id, visibility: "PUBLIC" }, select: publicEventSelect }).catch(() => null);
}

export async function getPublicMinistries() {
  "use cache";
  cacheLife("minutes");
  return db.ministry.findMany({ where: { isPublic: true, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, description: true } }).catch(() => []);
}

export async function getPublicAnnouncements(take = 20) {
  "use cache";
  cacheLife("minutes");
  const now = new Date();
  return db.announcement.findMany({
    where: { visibility: "PUBLIC", status: "PUBLISHED", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }], take,
    select: { id: true, title: true, body: true, isFeatured: true, publishedAt: true },
  }).catch(() => []);
}

export async function getPublicAnnouncement(id: string) {
  "use cache";
  cacheLife("minutes");
  const now = new Date();
  return db.announcement.findFirst({
    where: { id, visibility: "PUBLIC", status: "PUBLISHED", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    select: { id: true, title: true, body: true, isFeatured: true, publishedAt: true },
  }).catch(() => null);
}
