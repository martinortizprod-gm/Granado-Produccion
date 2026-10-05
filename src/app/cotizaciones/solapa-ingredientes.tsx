"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconPlus, IconSearch } from "@/components/ui/icons";
import { ColumnPicker } from "@/components/ui/column-picker";
import {
  RecordDetailDrawer,
  RowDeleteButton,
  RowDetailButton,
} from "@/components/ui/record-detail";
import { useColumnVisibility } from "@/components/ui/use-column-visibility";
import { eliminarUltimaListaMp, guardarListaMp } from "@/app/cotizaciones/actions";
import { Kpi, Variacion, fechaHoraVisible } from "@/app/cotizaciones/piezas";
import {
  ItemMpForm,
  ListaMp,
  etiquetaOpcion,
  formMpDesde,
  itemsActualesMp,
  textoDinero,
  textoVariacion,
} from "@/lib/cotizaciones/logic";
import { clave } from "@/lib/solicitudes/logic";
import type { OpcionIngrediente } from "@/lib/recetas/logic";

const COLS_ACTUAL = [
  { id: "codigo", label: "Código" },
  { id: "nombre", label: "Ingrediente" },
  { id: "costo", label: "$/Tn" },
  { id: "var", label: "Vs. anterior" },
  { id: "acciones", label: "Acciones", locked: true },
];

const COLS_REG = [
  { id: "fecha", label: "Fecha" },
  { id: "usuario", label: "Usuario" },
  { id: "items", label: "Con costo" },
  { id: "cambios", label: "Cambios" },
  { id: "acciones", label: "Acciones", locked: true },
];

export function SolapaIngredientes({
  ingredientes,
  listas,
  errorCarga,
  puedeEditar,
}: {
  ingredientes: OpcionIngrediente[];
  listas: ListaMp[];
  errorCarga: string | null;
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busqueda, setBusqueda] = useState("");
  const [form, setForm] = useState<ItemMpForm[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [detalleActual, setDetalleActual] = useState<number | null>(null);
  const [detalleLista, setDetalleLista] = useState<number | null>(null);

  const vigente = listas.find((l) => l.vigente);
  const actuales = useMemo(() => itemsActualesMp(vigente), [vigente]);
  const q = clave(busqueda);
  const filtrados = useMemo(
    () =>
      actuales.filter((i) => !q || clave(i.codigo).includes(q) || clave(i.nombre).includes(q)),
    [actuales, q],
  );
  const cols = useColumnVisibility("cotiz-mp-actual", COLS_ACTUAL);
  const colsReg = useColumnVisibility("cotiz-mp-reg", COLS_REG);
  const porId = useMemo(() => new Map(ingredientes.map((i) => [i.id, i])), [ingredientes]);
  const itemDetalle = filtrados.find((i) => i.id === detalleActual) ?? actuales.find((i) => i.id === detalleActual);
  const listaDetalle = listas.find((l) => l.id === detalleLista) ?? null;

  function abrirNueva() {
    setForm(formMpDesde(ingredientes, vigente));
    setError(null);
    setAviso(null);
  }

  function setCosto(idIngrediente: string, valor: string) {
    if (!form) return;
    setForm(form.map((i) => (i.id_ingrediente === idIngrediente ? { ...i, costo_por_tn: valor } : i)));
  }

  function onGuardar(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    setAviso(null);
    startTransition(async () => {
      try {
        await guardarListaMp(form);
        setAviso("Cotización de ingredientes registrada.");
        setForm(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar");
      }
    });
  }

  function onEliminarVigente() {
    if (!vigente) return;
    if (!confirm("¿Borrar la cotización vigente de ingredientes? Queda como vigente la anterior.")) {
      return;
    }
    setError(null);
    setAviso(null);
    startTransition(async () => {
      try {
        await eliminarUltimaListaMp();
        setAviso("Cotización vigente de ingredientes borrada.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo borrar");
      }
    });
  }

  return (
    <div className="g-stack">
      {errorCarga ? <p className="g-alert g-alert-warning">{errorCarga}</p> : null}
      {error ? <p className="g-alert g-alert-danger">{error}</p> : null}
      {aviso ? <p className="g-alert g-alert-success">{aviso}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="g-section-title">Cotización actual</p>
          <p className="text-[12px] text-[var(--color-text-muted)]">
            {vigente
              ? `Vigente desde ${fechaHoraVisible(vigente.fecha_hora_registro)} · ${vigente.usuario}`
              : "Todavía no hay una lista de costos de ingredientes."}
          </p>
        </div>
        {puedeEditar ? (
          <div className="flex flex-wrap gap-2">
            {vigente ? (
              <button type="button" className="g-btn g-btn-secondary" disabled={pending} onClick={onEliminarVigente}>
                Borrar vigente
              </button>
            ) : null}
            <button type="button" className="g-btn g-btn-primary" disabled={pending || !!errorCarga} onClick={abrirNueva}>
              <IconPlus className="h-4 w-4" />
              Nueva cotización
            </button>
          </div>
        ) : null}
      </div>

      <div className="g-kpis grid grid-cols-2 gap-2 md:grid-cols-3">
        <Kpi titulo="Con costo" valor={String(actuales.length)} pie="Ingredientes con $/Tn mayor a 0" />
        <Kpi
          titulo="Listas"
          valor={String(listas.length)}
          pie={vigente ? fechaHoraVisible(vigente.fecha_hora_registro) : "Sin registros"}
        />
        <Kpi
          titulo="Cambios"
          valor={vigente ? String(vigente.cambios) : "—"}
          pie="Ítems distintos a la lista anterior"
        />
      </div>

      {form ? (
        <form className="g-card space-y-3 p-3" onSubmit={onGuardar}>
          <p className="g-section-title">Nueva cotización de ingredientes</p>
          <p className="text-[12px] text-[var(--color-text-muted)]">
            Se copian los costos vigentes. Lo que dejes en blanco queda en $ 0,00. La lista anterior no se modifica.
          </p>
          <div className="g-table-wrap">
            <div className="g-table-scroll max-h-[360px]">
              <table className="g-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Ingrediente</th>
                    <th>$/Tn</th>
                  </tr>
                </thead>
                <tbody>
                  {form.map((item) => {
                    const ing = porId.get(Number(item.id_ingrediente));
                    return (
                      <tr key={item.id_ingrediente}>
                        <td className="tabular-nums">{ing?.codigo || "—"}</td>
                        <td>{ing ? etiquetaOpcion(ing.codigo, ing.nombre) : item.id_ingrediente}</td>
                        <td>
                          <input
                            className="g-input w-[140px]"
                            inputMode="decimal"
                            value={item.costo_por_tn}
                            onChange={(e) => setCosto(item.id_ingrediente, e.target.value)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {!form.length ? (
            <p className="text-[13px] text-[var(--color-text-muted)]">No hay ingredientes activos.</p>
          ) : null}
          <div className="flex justify-end gap-2">
            <button type="button" className="g-btn g-btn-secondary" onClick={() => setForm(null)}>
              Cancelar
            </button>
            <button type="submit" className="g-btn g-btn-primary" disabled={pending}>
              Aceptar
            </button>
          </div>
        </form>
      ) : null}

      <div className="relative">
      <div className="g-table-wrap">
        <div className="g-table-toolbar">
          <div className="g-filters">
            <label className="relative block min-w-[180px] flex-1">
              <IconSearch className="pointer-events-none absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                className="g-input pl-8"
                placeholder="Buscar ingrediente"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </label>
          </div>
          <ColumnPicker cols={cols.cols} isVisible={cols.isVisible} onToggle={cols.toggle} />
        </div>
        <div className="g-table-scroll">
          <table className="g-table">
            <thead>
              <tr>
                {cols.isVisible("codigo") ? <th>Código</th> : null}
                {cols.isVisible("nombre") ? <th>Ingrediente</th> : null}
                {cols.isVisible("costo") ? <th>$/Tn</th> : null}
                {cols.isVisible("var") ? <th>Vs. anterior</th> : null}
                {cols.isVisible("acciones") ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {filtrados.length ? (
                filtrados.map((item) => (
                  <tr
                    key={item.id}
                    className={detalleActual === item.id ? "g-row-active" : undefined}
                    onClick={() => setDetalleActual(item.id)}
                  >
                    {cols.isVisible("codigo") ? <td className="tabular-nums">{item.codigo || "—"}</td> : null}
                    {cols.isVisible("nombre") ? <td>{item.nombre || "—"}</td> : null}
                    {cols.isVisible("costo") ? (
                      <td className="tabular-nums">{textoDinero(item.costo_por_tn)}</td>
                    ) : null}
                    {cols.isVisible("var") ? (
                      <td>
                        <Variacion pct={item.variacion_pct} />
                      </td>
                    ) : null}
                    {cols.isVisible("acciones") ? (
                      <td>
                        <RowDetailButton onClick={() => setDetalleActual(item.id)} />
                      </td>
                    ) : null}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-[var(--color-text-muted)]">
                    {vigente ? "Ningún ingrediente con costo mayor a $ 0,00." : "Sin cotización vigente."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
        {itemDetalle ? (
          <RecordDetailDrawer
            heading="Ingrediente"
            title={itemDetalle.nombre || itemDetalle.codigo || "Ingrediente"}
            onClose={() => setDetalleActual(null)}
          >
            <dl className="space-y-1 text-[13px]">
              <Fila label="Código" valor={itemDetalle.codigo || "—"} />
              <Fila label="$/Tn" valor={textoDinero(itemDetalle.costo_por_tn)} />
              <Fila label="Vs. anterior" valor={textoVariacion(itemDetalle.variacion_pct)} />
            </dl>
          </RecordDetailDrawer>
        ) : null}
      </div>

      <p className="g-section-title">Registros</p>
      <div className="relative">
      <div className="g-table-wrap">
        <div className="g-table-toolbar">
          <ColumnPicker cols={colsReg.cols} isVisible={colsReg.isVisible} onToggle={colsReg.toggle} />
        </div>
        <div className="g-table-scroll">
          <table className="g-table">
            <thead>
              <tr>
                {colsReg.isVisible("fecha") ? <th>Fecha</th> : null}
                {colsReg.isVisible("usuario") ? <th>Usuario</th> : null}
                {colsReg.isVisible("items") ? <th>Con costo</th> : null}
                {colsReg.isVisible("cambios") ? <th>Cambios</th> : null}
                {colsReg.isVisible("acciones") ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {listas.length ? (
                listas.map((lista) => (
                  <tr
                    key={lista.id}
                    className={detalleLista === lista.id ? "g-row-active" : undefined}
                    onClick={() => setDetalleLista(lista.id)}
                  >
                    {colsReg.isVisible("fecha") ? (
                      <td>
                        {fechaHoraVisible(lista.fecha_hora_registro)}
                        {lista.vigente ? (
                          <span className="g-badge g-badge-success ml-2">Vigente</span>
                        ) : null}
                      </td>
                    ) : null}
                    {colsReg.isVisible("usuario") ? <td>{lista.usuario}</td> : null}
                    {colsReg.isVisible("items") ? <td className="tabular-nums">{lista.items_con_costo}</td> : null}
                    {colsReg.isVisible("cambios") ? <td className="tabular-nums">{lista.cambios}</td> : null}
                    {colsReg.isVisible("acciones") ? (
                      <td className="flex items-center gap-1">
                        <RowDetailButton onClick={() => setDetalleLista(lista.id)} />
                        {puedeEditar && lista.vigente ? (
                          <RowDeleteButton onClick={onEliminarVigente} disabled={pending} />
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-[var(--color-text-muted)]">
                    Sin registros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
        {listaDetalle ? (
          <RecordDetailDrawer
            heading="Lista"
            title={fechaHoraVisible(listaDetalle.fecha_hora_registro)}
            badge={listaDetalle.vigente ? <span className="g-badge g-badge-success">Vigente</span> : undefined}
            onClose={() => setDetalleLista(null)}
          >
            <dl className="mb-3 space-y-1 text-[13px]">
              <Fila label="Usuario" valor={listaDetalle.usuario} />
              <Fila label="Con costo" valor={String(listaDetalle.items_con_costo)} />
              <Fila label="Cambios" valor={String(listaDetalle.cambios)} />
            </dl>
            <table className="g-table text-[12px]">
              <thead>
                <tr>
                  <th>Ingrediente</th>
                  <th>$/Tn</th>
                </tr>
              </thead>
              <tbody>
                {listaDetalle.items.filter((i) => i.costo_por_tn > 0).map((i) => (
                  <tr key={i.id}>
                    <td>{i.nombre || i.codigo}</td>
                    <td className="tabular-nums">{textoDinero(i.costo_por_tn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </RecordDetailDrawer>
        ) : null}
      </div>
    </div>
  );
}

function Fila({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex justify-between gap-2 py-0.5">
      <dt className="shrink-0 text-[var(--color-text-muted)]">{label}</dt>
      <dd className="g-truncate text-right font-medium" title={valor}>
        {valor}
      </dd>
    </div>
  );
}

