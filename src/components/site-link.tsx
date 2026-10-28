import { Globe } from "lucide-react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

/** Botón para ir al sitio público desde el panel o el portal (cualquier rol). */
export function SiteLink() {
  return (
    <Link href="/" aria-label="Ver sitio web" title="Ver sitio web" className={buttonClass("ghost", "shrink-0")}>
      <Globe aria-hidden className="size-4" />
      <span className="hidden sm:inline">Ver sitio</span>
    </Link>
  );
}
