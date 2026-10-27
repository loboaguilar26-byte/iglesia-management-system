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
      <svg className="eclaria-intro__dove" viewBox="0 0 180 100" aria-label="Paloma blanca" role="img"><path d="M8 55c22-18 44-25 67-20-8-13-2-26 12-29 5 13 14 20 28 22 17 2 29 11 39 22 8-6 17-7 26-3-9 14-24 20-41 18-12 19-29 29-50 28-22-1-39-11-51-25-12-2-21-6-30-13Z" /><path d="M76 35c-16-14-30-20-48-22 7 12 18 22 34 31 8 4 16 5 24 3-3-4-6-8-10-12Z" /><path d="M102 42c15-16 31-22 49-23-6 13-17 24-33 33-8 4-16 5-24 2 3-4 5-8 8-12Z" /><circle cx="109" cy="30" r="2.4" fill="#0b1726" /></svg>
      <div className="eclaria-intro__book" aria-hidden="true"><span className="eclaria-intro__cover eclaria-intro__cover--left" /><span className="eclaria-intro__cover eclaria-intro__cover--right" /><span className="eclaria-intro__page eclaria-intro__page--left" /><span className="eclaria-intro__page eclaria-intro__page--right" /><span className="eclaria-intro__spine" /></div>
      <Image className="eclaria-intro__logo" src="/eclaria-logo.jpg" alt="Eclaria, gestión integral de iglesias" width={320} height={320} priority />
    </div>
  </div>;
}
