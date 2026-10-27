/** Solo permite volver a rutas internas del panel (evita redirecciones abiertas). */
export function safeAdminPath(value: string | null | undefined): string {
  if (value && /^\/(admin|mi-cuenta)(\/[\w\-/]*)?$/.test(value)) return value;
  return "/admin";
}
