"use client";

import { ReactNode } from "react";
import { IconClose, IconDownload } from "@/components/ui/icons";
import { descargarExcel } from "@/lib/informes/descarga";
import { ConfigMovimiento, MovimientoVista, resumenGrafico } from "@/lib/movimientos/logic";

const COLORES = ["#175cd3", "#c47a12", "#0a4429", "#3d7a56", "#3d6b8a", "#b85c5c"];
const COLOR_TIPO: Record<string, string> = { Ingreso: "#0a4429", Egreso: "#175cd3" };

function nro(valor: number) {
  const n = Number(valor) || 0;
  if (Math.abs(n - Math.round(n)) < 0.05) return Math.round(n).toLocaleString("es-AR");
  return n.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function pct(valor: number) {
  return `${valor.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export function ResumenMovimientos({
  cfg,
  movimientos,
  onCerrar,
}: {
  cfg: ConfigMovimiento;
  movimientos: MovimientoVista[];
  onCerrar: () => void;
}) {
  const resumen = resumenGrafico(cfg, movimientos);
  const maxMes = Math.max(1, ...resumen.porMes.map((item) => item.cantidad));

  function guardar() {
    descargarExcel(
      `resumen_movimientos_${cfg.kind}`,
      "Resumen",
      ["Concepto", "Cantidad", "Porcentaje", "Registros"],
      [
        ...resumen.porTipo.map((item) => [item.nombre, item.cantidad, item.porcentaje, item.registros]),
        ...resumen.porCategoria.map((item) => [item.nombre, item.cantidad, item.porcentaje, ""]),
        ...resumen.porMes.map((item) => [item.nombre, item.cantidad, item.porcentaje, ""]),
        [],
        ["Artículo", "Ingresos", "Egresos", "Neto", "Registros"],
        ...resumen.detalle.map((item) => [item.nombre, item.ingresos, item.egresos, item.neto, item.registros]),
      ],
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4">
      <div className="g-card my-4 w-full max-w-5xl space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-[18px] font-bold tracking-wide">
            RESUMEN {cfg.titulo.toUpperCase()} ({resumen.periodo})
          </h2>
          <div className="flex gap-1">
            <button type="button" className="g-btn g-btn-icon h-8 w-8" title="Guardar Excel" aria-label="Guardar Excel" onClick={guardar}>
              <IconDownload className="h-4 w-4" />
            </button>
            <button type="button" className="g-btn g-btn-icon h-8 w-8" title="Cerrar" aria-label="Cerrar" onClick={onCerrar}>
              <IconClose className="h-4 w-4" />
            </button>
          </div>
        </div>
        {resumen.totalRegistros <= 0 ? (
          <p className="text-[13px] text-[var(--color-text-muted)]">No hay movimientos con los filtros seleccionados.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
              <Tarjeta titulo="Balance">
                <p className="text-[12px] text-[var(--color-text-muted)]">Neto ({resumen.unidad})</p>
                <p className="text-[28px] leading-none font-semibold text-[var(--color-primary)]">{nro(resumen.totalNeto)}</p>
                <p className="text-[12px] text-[var(--color-text-muted)]">{resumen.totalRegistros} registros</p>
              </Tarjeta>
              <Tarjeta titulo="Por tipo">
                {resumen.porTipo.map((item) => (
                  <Linea key={item.nombre} color={COLOR_TIPO[item.nombre]} nombre={item.nombre} detalle={`${nro(item.cantidad)} (${pct(item.porcentaje)})`} />
                ))}
              </Tarjeta>
              <Tarjeta titulo="Por categoría">
                {resumen.porCategoria.map((item, i) => (
                  <Linea key={item.nombre} color={COLORES[i % COLORES.length]} nombre={item.nombre} detalle={`${nro(item.cantidad)} (${pct(item.porcentaje)})`} />
                ))}
              </Tarjeta>
              <Tarjeta titulo="Por mes">
                {resumen.porMes.map((item, i) => (
                  <Linea key={item.nombre} color={COLORES[i % COLORES.length]} nombre={item.nombre} detalle={`${nro(item.cantidad)} (${pct(item.porcentaje)})`} />
                ))}
              </Tarjeta>
            </div>
            <div className="grid gap-2 lg:grid-cols-3">
              <div className="g-card p-3">
                <p className="mb-2 text-[12px] font-semibold tracking-wide">{resumen.unidad.toUpperCase()} POR MES</p>
                <div className="flex h-40 items-end gap-3">
                  {resumen.porMes.map((item, i) => (
                    <div key={item.nombre} className="flex h-full flex-1 flex-col justify-end">
                      <span className="mb-1 text-center text-[11px] tabular-nums">{nro(item.cantidad)}</span>
                      <div
                        className="w-full rounded-t"
                        style={{ height: `${Math.max(4, (item.cantidad / maxMes) * 100)}%`, background: COLORES[i % COLORES.length] }}
                      />
                      <span className="mt-1 text-center text-[11px]">{item.nombre}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Rosca titulo="Distribución por tipo" partes={resumen.porTipo} unidad={resumen.unidad} colores={resumen.porTipo.map((item) => COLOR_TIPO[item.nombre])} />
              <Rosca titulo="Distribución por categoría" partes={resumen.porCategoria} unidad={resumen.unidad} colores={COLORES} />
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              Período: {resumen.periodo} · Unidad: {resumen.unidad}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Tarjeta({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="g-card space-y-1 p-3">
      <p className="text-[11px] font-semibold tracking-wide text-[var(--color-text-muted)]">{titulo.toUpperCase()}</p>
      {children}
    </div>
  );
}

function Linea({ color, nombre, detalle }: { color: string; nombre: string; detalle: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[13px]">
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
        {nombre}
      </span>
      <span className="tabular-nums">{detalle}</span>
    </div>
  );
}

function Rosca({
  titulo,
  partes,
  unidad,
  colores,
}: {
  titulo: string;
  partes: { nombre: string; cantidad: number; porcentaje: number }[];
  unidad: string;
  colores: string[];
}) {
  const r = 36;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="g-card p-3">
      <p className="mb-2 text-[12px] font-semibold tracking-wide">{titulo.toUpperCase()}</p>
      <div className="flex items-center gap-3">
        <svg viewBox="0 0 100 100" className="h-28 w-28 shrink-0">
          <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-border)" strokeWidth="14" />
          {partes.map((parte, i) => {
            const largo = (parte.porcentaje / 100) * c;
            const el = (
              <circle
                key={parte.nombre}
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke={colores[i % colores.length]}
                strokeWidth="14"
                strokeDasharray={`${largo} ${c - largo}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 50 50)"
              />
            );
            offset += largo;
            return el;
          })}
        </svg>
        <div className="space-y-1 text-[12px]">
          {partes.map((parte, i) => (
            <p key={parte.nombre}>
              <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: colores[i % colores.length] }} />
              {parte.nombre} {nro(parte.cantidad)} {unidad}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
