"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

export type ColDef = {
  id: string;
  label: string;
  locked?: boolean;
};

const listeners = new Map<string, Set<() => void>>();

function emitir(key: string) {
  listeners.get(key)?.forEach((fn) => fn());
}

function suscribir(key: string) {
  return (fn: () => void) => {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key)!.add(fn);
    return () => listeners.get(key)!.delete(fn);
  };
}

export function useColumnVisibility(tableId: string, cols: ColDef[]) {
  const key = `granado-cols:${tableId}`;

  const raw = useSyncExternalStore(
    suscribir(key),
    () => window.localStorage.getItem(key) ?? "",
    () => "",
  );

  const hidden = useMemo(() => {
    if (!raw) return new Set<string>();
    try {
      const arr = JSON.parse(raw) as unknown;
      if (!Array.isArray(arr)) return new Set<string>();
      return new Set(arr.filter((x): x is string => typeof x === "string"));
    } catch {
      return new Set<string>();
    }
  }, [raw]);

  const isVisible = useCallback(
    (id: string) => {
      const col = cols.find((c) => c.id === id);
      if (col?.locked) return true;
      return !hidden.has(id);
    },
    [cols, hidden],
  );

  const toggle = useCallback(
    (id: string) => {
      const col = cols.find((c) => c.id === id);
      if (!col || col.locked) return;
      const next = new Set(hidden);
      if (next.has(id)) {
        next.delete(id);
      } else {
        const visibles = cols.filter((c) => !c.locked && !next.has(c.id));
        if (visibles.length <= 1) return;
        next.add(id);
      }
      window.localStorage.setItem(key, JSON.stringify([...next]));
      emitir(key);
    },
    [cols, hidden, key],
  );

  const visibleCount = cols.filter((c) => isVisible(c.id)).length;

  return { cols, isVisible, toggle, visibleCount };
}
