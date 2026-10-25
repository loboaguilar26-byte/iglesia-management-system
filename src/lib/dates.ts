export const DEFAULT_TIMEZONE = process.env.DEFAULT_TIMEZONE ?? "America/Mexico_City";

/** dd/mm/aaaa en la zona horaria de la iglesia. */
export function formatDate(date: Date, timeZone = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/** dd/mm/aaaa HH:mm (24 h) en la zona horaria de la iglesia. */
export function formatDateTime(date: Date, timeZone = DEFAULT_TIMEZONE): string {
  const time = new Intl.DateTimeFormat("es-MX", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
  return `${formatDate(date, timeZone)} ${time}`;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("es-MX", { timeZone });
    return true;
  } catch {
    return false;
  }
}
