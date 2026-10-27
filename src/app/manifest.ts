import type { MetadataRoute } from "next";
import { getPublicSite } from "@/modules/public/service";

/** Manifiesto de la app instalable (Android, Chrome/Edge en PC, iPhone vía "Agregar a inicio"). */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { settings } = await getPublicSite();
  const short = settings.name.length > 12 ? settings.name.split(/\s+/).slice(0, 2).join(" ").slice(0, 12) : settings.name;
  return {
    name: settings.name,
    short_name: short,
    description: settings.tagline ?? `Sitio y sistema de gestión de ${settings.name}`,
    lang: "es-MX",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8f3ec",
    theme_color: "#2a1a10",
    categories: ["lifestyle", "social", "productivity"],
    icons: [
      { src: "/app-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app-icon/512?maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Eventos", url: "/eventos" },
      { name: "Mi cuenta", url: "/mi-cuenta" },
      { name: "Panel", url: "/admin" },
    ],
  };
}
