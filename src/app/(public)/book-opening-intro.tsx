"use client";

import Image from "next/image";
import { useEffect, useRef, useSyncExternalStore } from "react";

/*
 * Intro de Eclaria: la Biblia se abre, la paloma sale volando hacia la luz y aparece el logotipo
 * centrado (diseño de main, coreografía en globals.css). Se muestra una vez por sesión, se puede omitir (botón o Escape) y no aparece con
 * "reducir movimiento".
 */
const STORAGE_KEY = "eclaria-intro-seen";
const CHANGE_EVENT = "iglesia-intro-change";
const INTRO_DURATION = 4600;
let replayRequested = false;

function getSnapshot() {
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    (replayRequested || sessionStorage.getItem(STORAGE_KEY) !== "true");
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
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  replayRequested = true;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function BookOpeningIntro({ churchName, playOnMount = false }: { churchName: string; playOnMount?: boolean }) {
  const visible = useSyncExternalStore(subscribe, getSnapshot, () => false);
  const skipButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (playOnMount) requestIntro();
  }, [playOnMount]);

  useEffect(() => {
    if (!visible) return;
    skipButton.current?.focus();
    const timeout = window.setTimeout(markIntroSeen, INTRO_DURATION);
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
        <svg className="eclaria-intro__dove" viewBox="0 0 180 100" aria-hidden="true">
          <g className="eclaria-intro__dove-wing eclaria-intro__dove-wing--left">
            <path d="M82 53C61 31 35 19 7 20c14 22 35 42 61 48 10 2 17-4 22-13Z" />
            <path className="eclaria-intro__dove-feather" d="M15 27c18 14 34 25 51 31M26 24c16 14 29 25 45 32M40 25c12 13 23 23 37 31" />
          </g>
          <g className="eclaria-intro__dove-wing eclaria-intro__dove-wing--right">
            <path d="M101 54c20-22 44-35 72-34-14 22-35 42-61 48-9 2-16-4-21-14Z" />
            <path className="eclaria-intro__dove-feather" d="M165 27c-18 14-34 25-51 31M154 24c-16 14-29 25-45 32M140 25c-12 13-23 23-37 31" />
          </g>
          <path className="eclaria-intro__dove-body" d="M65 57c8-16 22-25 39-25 16 0 29 8 39 24-10 15-25 23-43 23-16 0-29-7-35-22Z" />
          <circle className="eclaria-intro__dove-head" cx="105" cy="31" r="12" />
          <path className="eclaria-intro__dove-beak" d="m115 30 12 5-12 5Z" />
          <circle cx="108" cy="28" r="2.4" fill="#0b1726" />
        </svg>
        <div className="eclaria-intro__book" aria-hidden="true">
          <span className="eclaria-intro__cover eclaria-intro__cover--left" />
          <span className="eclaria-intro__cover eclaria-intro__cover--right" />
          <span className="eclaria-intro__page eclaria-intro__page--left" />
          <span className="eclaria-intro__page eclaria-intro__page--right" />
          <span className="eclaria-intro__spine" />
        </div>
        <div className="eclaria-intro__halo" aria-hidden="true" />
        <Image className="eclaria-intro__logo" src="/eclaria-logo.jpg" alt="" width={320} height={320} priority />
      </div>
    </div>
  );
}
