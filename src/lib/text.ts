/** Minúsculas, sin acentos y con espacios simples: "  José  PÉREZ " → "jose perez". */
export function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}
