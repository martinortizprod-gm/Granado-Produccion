"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconPlus, IconSearch, IconChart } from "@/components/ui/icons";
import { ColumnPicker } from "@/components/ui/column-picker";
import {
  RecordDetailDrawer,
  RowDeleteButton,
  RowDetailButton,
  RowEditButton,
} from "@/components/ui/record-detail";
import { ColDef, useColumnVisibility } from "@/components/ui/use-column-visibility";
import { eliminarMovimiento, guardarMovimiento } from "@/app/movimientos/actions";
import type { DatosKind } from "@/lib/movimientos/data";
import { ResumenMovimientos } from "@/app/movimientos/resumen-movimientos";
import {
  cantidadesPallets,
  DatosMovimientoForm,
  etiquetaOpcion,
  filtrarMovimientos,
  hoyIso,
  KindMovimiento,
  KINDS,
  MOVIMIENTOS,
  MovimientoVista,
  resumenMovimientos,
  stockLote,
  unicos,
} from "@/lib/movimientos/logic";
import { aFecha, fechaVisible, numero } from "@/lib/solicitudes/logic";

function nro(valor: number) {
  const n = Number(valor) || 0;
  if (Math.abs(n - Math.round(n)) < 0.05) return Math.round(n).toLocaleString("es-AR");
  return n.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function vacio(tipo = "Ingreso"): DatosMovimientoForm {
  return {
    tipo,
    id_catalogo: "",
    fecha_registro: hoyIso(),
    fecha_vencimiento: "",
    lote: "",
    cantidad: "",
    remito: "",
    proveedor: "",
    observaciones: "",
  };
}

function desde(item: MovimientoVista): DatosMovimientoForm {
  return {
    tipo: item.tipo_etiqueta,
    id_catalogo: item.id_catalogo != null ? String(item.id_catalogo) : "",
    fecha_registro: aFecha(item.fecha_registro) ?? hoyIso(),
    fecha_vencimiento: aFecha(item.fecha_vencimiento) ?? "",
    lote: item.lote,
    cantidad: item.cantidad ? String(item.cantidad) : "",
    remito: item.remito,
    proveedor: item.proveedor,
    observaciones: item.observaciones,
  };
}

export function MovimientosClient({
  kinds,
  errorCarga,
  puedeEditar,
}: {
  kinds: Record<KindMovimiento, DatosKind>;
  errorCarga: string | null;
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<KindMovimiento>("ingredientes");
  const cfg = MOVIMIENTOS[kind];
  const pack = kinds[kind];
  const [pending, startTransition] = useTransition();
  const [tipo, setTipo] = useState("Todos");
  const [articulo, setArticulo] = useState("Todos");
  const [gestion, setGestion] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [desdeF, setDesdeF] = useState("");
  const [hastaF, setHastaF] = useState("");
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [form, setForm] = useState<DatosMovimientoForm | null>(null);
  const [idEdicion, setIdEdicion] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [resumenAbierto, setResumenAbierto] = useState(false);

  const colsDef = useMemo(() => {
    const cols: ColDef[] = [
      { id: "tipo", label: "Tipo" },
      { id: "fecha", label: "Fecha" },
      { id: "codigo", label: "Código" },
      { id: "articulo", label: cfg.etiquetaItem },
      { id: "lote", label: "Lote" },
    ];
    if (cfg.esProducto) {
      cols.push(
        { id: "stk_pall", label: "Stk Pall." },
        { id: "stk_un", label: "Stk Un." },
        { id: "stk_kg", label: "Stk Kg." },
      );
    } else {
      cols.push(
        { id: "cantidad", label: "Cantidad" },
        { id: "remito", label: "Remito" },
        { id: "gestion", label: "Gestión" },
      );
    }
    cols.push({ id: "acciones", label: "Acciones", locked: true });
    return cols;
  }, [cfg]);
  const cols = useColumnVisibility(`movimientos-${kind}`, colsDef);
  const show = cols.isVisible;

  const nombres = useMemo(() => unicos(pack.movimientos, "nombre"), [pack.movimientos]);
  const gestiones = useMemo(() => unicos(pack.movimientos, "gestion"), [pack.movimientos]);
  const filtrados = useMemo(
    () =>
      filtrarMovimientos(pack.movimientos, {
        tipo,
        articulo,
        gestion: cfg.esProducto ? "Todos" : gestion,
        busqueda,
        desde: desdeF,
        hasta: hastaF,
      }),
    [pack.movimientos, tipo, articulo, gestion, busqueda, desdeF, hastaF, cfg.esProducto],
  );
  const resumen = useMemo(() => resumenMovimientos(filtrados), [filtrados]);
  const detalle = filtrados.find((m) => m.id === detalleId) ?? null;
  const editando = pack.movimientos.find((m) => m.id === idEdicion);
  const artForm = pack.articulos.find((a) => String(a.id) === form?.id_catalogo);
  const artsVisibles = pack.articulos.filter(
    (a) => a.activo || a.id === editando?.id_catalogo,
  );
  const lotesForm = useMemo(() => {
    if (!artForm || !form) return [];
    const esEgreso = form.tipo.toLowerCase().startsWith("egre");
    const lista = artForm.lotes.filter((l) => !esEgreso || stockLote(artForm, l.lote, editando) > 0.0005);
    if (editando?.lote && !lista.some((l) => l.lote === editando.lote)) {
      lista.push({
        lote: editando.lote,
        stock: stockLote(artForm, editando.lote, editando),
        vencimiento: editando.fecha_vencimiento,
        unPorPall: 0,
        pesoUn: 0,
      });
    }
    return lista;
  }, [artForm, form, editando]);
  const loteSel = lotesForm.find((l) => l.lote === form?.lote);
  const preview =
    cfg.esProducto && loteSel && loteSel.unPorPall > 0
      ? cantidadesPallets(numero(form?.cantidad), loteSel.unPorPall, loteSel.pesoUn)
      : null;

  function cambiarKind(siguiente: KindMovimiento) {
    setKind(siguiente);
    setTipo("Todos");
    setArticulo("Todos");
    setGestion("Todos");
    setBusqueda("");
    setDesdeF("");
    setHastaF("");
    setDetalleId(null);
    setForm(null);
    setIdEdicion(undefined);
    setError(null);
  }

  function abrirNuevo() {
    setIdEdicion(undefined);
    setForm(vacio());
    setError(null);
  }

  function abrirEditar(item: MovimientoVista) {
    setIdEdicion(item.id);
    setForm(desde(item));
    setError(null);
  }

  function onGuardar(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    setAviso(null);
    startTransition(async () => {
      try {
        await guardarMovimiento(kind, form, idEdicion);
        setAviso(idEdicion ? "Movimiento actualizado." : "Movimiento registrado.");
        setForm(null);
        setIdEdicion(undefined);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar");
      }
    });
  }

  function onEliminar(item: MovimientoVista) {
    const nombre = item.nombre || item.codigo || `id ${item.id}`;
    const lote = item.lote ? `\nLote: ${item.lote}` : "";
    if (
      !confirm(
        `¿Eliminar este ${item.tipo_etiqueta.toLowerCase()} de ${cfg.etiquetaItem.toLowerCase()}?\n${nombre}${lote}`,
      )
    ) {
      return;
    }
    setError(null);
    setAviso(null);
    startTransition(async () => {
      try {
        await eliminarMovimiento(kind, item.id);
        if (detalleId === item.id) setDetalleId(null);
        setAviso("Movimiento eliminado.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo eliminar");
      }
    });
  }

  return (
    <div className="g-stack">
      {errorCarga ? <p className="g-alert g-alert-danger">{errorCarga}</p> : null}
      {error ? <p className="g-alert g-alert-danger">{error}</p> : null}
      {aviso ? <p className="g-alert g-alert-success">{aviso}</p> : null}

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="g-page-title">Movimientos</h1>
          <p className="g-page-subtitle">
            Ingresos y egresos de ingredientes, insumos, etiquetas y productos. Un
            egreso descuenta stock. El consumo de materias primas se descuenta desde
            Producción; el cierre de una producción ingresa stock de producto terminado.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="g-btn g-btn-icon h-9 w-9"
            title="Gráfico"
            aria-label="Gráfico"
            onClick={() => setResumenAbierto(true)}
          >
            <IconChart className="h-4 w-4" />
          </button>
          {puedeEditar ? (
            <button type="button" className="g-btn g-btn-primary" onClick={abrirNuevo}>
              <IconPlus className="h-4 w-4" />
              Nuevo movimiento
            </button>
          ) : null}
        </div>
      </div>

      {resumenAbierto ? (
        <ResumenMovimientos cfg={cfg} movimientos={filtrados} onCerrar={() => setResumenAbierto(false)} />
      ) : null}

      <div className="flex flex-wrap gap-1">
        {KINDS.map((k) => (
          <button
            key={k}
            type="button"
            className={k === kind ? "g-btn g-btn-primary" : "g-btn g-btn-secondary"}
            onClick={() => cambiarKind(k)}
          >
            {MOVIMIENTOS[k].titulo}
          </button>
        ))}
      </div>

      <div className="g-kpis grid grid-cols-2 gap-2 md:grid-cols-4">
        <Kpi titulo="Total" valor={String(resumen.total)} pie="Registros" />
        <Kpi
          titulo="Ingresos"
          valor={String(resumen.ingresos)}
          pie={`${nro(resumen.cantidad_ingresos)} ${cfg.unidad}`}
        />
        <Kpi
          titulo="Egresos"
          valor={String(resumen.egresos)}
          pie={`${nro(resumen.cantidad_egresos)} ${cfg.unidad}`}
          tono="info"
        />
        <Kpi
          titulo="Balance"
          valor={nro(resumen.cantidad_ingresos - resumen.cantidad_egresos)}
          pie={`Ingresos − egresos (${cfg.unidad})`}
        />
      </div>

      {form ? (
        <form className="g-card space-y-3 p-3" onSubmit={onGuardar}>
          <p className="g-section-title">
            {idEdicion ? "Editar movimiento" : "Nuevo movimiento"} de {cfg.titulo.toLowerCase()}
          </p>
          {form.tipo.toLowerCase().startsWith("egre") ? (
            <p className="g-alert g-alert-warning">
              {cfg.esProducto
                ? "Un egreso no puede superar el stock de pallets del lote. Unidades y kg se calculan con la solicitud de ese lote."
                : "Un egreso descuenta stock. El consumo de una producción no se carga acá: se descuenta desde Producción."}
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <label className="block">
              <span className="g-label">Tipo</span>
              <select
                className="g-input"
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              >
                <option>Ingreso</option>
                <option>Egreso</option>
              </select>
            </label>
            <label className="col-span-2 block">
              <span className="g-label">{cfg.etiquetaItem}</span>
              <select
                className="g-input"
                value={form.id_catalogo}
                onChange={(e) => setForm({ ...form, id_catalogo: e.target.value, lote: "" })}
                required
              >
                <option value="">Elegí del catálogo</option>
                {artsVisibles.map((a) => (
                  <option key={a.id} value={a.id}>
                    {etiquetaOpcion(a.codigo, a.nombre)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="g-label">Código</span>
              <input className="g-input" readOnly value={artForm?.codigo || "—"} />
            </label>
            <label className="block">
              <span className="g-label">Fecha de registro</span>
              <input
                type="date"
                className="g-input"
                value={aFecha(form.fecha_registro) ?? ""}
                onChange={(e) => setForm({ ...form, fecha_registro: e.target.value })}
                required
              />
            </label>
            <label className="block">
              <span className="g-label">Fecha de vencimiento</span>
              <input
                type="date"
                className="g-input"
                value={aFecha(form.fecha_vencimiento) ?? ""}
                onChange={(e) => setForm({ ...form, fecha_vencimiento: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="g-label">Lote</span>
              <input
                className="g-input"
                list={`lotes-${kind}`}
                value={form.lote}
                onChange={(e) => {
                  const lote = e.target.value;
                  const op = lotesForm.find((l) => l.lote === lote);
                  setForm({
                    ...form,
                    lote,
                    fecha_vencimiento:
                      op?.vencimiento && !form.fecha_vencimiento
                        ? aFecha(op.vencimiento) ?? form.fecha_vencimiento
                        : form.fecha_vencimiento,
                  });
                }}
              />
              <datalist id={`lotes-${kind}`}>
                {lotesForm.map((l) => (
                  <option key={l.lote} value={l.lote}>
                    {`${nro(stockLote(artForm, l.lote, editando))} ${cfg.unidad}`}
                  </option>
                ))}
              </datalist>
            </label>
            <label className="block">
              <span className="g-label">{cfg.etiquetaCantidad}</span>
              <input
                className="g-input"
                inputMode="decimal"
                value={form.cantidad}
                onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                required
              />
            </label>
            {cfg.esProducto ? (
              <>
                <label className="block">
                  <span className="g-label">Unidades</span>
                  <input className="g-input" readOnly value={preview ? nro(preview.unidades) : "—"} />
                </label>
                <label className="block">
                  <span className="g-label">Kg</span>
                  <input className="g-input" readOnly value={preview ? nro(preview.kg) : "—"} />
                </label>
              </>
            ) : (
              <label className="block">
                <span className="g-label">Remito</span>
                <input
                  className="g-input"
                  value={form.remito}
                  onChange={(e) => setForm({ ...form, remito: e.target.value })}
                />
              </label>
            )}
            {cfg.proveedor ? (
              <label className="block">
                <span className="g-label">Proveedor</span>
                <input
                  className="g-input"
                  value={form.proveedor}
                  onChange={(e) => setForm({ ...form, proveedor: e.target.value })}
                />
              </label>
            ) : null}
            <label className="col-span-2 block">
              <span className="g-label">Observaciones</span>
              <input
                className="g-input"
                value={form.observaciones}
                onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="g-btn g-btn-secondary" onClick={() => setForm(null)}>
              Cancelar
            </button>
            <button type="submit" className="g-btn g-btn-primary" disabled={pending}>
              Guardar movimiento
            </button>
          </div>
        </form>
      ) : null}

      <div className="relative">
        <div className="g-table-wrap">
          <div className="g-table-toolbar">
            <div className="g-filters">
              <label>
                <span className="g-label">Tipo</span>
                <select className="g-input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                  <option>Todos</option>
                  <option>Ingresos</option>
                  <option>Egresos</option>
                </select>
              </label>
              <label>
                <span className="g-label">Fecha desde</span>
                <input type="date" className="g-input" value={desdeF} onChange={(e) => setDesdeF(e.target.value)} />
              </label>
              <label>
                <span className="g-label">Fecha hasta</span>
                <input type="date" className="g-input" value={hastaF} onChange={(e) => setHastaF(e.target.value)} />
              </label>
              <label>
                <span className="g-label">{cfg.etiquetaItem}</span>
                <select className="g-input" value={articulo} onChange={(e) => setArticulo(e.target.value)}>
                  <option>Todos</option>
                  {nombres.map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              {cfg.esProducto ? null : (
                <label>
                  <span className="g-label">Gestión</span>
                  <select className="g-input" value={gestion} onChange={(e) => setGestion(e.target.value)}>
                    <option>Todos</option>
                    {gestiones.map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                <span className="g-label">Buscar</span>
                <div className="relative">
                  <IconSearch className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
                  <input
                    className="g-input pl-7"
                    placeholder={cfg.esProducto ? "Código, lote…" : "Código, lote, remito…"}
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                </div>
              </label>
            </div>
            <ColumnPicker cols={cols.cols} isVisible={cols.isVisible} onToggle={cols.toggle} />
          </div>
          <div className="g-table-scroll">
            <table className="g-table">
              <thead>
                <tr>
                  {show("tipo") ? <th>Tipo</th> : null}
                  {show("fecha") ? <th>Fecha</th> : null}
                  {show("codigo") ? <th>Código</th> : null}
                  {show("articulo") ? <th>{cfg.etiquetaItem}</th> : null}
                  {show("lote") ? <th>Lote</th> : null}
                  {cfg.esProducto && show("stk_pall") ? <th>Stk Pall.</th> : null}
                  {cfg.esProducto && show("stk_un") ? <th>Stk Un.</th> : null}
                  {cfg.esProducto && show("stk_kg") ? <th>Stk Kg.</th> : null}
                  {!cfg.esProducto && show("cantidad") ? <th>Cantidad</th> : null}
                  {!cfg.esProducto && show("remito") ? <th>Remito</th> : null}
                  {!cfg.esProducto && show("gestion") ? <th>Gestión</th> : null}
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-[var(--color-text-muted)]">
                      {pack.movimientos.length === 0
                        ? "No hay movimientos registrados."
                        : "No se encontraron movimientos con los filtros seleccionados."}
                    </td>
                  </tr>
                ) : (
                  filtrados.map((item) => (
                    <tr key={item.id} className={detalleId === item.id ? "g-row-active" : ""}>
                      {show("tipo") ? (
                        <td>
                          <span className={item.tipo === "egreso" ? "g-badge g-badge-info" : "g-badge g-badge-success"}>
                            {item.tipo_etiqueta}
                          </span>
                        </td>
                      ) : null}
                      {show("fecha") ? <td>{fechaVisible(aFecha(item.fecha_registro))}</td> : null}
                      {show("codigo") ? <td>{item.codigo || "—"}</td> : null}
                      {show("articulo") ? <td className="font-medium">{item.nombre || "—"}</td> : null}
                      {show("lote") ? <td>{item.lote || "—"}</td> : null}
                      {cfg.esProducto && show("stk_pall") ? <td className="tabular-nums">{nro(item.cantidad)}</td> : null}
                      {cfg.esProducto && show("stk_un") ? <td className="tabular-nums">{nro(item.stk_un)}</td> : null}
                      {cfg.esProducto && show("stk_kg") ? <td className="tabular-nums">{nro(item.stk_kg)}</td> : null}
                      {!cfg.esProducto && show("cantidad") ? (
                        <td className="tabular-nums">
                          {nro(item.cantidad)} {item.unidad}
                        </td>
                      ) : null}
                      {!cfg.esProducto && show("remito") ? <td>{item.remito || "—"}</td> : null}
                      {!cfg.esProducto && show("gestion") ? <td>{item.gestion || "—"}</td> : null}
                      <td className="whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <RowDetailButton onClick={() => setDetalleId(item.id)} />
                          {puedeEditar ? (
                            <>
                              <RowEditButton onClick={() => abrirEditar(item)} />
                              <RowDeleteButton disabled={pending} onClick={() => onEliminar(item)} />
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        {detalle ? (
          <RecordDetailDrawer
            heading="Detalle de movimiento"
            title={detalle.nombre || detalle.codigo || "Movimiento"}
            badge={
              <span className={detalle.tipo === "egreso" ? "g-badge g-badge-info" : "g-badge g-badge-success"}>
                {detalle.tipo_etiqueta}
              </span>
            }
            onClose={() => setDetalleId(null)}
          >
            <dl className="space-y-1 text-[13px]">
              <Fila label={cfg.etiquetaItem} valor={detalle.nombre || "—"} />
              <Fila label="Código" valor={detalle.codigo || "—"} />
              <Fila label="Lote" valor={detalle.lote || "—"} />
              <Fila label="Fecha" valor={fechaVisible(aFecha(detalle.fecha_registro))} />
              <Fila label="Vencimiento" valor={fechaVisible(aFecha(detalle.fecha_vencimiento))} />
              <Fila label={cfg.etiquetaCantidad} valor={`${nro(detalle.cantidad)} ${detalle.unidad}`} />
              {cfg.esProducto ? (
                <>
                  <Fila label="Unidades" valor={nro(detalle.stk_un)} />
                  <Fila label="Kg" valor={nro(detalle.stk_kg)} />
                </>
              ) : (
                <>
                  <Fila label="Remito" valor={detalle.remito || "—"} />
                  <Fila label="Gestión" valor={detalle.gestion || "—"} />
                  <Fila label="Categoría" valor={detalle.categoria || "—"} />
                </>
              )}
              {cfg.proveedor ? <Fila label="Proveedor" valor={detalle.proveedor || "—"} /> : null}
              <Fila label="Observaciones" valor={detalle.observaciones || "—"} />
              <Fila label="Id" valor={String(detalle.id)} />
            </dl>
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
      <dd className="text-right font-medium">{valor}</dd>
    </div>
  );
}

function Kpi({
  titulo,
  valor,
  pie,
  tono,
}: {
  titulo: string;
  valor: string;
  pie: string;
  tono?: "info";
}) {
  return (
    <div className="g-kpi">
      <p className="g-kpi-title">{titulo}</p>
      <p
        className="g-kpi-value"
        style={{ color: tono === "info" ? "var(--color-info)" : "var(--color-primary)" }}
      >
        {valor}
      </p>
      <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">{pie}</p>
    </div>
  );
}
