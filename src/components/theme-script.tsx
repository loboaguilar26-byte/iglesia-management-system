"use client";

const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

/**
 * Aplica el tema guardado antes del primer pintado (evita el parpadeo claro/oscuro).
 * Solo se renderiza en el servidor: el navegador lo ejecuta al leer el HTML. Si React tuviera que
 * volver a dibujar la página en el cliente (p. ej. una extensión alteró el HTML), no recrea el
 * <script>, que ahí nunca se ejecutaría y React marca como error.
 */
export function ThemeScript() {
  if (typeof window !== "undefined") return null;
  return <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />;
}
