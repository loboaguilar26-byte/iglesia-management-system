"use client";

const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

/**
 * Aplica el tema guardado antes del primer pintado (evita el parpadeo claro/oscuro).
 * Solo hace falta en el HTML del servidor: si React vuelve a montar el layout en el navegador,
 * el script se marca como texto plano para que React no avise de "script tag" (no se ejecutaría).
 */
export function ThemeScript() {
  return (
    <script
      type={typeof window === "undefined" ? undefined : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
    />
  );
}
