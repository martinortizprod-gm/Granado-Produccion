"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { IconDownload, IconSearch } from "@/components/ui/icons";
import { DialogoInforme } from "@/components/ui/informe";
import { fechaVisible } from "@/lib/solicitudes/logic";
import { fmtHs, fmtKg, type JornadaAnalytics } from "@/lib/analytics/logic";
import { CATALOGOS } from "@/lib/catalogos/logic";
import type { DatosStockAnalytics } from "@/lib/analytics/stock";
import { buscarTrazabilidad } from "@/lib/analytics/trazabilidad";
import { armarInformeTrazabilidad } from "@/lib/analytics/exportar";

type Props = {
  jornadas: JornadaAnalytics[];
  stock: DatosStockAnalytics;
};

function fmtCant(valor: number, unidad: string) {
  if (unidad === "kg") return fmtKg(valor);
  const n = Number(valor) || 0;
  const txt =
    Math.abs(n - Math.round(n)) < 0.05
      ? Math.round(n).toLocaleString("es-AR")
      : n.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `${txt} ${unidad}`;
}

export function AnalyticsTrazabilidad({ jornadas, stock }: Props) {
  const [consulta, setConsulta] = useState("");
  const [exportar, setExportar] = useState(false);
  const hallazgos = useMemo(
    () => buscarTrazabilidad(consulta, jornadas, stock),
    [consulta, jornadas, stock],
  );
  const informe = hallazgos.length ? armarInformeTrazabilidad(consulta, hallazgos) : null;
  const lista = consulta.trim().length < 2 ? [] : hallazgos;

  return (
    <div className="g-stack">
      <div className="g-card px-3 py-2.5">
        <label>
          <span className="g-label">Lote, OP o solicitud</span>
          <div className="relative max-w-xl">
            <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              className="g-input pl-8"
              value={consulta}
              onChange={(e) => setConsulta(e.target.value)}
              placeholder="Ej. lote de ingrediente, lote de producto u OP"
            />
          </div>
        </label>
        <p className="mt-2 text-[12px] text-[var(--color-text-muted)]">
          Sigue el lote de materia prima hasta el producto, o al revés. El consumo se ata a la
          solicitud y la fecha; si hubo más de una jornada el mismo día no se puede separar.
        </p>
      </div>

      {consulta.trim().length < 2 ? (
        <p className="text-[13px] text-[var(--color-text-muted)]">
          Escribí al menos 2 caracteres para buscar.
        </p>
      ) : lista.length === 0 ? (
        <p className="text-[13px] text-[var(--color-text-muted)]">
          No hay coincidencias para esa búsqueda.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] text-[var(--color-text-muted)]">
              {lista.length} coincidencia{lista.length === 1 ? "" : "s"}
            </p>
            {informe ? (
              <button
                type="button"
                className="g-btn g-btn-secondary g-btn-sm"
                onClick={() => setExportar(true)}
              >
                <IconDownload className="h-4 w-4" />
                Exportar cadena
              </button>
            ) : null}
          </div>

          {lista.map((item) => (
            <div key={item.clave} className="g-card space-y-3 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="g-section-title">{item.titulo}</p>
                  <p className="text-[13px] text-[var(--color-text-muted)]">
                    Lote {item.lote}
                    {item.detalle ? ` · ${item.detalle}` : ""}
                  </p>
                </div>
                <span className={`g-badge ${item.tipo === "producto" ? "g-badge-info" : "g-badge-neutral"}`}>
                  {item.tipo === "producto" ? "Producto" : "Materia prima"}
                </span>
              </div>

              {item.movimientos.length > 0 ? (
                <Tabla
                  titulo="Movimientos del lote"
                  columnas={["Fecha", "Tipo", "Artículo", "Cantidad"]}
                  filas={item.movimientos.map((mov) => [
                    fechaVisible(mov.fecha),
                    mov.tipo === "ingreso" ? "Ingreso" : "Egreso",
                    mov.articulo,
                    fmtCant(mov.cantidad, CATALOGOS[mov.familia].unidad),
                  ])}
                />
              ) : null}

              <Tabla
                titulo="Consumo"
                vacio="No hay consumo atado a este lote."
                columnas={["Fecha", "Artículo", "Cantidad", "Producto", "Lote prod.", "Solicitud"]}
                filas={item.consumos.map((cons) => [
                  fechaVisible(cons.fecha),
                  cons.articulo,
                  fmtCant(cons.cantidad, CATALOGOS[cons.familia].unidad),
                  cons.producto,
                  cons.loteProducto || "—",
                  cons.idSolicitud != null ? String(cons.idSolicitud) : "—",
                ])}
                enlaces={item.consumos.map((cons) =>
                  cons.idSolicitud != null ? `/solicitudes/${cons.idSolicitud}/editar` : null,
                )}
              />

              <Tabla
                titulo="Jornadas"
                vacio="No hay jornadas de esa solicitud."
                columnas={["Fecha", "Producto", "Kg", "Hs prod.", "Lote", "OP"]}
                filas={item.jornadas.map((jornada) => [
                  fechaVisible(jornada.fecha),
                  jornada.producto,
                  fmtKg(jornada.kg),
                  fmtHs(jornada.hsProductivas),
                  jornada.lote || "—",
                  jornada.ordenProduccion || "—",
                ])}
              />

              {item.barridos.length > 0 ? (
                <Tabla
                  titulo="Barridos"
                  columnas={["Ingrediente", "Kg", "Producto", "Lote"]}
                  filas={item.barridos.map((barrido) => [
                    barrido.ingrediente,
                    fmtKg(barrido.kg),
                    barrido.producto,
                    barrido.loteProducto || "—",
                  ])}
                />
              ) : null}

              {item.jornadas[0] ? (
                <Link href="/produccion" className="g-btn g-btn-secondary g-btn-sm">
                  Ir a Producción
                </Link>
              ) : null}
            </div>
          ))}
        </>
      )}

      {exportar && informe ? (
        <DialogoInforme
          titulo={informe.titulo}
          nombreInicial={informe.nombreInicial}
          hoja={informe.hoja}
          encabezados={informe.encabezados}
          filas={informe.filas}
          filasPdf={informe.filasPdf}
          onCerrar={() => setExportar(false)}
        />
      ) : null}
    </div>
  );
}

function Tabla({
  titulo,
  vacio,
  columnas,
  filas,
  enlaces,
}: {
  titulo: string;
  vacio?: string;
  columnas: string[];
  filas: string[][];
  enlaces?: (string | null)[];
}) {
  return (
    <div className="g-table-wrap min-w-0">
      <div className="g-table-toolbar">
        <p className="g-section-title">{titulo}</p>
      </div>
      <div className="g-table-scroll g-table-scroll-ops">
        <table className="g-table">
          <thead>
            <tr>
              {columnas.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr>
                <td colSpan={columnas.length} className="px-4 py-6 text-center text-[var(--color-text-muted)]">
                  {vacio ?? "Sin datos."}
                </td>
              </tr>
            ) : (
              filas.map((fila, i) => (
                <tr key={`${titulo}-${i}`}>
                  {fila.map((celda, j) => (
                    <td key={j} className={j >= fila.length - 3 ? "tabular-nums whitespace-nowrap" : undefined}>
                      {enlaces?.[i] && j === fila.length - 1 ? (
                        <Link href={enlaces[i]!} className="text-[var(--color-primary)] hover:underline">
                          {celda}
                        </Link>
                      ) : (
                        <span className="g-truncate block max-w-[16rem]" title={celda}>
                          {celda}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
