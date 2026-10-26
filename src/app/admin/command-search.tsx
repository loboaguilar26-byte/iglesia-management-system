"use client";

import { CalendarDays, HandHeart, Megaphone, Search, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { SearchResult } from "@/modules/search/service";

const ICON = { member: User, event: CalendarDays, ministry: HandHeart, announcement: Megaphone };

/** Búsqueda global (Ctrl/⌘ + K): personas, eventos, ministerios y comunicados según permisos. */
export function CommandSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => input.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (res.ok) {
          setResults((await res.json()).data);
          setActive(0);
        }
      } catch {
        /* cancelada */
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const go = (r: SearchResult) => {
    setOpen(false);
    setQ("");
    setResults([]);
    router.push(r.href);
  };
  const shown = q.trim().length < 2 ? [] : results;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-10 w-full max-w-xs items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 text-sm text-muted transition hover:border-primary/40"
      >
        <Search aria-hidden className="size-4" />
        <span className="flex-1 text-left">Buscar…</span>
        <kbd className="hidden rounded border border-border bg-surface px-1.5 text-[10px] font-medium sm:inline">Ctrl K</kbd>
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Búsqueda global">
          <button type="button" aria-label="Cerrar búsqueda" className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search aria-hidden className="size-5 text-muted" />
              <input
                ref={input}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActive((i) => Math.min(i + 1, shown.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActive((i) => Math.max(i - 1, 0));
                  } else if (e.key === "Enter" && shown[active]) go(shown[active]);
                }}
                placeholder="Buscar personas, eventos, ministerios, comunicados…"
                aria-label="Buscar"
                role="combobox"
                aria-expanded={shown.length > 0}
                aria-controls="search-results"
                className="min-h-14 flex-1 bg-transparent text-base outline-none"
              />
              {loading ? <span className="text-xs text-muted">Buscando…</span> : null}
            </div>
            <ul id="search-results" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
              {q.trim().length < 2 ? (
                <li className="px-3 py-6 text-center text-sm text-muted">Escribe al menos 2 letras.</li>
              ) : shown.length === 0 && !loading ? (
                <li className="px-3 py-6 text-center text-sm text-muted">Sin resultados.</li>
              ) : (
                shown.map((r, i) => {
                  const Icon = ICON[r.kind];
                  return (
                    <li key={`${r.kind}-${r.id}`} role="option" aria-selected={i === active}>
                      <button
                        type="button"
                        onMouseEnter={() => setActive(i)}
                        onClick={() => go(r)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ${i === active ? "bg-accent-soft" : ""}`}
                      >
                        <span className="rounded-lg bg-surface-2 p-2 text-primary"><Icon aria-hidden className="size-4" /></span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{r.title}</span>
                          {r.subtitle ? <span className="block truncate text-xs text-muted">{r.subtitle}</span> : null}
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
