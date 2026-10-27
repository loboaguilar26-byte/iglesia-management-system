"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

const STORAGE_KEY = "eclaria-intro-seen";
const CHANGE_EVENT = "iglesia-intro-change";
const INTRO_DURATION = 3000;
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
    const timeout = window.setTimeout(() => {
      markIntroSeen();
    }, INTRO_DURATION);
    return () => window.clearTimeout(timeout);
  }, [visible]);

  function dismiss() {
    markIntroSeen();
  }

  if (!visible) return null;

  return (
    <div
      className="book-intro"
      role="dialog"
      aria-modal="true"
      aria-label={`Bienvenidos a ${churchName}`}
      onKeyDown={(event) => {
        if (event.key === "Escape") dismiss();
        if (event.key === "Tab") {
          event.preventDefault();
          skipButton.current?.focus();
        }
      }}
    >
      <div className="book-intro__content">
        <svg className="book-intro__dove" viewBox="0 0 120 80" aria-hidden="true">
          <path d="M8 45c16-2 26-11 34-28 3 12 9 19 18 23 8-13 22-21 43-21-9 7-14 15-15 24 10-1 20 1 29 7-18 1-29 8-36 19-9-9-18-13-29-12-15 2-29-1-44-12Z" fill="currentColor" />
          <path d="M36 55c14-8 26-10 38-7" fill="none" stroke="#FFF9EC" strokeLinecap="round" strokeWidth="2" opacity=".8" />
        </svg>
        <div className="book-intro__book" aria-hidden="true">
          <span className="book-intro__pages book-intro__pages--left" />
          <span className="book-intro__pages book-intro__pages--right" />
          <span className="book-intro__cover" />
          <span className="book-intro__spine" />
        </div>
        <p className="book-intro__eyebrow">Una historia de fe y comunidad</p>
        <p className="book-intro__name">{churchName}</p>
        <button ref={skipButton} type="button" className="book-intro__skip" onClick={dismiss}>
          Omitir introducción
        </button>
      </div>
    </div>
  );
}
