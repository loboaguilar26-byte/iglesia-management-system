"use client";

import { useEffect, useState } from "react";
import { WEEKDAYS, zonedParts } from "@/lib/dates";
import type { PublicSchedule } from "./components";

/** Próxima reunión según los horarios habituales (se calcula en el navegador con la hora de la iglesia). */
export function NextService({ schedules, tz }: { schedules: PublicSchedule[]; tz: string }) {
  const [label, setLabel] = useState<{ when: string; name: string; location: string | null } | null>(null);

  useEffect(() => {
    const now = zonedParts(new Date(), tz);
    const nowMin = now.weekday * 1440 + now.hour * 60 + now.minute;
    let best: { diff: number; s: PublicSchedule } | null = null;
    for (const s of schedules) {
      const [h, m] = s.startTime.split(":").map(Number);
      let diff = s.dayOfWeek * 1440 + h * 60 + m - nowMin;
      if (diff < 0) diff += 7 * 1440;
      if (!best || diff < best.diff) best = { diff, s };
    }
    if (!best) return;
    const dayDiff = Math.floor((now.hour * 60 + now.minute + best.diff) / 1440);
    const day = dayDiff === 0 ? "Hoy" : dayDiff === 1 ? "Mañana" : WEEKDAYS[best.s.dayOfWeek];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- depende de la hora del navegador
    setLabel({ when: `${day}, ${best.s.startTime} h`, name: best.s.name, location: best.s.location });
  }, [schedules, tz]);

  if (!schedules.length) return null;
  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm" aria-live="polite">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Próxima reunión</p>
      {label ? (
        <>
          <p className="mt-2 font-display text-2xl font-semibold">{label.name}</p>
          <p className="mt-1 opacity-90">{label.when}{label.location ? ` · ${label.location}` : ""}</p>
        </>
      ) : (
        <p className="mt-2 opacity-80">Consultando horario…</p>
      )}
    </div>
  );
}
