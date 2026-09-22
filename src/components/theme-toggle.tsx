"use client";

import { useTema } from "@/components/tema-provider";

export function ThemeToggle() {
  const { tema, toggleTema } = useTema();

  return (
    <button
      type="button"
      onClick={toggleTema}
      className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]"
      title={tema === "claro" ? "Cambiar a tema oscuro" : "Cambiar a tema claro"}
    >
      {tema === "claro" ? "Oscuro" : "Claro"}
    </button>
  );
}
