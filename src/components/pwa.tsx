"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Registra el service worker (solo en producción, para no interferir con el desarrollo). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => undefined);
  }, []);
  return null;
}

/**
 * Botón "Instalar app": aparece solo cuando el navegador lo permite (Android, Chrome/Edge en PC).
 * En iPhone se instala desde Compartir → "Agregar a inicio".
 */
export function InstallAppButton({ className = "" }: { className?: string }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
    };
    const onInstalled = () => setPrompt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  if (!prompt) return null;
  return (
    <button
      type="button"
      onClick={async () => {
        await prompt.prompt();
        await prompt.userChoice;
        setPrompt(null);
      }}
      className={`inline-flex items-center gap-2 rounded-full border border-current/20 px-4 py-2 text-sm font-medium transition hover:bg-white/10 ${className}`}
    >
      <Download aria-hidden className="size-4" /> Instalar app
    </button>
  );
}
