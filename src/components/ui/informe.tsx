"use client";

import { FormEvent, ReactNode, useState } from "react";
import { IconClose, IconDownload, IconFile } from "@/components/ui/icons";
import { descargarExcel, descargarPdf } from "@/lib/informes/descarga";

export function BotonInforme({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="g-btn g-btn-icon h-9 w-9"
      title={title}
      aria-label={title}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function DialogoInforme({
  titulo,
  nombreInicial,
  hoja,
  encabezados,
  filas,
  filasPdf,
  onCerrar,
}: {
  titulo: string;
  nombreInicial: string;
  hoja: string;
  encabezados: string[];
  filas: (string | number | null)[][];
  filasPdf?: (string | number | null)[][];
  onCerrar: () => void;
}) {
  const [nombre, setNombre] = useState(nombreInicial);

  function exportar(e: FormEvent | null, formato: "excel" | "pdf") {
    e?.preventDefault();
    const elegido = nombre.trim() || nombreInicial;
    if (formato === "excel") descargarExcel(elegido, hoja, encabezados, filas);
    else descargarPdf(elegido, titulo, encabezados, filasPdf ?? filas);
    onCerrar();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <form className="g-card w-full max-w-md space-y-3 p-4" onSubmit={(e) => exportar(e, "excel")}>
        <div className="flex items-start justify-between gap-2">
          <p className="g-section-title">{titulo}</p>
          <button type="button" className="g-btn g-btn-icon h-7 w-7" aria-label="Cerrar" onClick={onCerrar}>
            <IconClose className="h-4 w-4" />
          </button>
        </div>
        <label className="block">
          <span className="g-label">Nombre del archivo</span>
          <input className="g-input" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" className="g-btn g-btn-secondary" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className="g-btn g-btn-primary">
            <IconDownload className="h-4 w-4" />
            Excel
          </button>
          <button type="button" className="g-btn g-btn-primary" onClick={() => exportar(null, "pdf")}>
            <IconFile className="h-4 w-4" />
            PDF
          </button>
        </div>
      </form>
    </div>
  );
}
