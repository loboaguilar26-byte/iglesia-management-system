"use client";

import Image from "next/image";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { preload } from "react-dom";

/*
 * Intro de Eclaria: la Biblia se abre, la paloma real del logotipo sale volando hacia la luz y
 * aparece el logotipo centrado (coreografía en globals.css). Se muestra una vez por sesión y se
 * puede omitir (botón o Escape). Con "reducir movimiento" se muestra una versión quieta y breve
 * (solo el logotipo con su halo), en lugar de ocultarse.
 */
const STORAGE_KEY = "eclaria-intro-seen";
const CHANGE_EVENT = "iglesia-intro-change";
const INTRO_DURATION = 5000;
const CALM_DURATION = 2200;
let replayRequested = false;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function getSnapshot() {
  return replayRequested || sessionStorage.getItem(STORAGE_KEY) !== "true";
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

function markIntroSeen() {
  replayRequested = false;
  sessionStorage.setItem(STORAGE_KEY, "true");
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function requestIntro() {
  replayRequested = true;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function BookOpeningIntro({ churchName, playOnMount = false }: { churchName: string; playOnMount?: boolean }) {
  // Se piden desde el inicio para que la paloma y el logotipo estén listos al aparecer.
  preload("/intro/paloma.webp", { as: "image", fetchPriority: "high" });
  preload("/eclaria-logo.jpg", { as: "image", fetchPriority: "high" });
  const visible = useSyncExternalStore(subscribe, getSnapshot, () => false);
  const skipButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (playOnMount) requestIntro();
  }, [playOnMount]);

  useEffect(() => {
    if (!visible) return;
    skipButton.current?.focus();
    const timeout = window.setTimeout(markIntroSeen, reducedMotion() ? CALM_DURATION : INTRO_DURATION);
    return () => window.clearTimeout(timeout);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="eclaria-intro"
      role="dialog"
      aria-modal="true"
      aria-label={`Bienvenidos a ${churchName}`}
      onKeyDown={(event) => {
        if (event.key === "Escape") markIntroSeen();
        if (event.key === "Tab") {
          event.preventDefault();
          skipButton.current?.focus();
        }
      }}
    >
      <button ref={skipButton} className="eclaria-intro__skip" type="button" onClick={markIntroSeen}>
        Omitir introducción
      </button>
      <div className="eclaria-intro__stars" aria-hidden="true" />
      <div className="eclaria-intro__stage">
        <div className="eclaria-intro__rays" aria-hidden="true" />
        <div className="eclaria-intro__glow" aria-hidden="true" />
        <div className="eclaria-intro__book" aria-hidden="true">
          <span className="eclaria-intro__cover eclaria-intro__cover--left" />
          <span className="eclaria-intro__cover eclaria-intro__cover--right" />
          <span className="eclaria-intro__page eclaria-intro__page--left" />
          <span className="eclaria-intro__page eclaria-intro__page--right" />
          <span className="eclaria-intro__spine" />
        </div>
        {/* Paloma real del logotipo (public/intro/paloma.webp) en tres capas: cada ala aletea desde su hombro. */}
        <div className="eclaria-intro__dove" aria-hidden="true">
          <span className="eclaria-intro__dove-part eclaria-intro__dove-part--wing-left" />
          <span className="eclaria-intro__dove-part eclaria-intro__dove-part--wing-right" />
          <span className="eclaria-intro__dove-part eclaria-intro__dove-part--body" />
        </div>
        <div className="eclaria-intro__halo" aria-hidden="true" />
        <Image className="eclaria-intro__logo" src="/eclaria-logo.jpg" alt="" width={320} height={320} priority />
      </div>
    </div>
  );
}
