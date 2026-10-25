/** Solo permite volver a rutas internas del panel (evita redirecciones abiertas). */
export function safeAdminPath(value: string | null | undefined): string {
  if (value && /^\/admin(\/[\w\-/]*)?$/.test(value)) return value;
  return "/admin";
}
