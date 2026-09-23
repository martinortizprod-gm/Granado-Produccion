"use client";

import { useEffect, useMemo, useRef } from "react";
import { IconClose } from "@/components/ui/icons";
import { fechaVisible } from "@/lib/solicitudes/logic";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function hoyArgentina() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function diaJuliano(iso: string) {
  const [anio, mes, dia] = iso.slice(0, 10).split("-").map(Number);
  return Math.round((Date.UTC(anio, mes - 1, dia) - Date.UTC(anio, 0, 1)) / 86400000) + 1;
}

function diasDelAnio(anio: number) {
  const filas: { juliano: number; iso: string; dia: string }[] = [];
  for (let n = 1; n <= 366; n += 1) {
    const fecha = new Date(Date.UTC(anio, 0, n));
    if (fecha.getUTCFullYear() !== anio) break;
    const iso = fecha.toISOString().slice(0, 10);
    filas.push({ juliano: n, iso, dia: DIAS[fecha.getUTCDay()] });
  }
  return filas;
}

export function PanelDiasJulianos({ onCerrar }: { onCerrar: () => void }) {
  const hoy = useMemo(() => hoyArgentina(), []);
  const anio = Number(hoy.slice(0, 4));
  const actual = diaJuliano(hoy);
  const filas = useMemo(() => diasDelAnio(anio), [anio]);
  const listaRef = useRef<HTMLDivElement>(null);
  const filaHoy = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    const fila = filaHoy.current;
    const caja = listaRef.current;
    if (!fila || !caja) return;
    const filaTop = fila.getBoundingClientRect().top;
    const cajaTop = caja.getBoundingClientRect().top;
    caja.scrollTop += filaTop - cajaTop - caja.clientHeight / 2 + fila.clientHeight / 2;
  }, []);

  useEffect(() => {
    function onTecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") onCerrar();
    }
    window.addEventListener("keydown", onTecla);
    return () => window.removeEventListener("keydown", onTecla);
  }, [onCerrar]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4"
      onClick={onCerrar}
    >
      <div
        className="g-card my-4 flex max-h-[min(40rem,calc(100dvh-2rem))] w-full max-w-xl flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-juliano"
        onClick={(evento) => evento.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h2 id="titulo-juliano" className="g-section-title">
              Días julianos · {anio}
            </h2>
            <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">
              Hoy es el día juliano <strong>{actual}</strong>
              <span className="text-[var(--color-text-muted)]"> · {fechaVisible(hoy)}</span>
            </p>
          </div>
          <button type="button" className="g-btn g-btn-icon h-8 w-8" aria-label="Cerrar" onClick={onCerrar}>
            <IconClose className="h-4 w-4" />
          </button>
        </div>
        <div ref={listaRef} className="min-h-0 flex-1 overflow-auto border-t border-[var(--color-border)]">
          <table className="g-table">
            <thead>
              <tr>
                <th scope="col">Juliano</th>
                <th scope="col">Fecha</th>
                <th scope="col">Día</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => {
                const esHoy = fila.juliano === actual;
                return (
                  <tr
                    key={fila.juliano}
                    ref={esHoy ? filaHoy : undefined}
                    className={esHoy ? "g-row-active" : undefined}
                  >
                    <td className="font-semibold tabular-nums">
                      {String(fila.juliano).padStart(3, "0")}
                      {esHoy ? <span className="g-badge g-badge-success ml-2">Hoy</span> : null}
                    </td>
                    <td className="tabular-nums">{fechaVisible(fila.iso)}</td>
                    <td>{fila.dia}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
