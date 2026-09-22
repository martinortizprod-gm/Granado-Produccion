"use client";

import { useEffect, useRef, useState } from "react";
import { IconColumns } from "@/components/ui/icons";
import type { ColDef } from "@/components/ui/use-column-visibility";

export function ColumnPicker({
  cols,
  isVisible,
  onToggle,
}: {
  cols: ColDef[];
  isVisible: (id: string) => boolean;
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const opciones = cols.filter((c) => !c.locked);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="g-btn g-btn-icon"
        title="Elegir columnas"
        aria-label="Elegir columnas visibles"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <IconColumns className="h-[18px] w-[18px]" />
      </button>
      {open ? (
        <div className="g-card absolute top-[calc(100%+4px)] right-0 z-30 min-w-[200px] p-2 shadow-[var(--shadow-md)]">
          <p className="px-1.5 pb-1.5 text-[11px] font-medium text-[var(--color-text-muted)]">
            Columnas visibles
          </p>
          <ul className="space-y-0.5">
            {opciones.map((c) => (
              <li key={c.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-1.5 py-1 text-[13px] hover:bg-[var(--color-primary-soft)]">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-[var(--color-primary)]"
                    checked={isVisible(c.id)}
                    onChange={() => onToggle(c.id)}
                  />
                  {c.label}
                </label>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
