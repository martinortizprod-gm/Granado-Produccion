"use client";

import { useMemo, useState } from "react";
import { ColumnPicker } from "@/components/ui/column-picker";
import { IconClose, IconFile } from "@/components/ui/icons";
import { ColDef, useColumnVisibility } from "@/components/ui/use-column-visibility";
import { descargarExcel } from "@/lib/informes/descarga";
import { descargarPlanPdf } from "@/lib/produccion/plan-pdf";
import {
  DatosProduccion,
  InformeStock,
  PlanDosificacion,
  DetalleJornada,
  informeStock,
  nroDec,
  planDosificacion,
} from "@/lib/produccion/logic";
import { SolicitudVista, fechaVisible, nroVisible } from "@/lib/solicitudes/logic";

const COLS_ORDEN: ColDef[] = [
  { id: "codigo", label: "Código" },
  { id: "producto", label: "Producto" },
  { id: "kg", label: "Kg pendientes" },
  { id: "oc", label: "O. compra" },
  { id: "version", label: "Versión" },
  { id: "lote", label: "Lote" },
];

export function PanelInformeStock({ datos, onCerrar }: { datos: DatosProduccion; onCerrar: () => void }) {
  const informe: InformeStock = useMemo(() => informeStock(datos), [datos]);
  const colsOrden = useColumnVisibility("produccion-informe-ordenes", COLS_ORDEN);
  const colsStockDef = useMemo<ColDef[]>(
    () => [
      { id: "grupo", label: "Grupo" },
      { id: "articulo", label: "Artículo" },
      ...informe.columnas.map((col) => ({ id: `oc-${col.id}`, label: col.titulo })),
      { id: "total", label: "Total" },
      { id: "stock", label: "Stock" },
      { id: "faltante", label: "Faltante" },
    ],
    [informe.columnas],
  );
  const colsStock = useColumnVisibility("produccion-informe-stock", colsStockDef);
  const r = informe.resumen;
  const visiblesStock = colsStockDef.filter((col) => colsStock.isVisible(col.id)).length;
  function guardar() {
    const encabezados = ["Grupo", "Artículo", "Unidad", ...informe.columnas.map((col) => col.titulo), "Total", "Stock", "Faltante", "Sobrante"];
    descargarExcel(
      "informe_stock",
      "Stock",
      encabezados,
      informe.filas.map((fila) => [fila.grupo, fila.etiqueta, fila.unidad, ...fila.cantidades, fila.total, fila.stock, fila.faltante, fila.sobrante]),
    );
  }
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4">
      <div className="g-card my-4 w-full max-w-6xl space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-[18px] font-bold tracking-wide">INFORME DE STOCK</h2>
            <p className="text-[12px] text-[var(--color-text-muted)]">{r.estado}</p>
          </div>
          <div className="flex gap-1">
            <button type="button" className="g-btn g-btn-secondary h-8" onClick={guardar}>
              Guardar
            </button>
            <button type="button" className="g-btn g-btn-icon h-8 w-8" aria-label="Cerrar" onClick={onCerrar}>
              <IconClose className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Kpi titulo="Órdenes" valor={String(r.ordenes)} />
          <Kpi titulo="Consumo total" valor={nroDec(r.consumoTotal)} />
          <Kpi titulo="Ítems con faltante" valor={String(r.itemsFaltante)} />
          <Kpi titulo="Estado" valor={r.estado} />
        </div>
        <div className="space-y-1">
          {r.alertas.map((alerta) => (
            <p key={alerta.texto} className={`text-[13px] ${alerta.tipo === "ok" ? "text-[var(--color-primary)]" : "text-[var(--color-warning)]"}`}>
              {alerta.texto}
            </p>
          ))}
        </div>
        {informe.ordenes.length > 0 && (
          <div>
            <div className="mb-1 flex justify-end">
              <ColumnPicker cols={colsOrden.cols} isVisible={colsOrden.isVisible} onToggle={colsOrden.toggle} />
            </div>
            <div className="overflow-x-auto">
              <table className="g-table min-w-full text-[12px]">
                <thead>
                  <tr>
                    {colsOrden.isVisible("codigo") && <th>Código</th>}
                    {colsOrden.isVisible("producto") && <th>Producto</th>}
                    {colsOrden.isVisible("kg") && <th>Kg pendientes</th>}
                    {colsOrden.isVisible("oc") && <th>O. compra</th>}
                    {colsOrden.isVisible("version") && <th>Versión</th>}
                    {colsOrden.isVisible("lote") && <th>Lote</th>}
                  </tr>
                </thead>
                <tbody>
                  {informe.ordenes.map((orden) => (
                    <tr key={`${orden.lote}-${orden.ordenCompra}`}>
                      {colsOrden.isVisible("codigo") && <td>{orden.codigo || "—"}</td>}
                      {colsOrden.isVisible("producto") && <td>{orden.producto || "—"}</td>}
                      {colsOrden.isVisible("kg") && <td className="tabular-nums">{nroDec(orden.cantidad)}</td>}
                      {colsOrden.isVisible("oc") && <td>{orden.ordenCompra || "—"}</td>}
                      {colsOrden.isVisible("version") && <td>{orden.version || "—"}</td>}
                      {colsOrden.isVisible("lote") && <td>{orden.lote || "—"}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div>
          <div className="mb-1 flex justify-end">
            <ColumnPicker cols={colsStock.cols} isVisible={colsStock.isVisible} onToggle={colsStock.toggle} />
          </div>
          <div className="overflow-x-auto">
            <table className="g-table min-w-full text-[12px]">
              <thead>
                <tr>
                  {colsStock.isVisible("grupo") && <th>Grupo</th>}
                  {colsStock.isVisible("articulo") && <th>Artículo</th>}
                  {informe.columnas.map((col) =>
                    colsStock.isVisible(`oc-${col.id}`) ? <th key={col.id}>{col.titulo}</th> : null,
                  )}
                  {colsStock.isVisible("total") && <th>Total</th>}
                  {colsStock.isVisible("stock") && <th>Stock</th>}
                  {colsStock.isVisible("faltante") && <th>Faltante</th>}
                </tr>
              </thead>
              <tbody>
                {informe.filas.length === 0 ? (
                  <tr>
                    <td colSpan={Math.max(1, visiblesStock)}>Sin consumo pendiente.</td>
                  </tr>
                ) : (
                  informe.filas.map((fila) => (
                    <tr key={`${fila.grupo}-${fila.etiqueta}`}>
                      {colsStock.isVisible("grupo") && <td>{fila.grupo}</td>}
                      {colsStock.isVisible("articulo") && <td>{fila.etiqueta}</td>}
                      {fila.cantidades.map((cantidad, indice) =>
                        colsStock.isVisible(`oc-${informe.columnas[indice]?.id}`) ? (
                          <td key={indice} className="tabular-nums">
                            {nroDec(cantidad)}
                          </td>
                        ) : null,
                      )}
                      {colsStock.isVisible("total") && <td className="tabular-nums">{nroDec(fila.total)}</td>}
                      {colsStock.isVisible("stock") && <td className="tabular-nums">{nroDec(fila.stock)}</td>}
                      {colsStock.isVisible("faltante") && <td className="tabular-nums">{nroDec(fila.faltante)}</td>}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="g-card border p-3" style={{ borderColor: "var(--color-border-strong)" }}>
      <p className="text-[11px] font-semibold tracking-wide text-[var(--color-text-muted)]">{titulo.toUpperCase()}</p>
      <p className="text-[16px] font-semibold">{valor}</p>
    </div>
  );
}

export function PanelPlan({
  datos,
  solicitud,
  formula,
  palletsInicial,
  onCerrar,
}: {
  datos: DatosProduccion;
  solicitud: SolicitudVista;
  formula: DatosProduccion["formulas"][string];
  palletsInicial: number;
  onCerrar: () => void;
}) {
  return (
    <PlanForm datos={datos} solicitud={solicitud} formula={formula} palletsInicial={palletsInicial} onCerrar={onCerrar} />
  );
}

function textoArt(codigo: string, nombre: string) {
  if (codigo && nombre) return `${codigo}  —  ${nombre}`;
  return codigo || nombre || "—";
}

function nroBatchs(valor: number) {
  if (Math.abs(valor - Math.round(valor)) < 0.05) return String(Math.round(valor));
  return nroDec(valor, 1);
}

function PlanForm({
  datos,
  solicitud,
  formula,
  palletsInicial,
  onCerrar,
}: {
  datos: DatosProduccion;
  solicitud: SolicitudVista;
  formula: DatosProduccion["formulas"][string];
  palletsInicial: number;
  onCerrar: () => void;
}) {
  const [pallets, setPallets] = useState(palletsInicial > 0 ? String(palletsInicial) : "");
  const [upp, setUpp] = useState(solicitud.unidades_por_pallets > 0 ? String(solicitud.unidades_por_pallets) : "");
  const [peso, setPeso] = useState(solicitud.peso_unitario > 0 ? String(solicitud.peso_unitario) : "");
  const [batchs, setBatchs] = useState("");
  const plan: PlanDosificacion = planDosificacion(
    formula ?? [],
    Number(String(pallets).replace(",", ".")) || 0,
    Number(String(upp).replace(",", ".")) || 0,
    Number(String(peso).replace(",", ".")) || 0,
    Number(String(batchs).replace(",", ".")) || 0,
  );
  const previo = solicitud.id != null ? datos.previos[String(solicitud.id)] : undefined;
  const operarios = (previo?.operarios ?? []).map(
    (id) => datos.usuarios.find((usuario) => usuario.id === id)?.etiqueta ?? `Usuario ${id}`,
  );
  const encargado =
    previo?.encargado != null
      ? datos.usuarios.find((usuario) => usuario.id === previo.encargado)?.etiqueta ?? `Usuario ${previo.encargado}`
      : "";
  const equipos = (previo?.limpieza ?? []).map(
    (id) => datos.equipos.find((equipo) => equipo.id === id)?.nombre ?? `Equipo ${id}`,
  );
  const barridos = (previo?.barridos ?? []).map((item) => {
    const ing = datos.ingredientes.find((op) => op.id === item.idIngrediente);
    return `${ing?.etiqueta ?? `Ingrediente ${item.idIngrediente}`}  ·  ${nroDec(item.pesaje)} kg`;
  });
  const campos = [
    ["Lote", solicitud.lote || "—"],
    ["Orden de compra", solicitud.orden_compra || "—"],
    ["Orden de producción", solicitud.orden_produccion || "—"],
    ["Estado", solicitud.estado_etiqueta || "—"],
    ["Fecha de registro", fechaVisible(solicitud.fecha_registro)],
    ["Fecha estimada de fin", fechaVisible(solicitud.fecha_estimada)],
    ["Código del producto", solicitud.codigo_producto || "—"],
    ["Nombre del producto", solicitud.producto || "—"],
    ["Versión asignada", solicitud.version || "—"],
    ["Receta del PLC", solicitud.receta_plc || "—"],
    ["Tipo de envase", textoArt(solicitud.codigo_envase, solicitud.envase)],
    ["Tipo de etiqueta", textoArt(solicitud.codigo_etiqueta, solicitud.nombre_etiqueta)],
    ["Pallets solicitados", nroDec(solicitud.pallets_solicitados)],
    ["Unidades solicitadas", nroDec(solicitud.unidades_solicitadas)],
    ["Kg solicitados", `${nroDec(solicitud.kg_solicitados)} kg`],
  ];
  const conBatch = plan.batchsPorPallet > 0 && plan.kgPorBatch > 0;
  const totPct = plan.lineas.reduce((s, linea) => s + linea.participacion, 0) * 100;
  const totBatch = plan.lineas.reduce((s, linea) => s + linea.kgPorBatch, 0);
  const totKg = plan.lineas.reduce((s, linea) => s + linea.kgTotales, 0);

  function guardar() {
    descargarPlanPdf({ solicitud, plan, operarios, encargado, equipos, barridos });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4">
      <div className="g-card my-4 w-full max-w-4xl space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-[16px] font-semibold">Plan de dosificación</h2>
            <p className="text-[12px] text-[var(--color-text-muted)]">
              {solicitud.lote}  —  {solicitud.producto}  —  {solicitud.orden_compra}
            </p>
          </div>
          <div className="flex gap-1">
            <button type="button" className="g-btn g-btn-icon h-8 w-8" title="Guardar PDF" aria-label="Guardar PDF" onClick={guardar}>
              <IconFile className="h-4 w-4" />
            </button>
            <button type="button" className="g-btn g-btn-icon h-8 w-8" title="Cerrar" aria-label="Cerrar" onClick={onCerrar}>
              <IconClose className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="g-card grid gap-3 p-3 sm:grid-cols-3">
          <label className="block text-[12px] text-[var(--color-text-muted)]">
            Pallets a elaborar
            <input className="g-input mt-1" value={pallets} onChange={(e) => setPallets(e.target.value)} />
          </label>
          <label className="block text-[12px] text-[var(--color-text-muted)]">
            Unidades por pallet
            <input className="g-input mt-1" value={upp} onChange={(e) => setUpp(e.target.value)} />
          </label>
          <label className="block text-[12px] text-[var(--color-text-muted)]">
            Peso unitario (kg)
            <input className="g-input mt-1" value={peso} onChange={(e) => setPeso(e.target.value)} />
          </label>
          <Calc etiqueta="Kg totales por pallets" valor={plan.kgPorPallet > 0 ? `${nroDec(plan.kgPorPallet)} kg` : "—"} />
          <label className="block text-[12px] text-[var(--color-text-muted)]">
            Batchs por pallet
            <input className="g-input mt-1" value={batchs} onChange={(e) => setBatchs(e.target.value)} />
          </label>
          <Calc etiqueta="Kg por batch" valor={conBatch ? `${nroDec(plan.kgPorBatch)} kg` : "—"} />
          <Calc etiqueta="Batchs a pesar" valor={conBatch ? nroBatchs(plan.batchsTotales) : "—"} />
          <Calc
            etiqueta="Kg totales a producir"
            className="sm:col-start-3"
            valor={plan.kgTotales > 0 ? `${nroDec(plan.kgTotales)} kg` : "—"}
          />
        </div>

        <div className="g-card p-3">
          <p className="mb-2 text-[13px] font-semibold">Ingredientes a dosificar</p>
          <table className="g-table w-full text-[12px]">
            <thead>
              <tr>
                <th>Ingrediente</th>
                <th>% participación</th>
                <th>Kg por batch</th>
                <th>Kg totales</th>
              </tr>
            </thead>
            <tbody>
              {plan.lineas.length === 0 ? (
                <tr>
                  <td colSpan={4}>La versión no tiene receta.</td>
                </tr>
              ) : (
                plan.lineas.map((linea) => (
                  <tr key={linea.etiqueta}>
                    <td>{linea.etiqueta}</td>
                    <td className="tabular-nums">{nroVisible(linea.participacion * 100, 2)} %</td>
                    <td className="tabular-nums">{conBatch ? nroDec(linea.kgPorBatch) : "—"}</td>
                    <td className="tabular-nums">{plan.kgTotales > 0 ? nroDec(linea.kgTotales) : "—"}</td>
                  </tr>
                ))
              )}
              {plan.lineas.length > 0 && (
                <tr className="g-row-total">
                  <td>Totales</td>
                  <td className="tabular-nums">{nroVisible(totPct, 2)} %</td>
                  <td className="tabular-nums">{conBatch ? nroDec(totBatch) : "—"}</td>
                  <td className="tabular-nums">{plan.kgTotales > 0 ? nroDec(totKg) : "—"}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="g-card p-3">
          <p className="mb-2 text-[13px] font-semibold">Solicitud de producción</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {campos.map(([etiqueta, valor]) => (
              <p key={etiqueta}>
                <span className="block text-[11px] text-[var(--color-text-muted)]">{etiqueta}</span>
                <span className="text-[13px]">{valor}</span>
              </p>
            ))}
          </div>
        </div>

        <div className="g-card p-3">
          <p className="mb-2 text-[13px] font-semibold">Datos previos de producción</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <BloquePrevio titulo="Operarios responsables" valores={operarios} />
            <BloquePrevio titulo="Encargado de producción" valores={encargado ? [encargado] : []} />
            <BloquePrevio titulo="Limpieza previa de equipos" valores={equipos} />
            <BloquePrevio titulo="Barrido de línea" valores={barridos} />
          </div>
        </div>

        <div className="flex justify-end">
          <button type="button" className="g-btn g-btn-secondary" onClick={onCerrar}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function Calc({ etiqueta, valor, className }: { etiqueta: string; valor: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[12px] text-[var(--color-text-muted)]">{etiqueta}</p>
      <p className="mt-1 rounded-[var(--radius-sm)] bg-[var(--color-primary-light)] px-2 py-2 text-[13px] font-medium text-[var(--color-primary)]">
        {valor}
      </p>
    </div>
  );
}

function BloquePrevio({ titulo, valores }: { titulo: string; valores: string[] }) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-3">
      <p className="mb-1 text-[12px] font-semibold">{titulo}</p>
      {valores.length === 0 ? (
        <p className="text-[12px] text-[var(--color-text-muted)]">Sin cargar</p>
      ) : (
        valores.map((valor) => (
          <p key={valor} className="text-[13px]">
            {valor}
          </p>
        ))
      )}
    </div>
  );
}

export function PanelDetalle({
  detalle,
  causas,
  onCerrar,
}: {
  detalle: DetalleJornada;
  causas: DatosProduccion["causas"];
  onCerrar: () => void;
}) {
  const causa = (id: number) => causas.find((item) => item.id === id)?.causa ?? `Causa ${id}`;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4">
      <div className="g-card my-4 w-full max-w-3xl space-y-3 p-4">
        <div className="flex items-start justify-between">
          <h2 className="text-[18px] font-bold">JORNADA {fechaVisible(detalle.fecha)}</h2>
          <button type="button" className="g-btn g-btn-icon h-8 w-8" aria-label="Cerrar" onClick={onCerrar}>
            <IconClose className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[13px] md:grid-cols-4">
          <p>Pallets: {nroVisible(detalle.pallets, 2)}</p>
          <p>Hs disponibles: {nroDec(detalle.hsDisponibles)}</p>
          <p>Pallet inicial: {detalle.palletInicial}</p>
          <p>Solicitud: {detalle.idSolicitud ?? "Sin producción"}</p>
        </div>
        <Paradas titulo="Paradas programadas" paradas={detalle.paradasProg} causa={causa} />
        <Paradas titulo="Paradas no programadas" paradas={detalle.paradasNo} causa={causa} />
        <div>
          <p className="mb-1 text-[13px] font-semibold">Consumos</p>
          {detalle.lotes.length === 0 ? (
            <p className="text-[13px] text-[var(--color-text-muted)]">Sin consumos de ingredientes.</p>
          ) : (
            <table className="g-table w-full text-[12px]">
              <thead>
                <tr>
                  <th>Ingrediente</th>
                  <th>Lote</th>
                  <th>Cantidad</th>
                  <th>Pallet inicio</th>
                  <th>Pallet fin</th>
                </tr>
              </thead>
              <tbody>
                {detalle.lotes.map((lote, indice) => (
                  <tr key={`${lote.idIngrediente}-${lote.lote}-${indice}`}>
                    <td>{lote.articulo}</td>
                    <td>{lote.lote || "—"}</td>
                    <td className="tabular-nums">{nroDec(lote.cantidad)}</td>
                    <td>{lote.palletInicio ?? "—"}</td>
                    <td>{lote.palletFin ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function Paradas({
  titulo,
  paradas,
  causa,
}: {
  titulo: string;
  paradas: DetalleJornada["paradasProg"];
  causa: (id: number) => string;
}) {
  return (
    <div>
      <p className="mb-1 text-[13px] font-semibold">{titulo}</p>
      {paradas.length === 0 ? (
        <p className="text-[13px] text-[var(--color-text-muted)]">Sin paradas.</p>
      ) : (
        <ul className="space-y-1 text-[13px]">
          {paradas.map((parada, indice) => (
            <li key={`${parada.idCausa}-${indice}`}>
              {causa(parada.idCausa)} · {nroDec(parada.tiempo)} hs
              {parada.descripcion ? ` · ${parada.descripcion}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
