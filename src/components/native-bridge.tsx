"use client";

import { useEffect } from "react";

/**
 * Integración con la app móvil (Capacitor). En el navegador no hace nada; dentro de la app
 * Android/iOS ajusta la barra de estado al tema, oculta la pantalla de inicio al cargar y hace
 * que el botón "atrás" de Android navegue hacia atrás (o cierre la app en la portada).
 */
export function NativeBridge() {
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;
      document.documentElement.dataset.native = Capacitor.getPlatform();

      const [{ App }, { StatusBar, Style }, { SplashScreen }] = await Promise.all([
        import("@capacitor/app"),
        import("@capacitor/status-bar"),
        import("@capacitor/splash-screen"),
      ]);

      const applyTheme = () => {
        const dark = document.documentElement.dataset.theme === "dark" || (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
        StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => undefined);
        if (Capacitor.getPlatform() === "android") {
          const bg = getComputedStyle(document.body).backgroundColor;
          const hex = rgbToHex(bg);
          if (hex) StatusBar.setBackgroundColor({ color: hex }).catch(() => undefined);
        }
      };
      applyTheme();
      const observer = new MutationObserver(applyTheme);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      SplashScreen.hide().catch(() => undefined);

      const back = await App.addListener("backButton", ({ canGoBack }) => {
        const atRoot = ["/", "/admin", "/mi-cuenta", "/login"].includes(location.pathname);
        if (canGoBack && !atRoot) history.back();
        else App.minimizeApp().catch(() => App.exitApp());
      });
      cleanup = () => {
        observer.disconnect();
        back.remove();
      };
    })().catch(() => undefined);
    return () => cleanup?.();
  }, []);
  return null;
}

function rgbToHex(rgb: string) {
  const m = rgb.match(/\d+/g);
  if (!m || m.length < 3) return null;
  return `#${m.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, "0")).join("")}`;
}
