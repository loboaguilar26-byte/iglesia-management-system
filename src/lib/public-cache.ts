import { updateTag } from "next/cache";

/** Etiqueta de caché del sitio público. */
export const PUBLIC_TAG = "public-site";

/** Llamar desde Server Actions que cambian datos visibles en el sitio público. */
export function refreshPublicSite() {
  updateTag(PUBLIC_TAG);
}
