"use client";

import { useMemo, type ReactNode } from "react";
import {
  IconBolt,
  IconBox,
  IconFlask,
  IconWeight,
} from "@/components/ui/icons";
import { fechaVisible } from "@/lib/solicitudes/logic";
import { fmtKg } from "@/lib/analytics/logic";
import {
  CATALOGOS,
  type KindCatalogo,
} from "@/lib/catalogos/logic";
import {
  DIAS_VENCIMIENTO,
  FAMILIAS_STOCK,
  resumenStock,
  type DatosStockAnalytics,
  type FamiliaStock,
} from "@/lib/analytics/stock";
import { PanelPartes } from "@/app/analytics/analytics-charts";

type Props = {
  datos: DatosStockAnalytics;
  desde: string;
  hasta: string;
  categoria: string;
  producto: string;
  familia: FamiliaStock;
  onFamilia: (valor: FamiliaStock) => void;
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

export function AnalyticsStock({
  datos,
  desde,
  hasta,
  categoria,
  producto,
  familia,
  onFamilia,
}: Props) {
  const resumen = useMemo(
    () => resumenStock(datos, { desde, hasta, familia, categoria, producto }),
    [datos, desde, hasta, familia, categoria, producto],
  );
  const familiaKpi: KindCatalogo = familia === "Todas" ? "ingredientes" : familia;
  const unidad = CATALOGOS[familiaKpi].unidad;
  const etiquetaFam = familia === "Todas" ? "ingredientes" : CATALOGOS[familia].titulo.toLowerCase();

  return (
    <div className="g-stack">
      <div className="g-card px-3 py-2.5">
        <label>
          <span className="g-label">Familia</span>
          <select
            className="g-input max-w-xs"
            value={familia}
            onChange={(e) => onFamilia(e.target.value as FamiliaStock)}
          >
            {FAMILIAS_STOCK.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-[12px] text-[var(--color-text-muted)]">
          El stock y los vencimientos son el estado actual. Consumo, movimientos y barridos respetan el período
          {categoria !== "Todos" || producto !== "Todos" ? " y el recorte de producto/categoría" : ""}.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <Kpi
          tono="mint"
          icono={<IconWeight className="h-5 w-5" />}
          titulo={`Stock ${etiquetaFam}`}
          valor={fmtCant(resumen.stockTotal, unidad)}
          pie="Activos · calculado con ingresos, egresos y consumo"
        />
        <Kpi
          tono="sage"
          icono={<IconBox className="h-5 w-5" />}
          titulo="Stock bajo"
          valor={String(resumen.bajos)}
          pie={`Artículos activos bajo el mínimo (${CATALOGOS[familiaKpi].stockMinimo})`}
        />
        <Kpi
          tono="violet"
          icono={<IconBolt className="h-5 w-5" />}
          titulo="Lotes vencidos"
          valor={String(resumen.vencidos)}
          pie="Con saldo y fecha de vencimiento anterior a hoy"
        />
        <Kpi
          tono="blue"
          icono={<IconFlask className="h-5 w-5" />}
          titulo="Vencen en 30 días"
          valor={String(resumen.proximos)}
          pie={`Hasta ${DIAS_VENCIMIENTO} días`}
        />
        <Kpi
          tono="mint"
          icono={<IconWeight className="h-5 w-5" />}
          titulo="Consumo del período"
          valor={fmtCant(resumen.consumo, unidad)}
          pie={`Ingresos ${fmtCant(resumen.ingresos, unidad)} · Egresos ${fmtCant(resumen.egresos, unidad)}`}
        />
        <Kpi
          tono="sage"
          icono={<IconBolt className="h-5 w-5" />}
          titulo="Barridos de línea"
          valor={fmtKg(resumen.barridosKg)}
          pie="Merma registrada en el período"
        />
      </div>

      <div className="grid gap-2 lg:grid-cols-2">
        <PanelPartes
          titulo={familia === "Todas" ? "Movimientos de ingredientes" : `Movimientos · ${CATALOGOS[familia].titulo}`}
          partes={resumen.porFamiliaMov}
          unidad={unidad === "kg" ? "kg" : "un"}
        />
        <PanelPartes
          titulo={`Consumo · ${CATALOGOS[familiaKpi].titulo}`}
          partes={resumen.topConsumo}
          unidad={unidad === "kg" ? "kg" : "un"}
        />
      </div>
      {resumen.topBarridos.length > 0 ? (
        <PanelPartes titulo="Barridos por ingrediente" partes={resumen.topBarridos} unidad="kg" />
      ) : null}

      <Tabla
        titulo="Lotes vencidos y próximos"
        vacio="No hay lotes vencidos ni por vencer con saldo."
        columnas={["Estado", "Familia", "Artículo", "Lote", "Stock", "Vence"]}
        filas={resumen.detalleVencimientos.map((item) => [
          item.estado === "vencido" ? "Vencido" : "Próximo",
          FAMILIAS_STOCK.find((f) => f.id === item.familia)?.label ?? item.familia,
          item.articulo,
          item.lote,
          fmtCant(item.stock, CATALOGOS[item.familia].unidad),
          fechaVisible(item.vencimiento),
        ])}
        marcas={resumen.detalleVencimientos.map((item) => item.estado)}
      />

      <Tabla
        titulo="Consumo del período"
        vacio="No hay consumos en el período con estos filtros."
        columnas={["Fecha", "Artículo", "Lote", "Cantidad", "Producto", "Lote prod."]}
        filas={resumen.detalleConsumo.slice(0, 80).map((item) => [
          fechaVisible(item.fecha),
          item.articulo,
          item.lote || "—",
          fmtCant(item.cantidad, CATALOGOS[item.familia].unidad),
          item.producto,
          item.loteProducto || "—",
        ])}
        pie={
          resumen.detalleConsumo.length > 80
            ? `Mostrando 80 de ${resumen.detalleConsumo.length} registros.`
            : undefined
        }
      />

      <Tabla
        titulo="Barridos de línea"
        vacio="No hay barridos en el período con estos filtros."
        columnas={["Ingrediente", "Kg", "Producto", "Lote", "Solicitud"]}
        filas={resumen.detalleBarridos.map((item) => [
          item.ingrediente,
          fmtKg(item.kg),
          item.producto,
          item.loteProducto || "—",
          item.idSolicitud != null ? String(item.idSolicitud) : "—",
        ])}
      />
    </div>
  );
}

function Kpi({
  tono,
  icono,
  titulo,
  valor,
  pie,
}: {
  tono: "mint" | "blue" | "violet" | "sage";
  icono: ReactNode;
  titulo: string;
  valor: string;
  pie: string;
}) {
  return (
    <div className={`g-kpi g-kpi-rich g-kpi-${tono}`}>
      <span className="g-kpi-badge text-[var(--color-primary)]">{icono}</span>
      <span className="min-w-0 flex-1">
        <p className="g-kpi-title">{titulo}</p>
        <p className="g-kpi-value">{valor}</p>
        <p className="text-[12px] text-[var(--color-text-muted)]">{pie}</p>
      </span>
    </div>
  );
}

function Tabla({
  titulo,
  vacio,
  columnas,
  filas,
  marcas,
  pie,
}: {
  titulo: string;
  vacio: string;
  columnas: string[];
  filas: string[][];
  marcas?: string[];
  pie?: string;
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
                <td colSpan={columnas.length} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                  {vacio}
                </td>
              </tr>
            ) : (
              filas.map((fila, i) => (
                <tr key={`${titulo}-${i}`}>
                  {fila.map((celda, j) => (
                    <td
                      key={j}
                      className={j >= fila.length - 3 ? "tabular-nums whitespace-nowrap" : undefined}
                    >
                      {marcas && j === 0 ? (
                        <span
                          className={
                            marcas[i] === "vencido" ? "g-badge g-badge-danger" : "g-badge g-badge-warning"
                          }
                        >
                          {celda}
                        </span>
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
      {pie ? <p className="px-3 py-2 text-[12px] text-[var(--color-text-muted)]">{pie}</p> : null}
    </div>
  );
}
