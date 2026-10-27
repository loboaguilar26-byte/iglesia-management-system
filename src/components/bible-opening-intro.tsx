"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export function BibleOpeningIntro() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showTimer = window.setTimeout(() => setVisible(true), 0);
    const hideTimer = window.setTimeout(() => setVisible(false), 4200);
    return () => { window.clearTimeout(showTimer); window.clearTimeout(hideTimer); };
  }, []);

  if (!visible) return null;
  const close = () => setVisible(false);

  return <div className="eclaria-intro" role="dialog" aria-label="Presentación de Eclaria">
    <button className="eclaria-intro__skip" type="button" onClick={close}>Saltar intro</button>
    <div className="eclaria-intro__stage">
      <div className="eclaria-intro__glow" aria-hidden="true" />
      <svg className="eclaria-intro__dove" viewBox="0 0 180 100" aria-label="Paloma blanca volando" role="img">
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
      <div className="eclaria-intro__book" aria-hidden="true"><span className="eclaria-intro__cover eclaria-intro__cover--left" /><span className="eclaria-intro__cover eclaria-intro__cover--right" /><span className="eclaria-intro__page eclaria-intro__page--left" /><span className="eclaria-intro__page eclaria-intro__page--right" /><span className="eclaria-intro__spine" /></div>
      <Image className="eclaria-intro__logo" src="/eclaria-logo.jpg" alt="Eclaria, gestión integral de iglesias" width={320} height={320} priority />
    </div>
  </div>;
}
