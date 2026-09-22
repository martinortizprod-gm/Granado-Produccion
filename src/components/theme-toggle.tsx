"use client";

import { useTema } from "@/components/tema-provider";
import { IconMoon, IconSun } from "@/components/ui/icons";

export function ThemeToggle() {
  const { tema, toggleTema } = useTema();
  const aOscuro = tema === "claro";

  return (
    <button
      type="button"
      onClick={toggleTema}
      className="g-btn g-btn-icon"
      title={aOscuro ? "Cambiar a tema oscuro" : "Cambiar a tema claro"}
      aria-label={aOscuro ? "Cambiar a tema oscuro" : "Cambiar a tema claro"}
    >
      {aOscuro ? (
        <IconMoon className="h-[18px] w-[18px]" />
      ) : (
        <IconSun className="h-[18px] w-[18px]" />
      )}
    </button>
  );
}
