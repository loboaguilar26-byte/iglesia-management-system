export const DEFAULT_TIMEZONE = process.env.DEFAULT_TIMEZONE ?? "America/Mexico_City";

export const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** dd/mm/aaaa en la zona horaria de la iglesia. */
export function formatDate(date: Date, timeZone = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("es-MX", { timeZone, day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

/** HH:mm (24 h) en la zona horaria de la iglesia. */
export function formatTime(date: Date, timeZone = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("es-MX", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
}

/** dd/mm/aaaa HH:mm (24 h) en la zona horaria de la iglesia. */
export function formatDateTime(date: Date, timeZone = DEFAULT_TIMEZONE): string {
  return `${formatDate(date, timeZone)} ${formatTime(date, timeZone)}`;
}

/** "Domingo, 25 de octubre". */
export function formatLongDate(date: Date, timeZone = DEFAULT_TIMEZONE): string {
  const text = new Intl.DateTimeFormat("es-MX", { timeZone, weekday: "long", day: "numeric", month: "long" }).format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Fecha de calendario (columna DATE) → dd/mm/aaaa, sin conversión de zona. */
export function formatDateOnly(date: Date): string {
  return formatDate(date, "UTC");
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("es-MX", { timeZone });
    return true;
  } catch {
    return false;
  }
}

type Parts = { year: number; month: number; day: number; hour: number; minute: number; weekday: number };

/** Componentes de fecha/hora de un instante, vistos en una zona horaria. */
export function zonedParts(date: Date, timeZone = DEFAULT_TIMEZONE): Parts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  });
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    weekday: weekdays.indexOf(p.weekday),
  };
}

/** Desfase (ms) de la zona respecto a UTC en un instante dado. */
function offsetMs(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - Math.floor(date.getTime() / 60000) * 60000;
}

/** Fecha/hora local de la iglesia → instante UTC. Acepta "YYYY-MM-DDTHH:mm" o componentes. */
export function zonedToUtc(local: string | { year: number; month: number; day: number; hour?: number; minute?: number }, timeZone = DEFAULT_TIMEZONE): Date {
  let c: { year: number; month: number; day: number; hour: number; minute: number };
  if (typeof local === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?$/.exec(local.trim());
    if (!m) throw new Error("Fecha inválida");
    c = { year: +m[1], month: +m[2], day: +m[3], hour: +(m[4] ?? 0), minute: +(m[5] ?? 0) };
  } else {
    c = { hour: 0, minute: 0, ...local };
  }
  const guess = Date.UTC(c.year, c.month - 1, c.day, c.hour, c.minute);
  // Dos iteraciones resuelven correctamente los cambios de horario.
  let utc = guess - offsetMs(new Date(guess), timeZone);
  utc = guess - offsetMs(new Date(utc), timeZone);
  return new Date(utc);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Instante → valor para <input type="datetime-local"> en la zona de la iglesia. */
export function toLocalInput(date: Date, timeZone = DEFAULT_TIMEZONE): string {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** Instante → "YYYY-MM-DD" en la zona de la iglesia. */
export function toDateInput(date: Date, timeZone = DEFAULT_TIMEZONE): string {
  return toLocalInput(date, timeZone).slice(0, 10);
}

/** "YYYY-MM-DD" → Date a medianoche UTC (para columnas DATE). */
export function parseDateOnly(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Fecha inválida");
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new Error("Fecha inválida");
  return d;
}

/** Inicio y fin (exclusivo) de un mes de la iglesia, como instantes UTC. */
export function monthRange(year: number, month: number, timeZone = DEFAULT_TIMEZONE) {
  const start = zonedToUtc({ year, month, day: 1 }, timeZone);
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  const end = zonedToUtc({ ...next, day: 1 }, timeZone);
  return { start, end };
}

/** Lunes de la semana (zona de la iglesia) que contiene la fecha, como "YYYY-MM-DD". */
export function weekStartKey(date: Date, timeZone = DEFAULT_TIMEZONE): string {
  const p = zonedParts(date, timeZone);
  const back = (p.weekday + 6) % 7;
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day - back));
  return d.toISOString().slice(0, 10);
}
