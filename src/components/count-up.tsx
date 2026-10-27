"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Número que "cuenta" hasta su valor al aparecer en pantalla. El valor final está en el HTML
 * desde el servidor (accesible y sin parpadeo si JavaScript no carga).
 */
export function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || value <= 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        // El tiempo del cuadro puede ser anterior a `start`: se acota a [0, 1] para no mostrar negativos.
        const t = Math.min(1, Math.max(0, (now - start) / duration));
        setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      setShown(0);
      frame = requestAnimationFrame(tick);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className="tabular-nums" aria-label={String(value)}>
      {shown.toLocaleString("es-MX")}
    </span>
  );
}
