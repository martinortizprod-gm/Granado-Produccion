"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconDownload, IconPlus, IconSearch } from "@/components/ui/icons";
import { DialogoInforme } from "@/components/ui/informe";
import { ColumnPicker } from "@/components/ui/column-picker";
import {
  RecordDetailDrawer,
  RowDeleteButton,
  RowDetailButton,
  RowEditButton,
} from "@/components/ui/record-detail";
import { useColumnVisibility } from "@/components/ui/use-column-visibility";
import { eliminarProducto, guardarProducto } from "@/app/productos/actions";
import {
  DatosProductoForm,
  OpcionCatalogo,
  ProductoVista,
  etiquetaOpcion,
  filtrarProductos,
  hoyIso,
  resumenProductos,
  unicos,
} from "@/lib/productos/logic";
import { aFecha, fechaVisible, nroVisible } from "@/lib/solicitudes/logic";

const COLS = [
  { id: "codigo", label: "Código" },
  { id: "nombre", label: "Producto" },
  { id: "categoria", label: "Categoría" },
  { id: "receta", label: "Receta PLC" },
  { id: "stk_pall", label: "Stk Pall." },
  { id: "stk_un", label: "Stk Un." },
  { id: "stk_kg", label: "Stk Kg." },
  { id: "acciones", label: "Acciones", locked: true },
];

function nro(valor: number) {
  const n = Number(valor) || 0;
  if (Math.abs(n - Math.round(n)) < 0.05) return Math.round(n).toLocaleString("es-AR");
  return n.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function fechaArchivo() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
}

function filasProductoInforme(productos: ProductoVista[]): (string | number | null)[][] {
  const filas: (string | number | null)[][] = [];
  for (const item of productos) {
    const base = [item.codigo, item.nombre, item.categoria, item.receta_plc, item.envase];
    if (!item.lotes.length) {
      filas.push([...base, "", item.stk_pall, item.stk_un, item.stk_kg]);
      continue;
    }
    for (const lote of item.lotes) {
      filas.push([...base, lote.lote, lote.stk_pall, lote.stk_un, lote.stk_kg]);
    }
  }
  return filas;
}

function vacio(): DatosProductoForm {
  return {
    fecha_registro: hoyIso(),
    codigo: "",
    nombre: "",
    categoria: "",
    medida: "kg",
    receta_plc: "",
    id_envase: "",
    id_etiqueta: "",
  };
}

function desde(item: ProductoVista): DatosProductoForm {
  return {
    fecha_registro: aFecha(item.fecha_registro) ?? hoyIso(),
    codigo: item.codigo,
    nombre: item.nombre,
    categoria: item.categoria,
    medida: item.medida || "kg",
    receta_plc: item.receta_plc,
    id_envase: item.id_envase != null ? String(item.id_envase) : "",
    id_etiqueta: item.id_etiqueta != null ? String(item.id_etiqueta) : "",
  };
}

function visibles(items: OpcionCatalogo[], idActual: number, extra?: OpcionCatalogo) {
  const lista = items.filter((i) => i.activo || i.id === idActual);
  if (extra && !lista.some((i) => i.id === extra.id)) lista.unshift(extra);
  return lista;
}

export function ProductosClient({
  productos,
  envases,
  etiquetas,
  errorCarga,
  puedeEditar,
}: {
  productos: ProductoVista[];
  envases: OpcionCatalogo[];
  etiquetas: OpcionCatalogo[];
  errorCarga: string | null;
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [categoria, setCategoria] = useState("Todos");
  const [codigo, setCodigo] = useState("Todos");
  const [envase, setEnvase] = useState("Todos");
  const [stock, setStock] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [soloSinReceta, setSoloSinReceta] = useState(false);
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [form, setForm] = useState<DatosProductoForm | null>(null);
  const [idEdicion, setIdEdicion] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [exportar, setExportar] = useState(false);

  const categorias = useMemo(() => unicos(productos, "categoria"), [productos]);
  const envasesFiltro = useMemo(() => unicos(productos, "envase"), [productos]);
  const baseKpi = useMemo(
    () =>
      filtrarProductos(productos, {
        categoria,
        codigo: "Todos",
        envase,
        stock: "Todos",
        busqueda,
        soloSinReceta: false,
      }),
    [productos, categoria, envase, busqueda],
  );
  const filtrados = useMemo(
    () =>
      filtrarProductos(productos, {
        categoria,
        codigo,
        envase,
        stock,
        busqueda,
        soloSinReceta,
      }),
    [productos, categoria, codigo, envase, stock, busqueda, soloSinReceta],
  );
  const resumen = useMemo(() => resumenProductos(baseKpi), [baseKpi]);
  const detalle = filtrados.find((p) => p.id === detalleId) ?? null;
  const cols = useColumnVisibility("productos", COLS);
  const show = cols.isVisible;
  const editado = productos.find((p) => p.id === idEdicion);

  const envasesForm = useMemo(() => {
    const actual = Number(form?.id_envase);
    const extra =
      editado?.id_envase != null && editado.id_envase === actual
        ? {
            id: editado.id_envase,
            codigo: editado.codigo_envase,
            nombre: editado.envase || "Envase del producto",
            extra: "",
            extra_numero: editado.capacidad_kg,
            estado: "Activo",
            activo: true,
          }
        : undefined;
    return visibles(envases, actual, extra);
  }, [envases, form, editado]);

  const etiquetasForm = useMemo(() => {
    const actual = Number(form?.id_etiqueta);
    const extra =
      editado?.id_etiqueta != null && editado.id_etiqueta === actual
        ? {
            id: editado.id_etiqueta,
            codigo: editado.codigo_etiqueta,
            nombre: editado.nombre_etiqueta || "Etiqueta del producto",
            extra: "",
            extra_numero: 0,
            estado: "Activo",
            activo: true,
          }
        : undefined;
    return visibles(etiquetas, actual, extra);
  }, [etiquetas, form, editado]);

  const capacidad = envasesForm.find((e) => String(e.id) === form?.id_envase);

  function abrirNuevo() {
    setIdEdicion(undefined);
    setForm(vacio());
    setError(null);
  }

  function abrirEditar(item: ProductoVista) {
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
        await guardarProducto(form, idEdicion);
        setAviso(idEdicion ? "Producto actualizado." : "Producto creado.");
        setForm(null);
        setIdEdicion(undefined);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar");
      }
    });
  }

  function onEliminar(item: ProductoVista) {
    const nombre = item.nombre || item.codigo || `id ${item.id}`;
    if (!confirm(`¿Eliminar este producto?\n${nombre}`)) return;
    setError(null);
    setAviso(null);
    startTransition(async () => {
      try {
        await eliminarProducto(item.id);
        if (detalleId === item.id) setDetalleId(null);
        setAviso("Producto eliminado.");
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
          <h1 className="g-page-title">Productos</h1>
          <p className="g-page-subtitle">
            Productos terminados. El stock se calcula con los movimientos y los
            cierres de producción. El ajuste se hace en pallets; unidades y kg
            salen de la solicitud de cada lote.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="g-btn g-btn-icon h-9 w-9"
            title="Exportar"
            aria-label="Exportar"
            onClick={() => setExportar(true)}
          >
            <IconDownload className="h-4 w-4" />
          </button>
          {puedeEditar ? (
            <button type="button" className="g-btn g-btn-primary" onClick={abrirNuevo}>
              <IconPlus className="h-4 w-4" />
              Nuevo producto
            </button>
          ) : null}
        </div>
      </div>

      {exportar ? (
        <DialogoInforme
          titulo="Stock de productos"
          nombreInicial={`Stock productos ${fechaArchivo()}`}
          hoja="Stock"
          encabezados={["Código", "Producto", "Categoría", "Receta PLC", "Envase", "Lote", "Stk Pall.", "Stk Un.", "Stk Kg."]}
          filas={filasProductoInforme(filtrados)}
          onCerrar={() => setExportar(false)}
        />
      ) : null}

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Kpi titulo="Total" valor={String(resumen.total)} pie="Registrados" />
        <Kpi titulo="Con código" valor={String(resumen.con_codigo)} pie="Código asignado" />
        <Kpi titulo="Sin código" valor={String(resumen.sin_codigo)} pie="Pendiente de código" tono="warning" />
        <Kpi
          titulo="Sin receta PLC"
          valor={String(resumen.sin_receta)}
          pie="Todavía sin receta PLC"
          tono="warning"
        />
      </div>

      {form ? (
        <form className="g-card space-y-3 p-3" onSubmit={onGuardar}>
          <p className="g-section-title">{idEdicion ? "Editar producto" : "Nuevo producto"}</p>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <label className="block">
              <span className="g-label">Código</span>
              <input
                className="g-input"
                value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="g-label">Producto</span>
              <input
                className="g-input"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                required
              />
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
              <span className="g-label">Receta PLC</span>
              <input
                className="g-input"
                inputMode="numeric"
                value={form.receta_plc}
                onChange={(e) => setForm({ ...form, receta_plc: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="g-label">Categoría</span>
              <input
                className="g-input"
                list="prod-cat"
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              />
              <datalist id="prod-cat">
                {categorias.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
            <label className="block">
              <span className="g-label">Medida</span>
              <input
                className="g-input"
                list="prod-med"
                value={form.medida}
                onChange={(e) => setForm({ ...form, medida: e.target.value })}
              />
              <datalist id="prod-med">
                <option value="kg" />
              </datalist>
            </label>
            <label className="col-span-2 block">
              <span className="g-label">Envase</span>
              <select
                className="g-input"
                value={form.id_envase}
                onChange={(e) => setForm({ ...form, id_envase: e.target.value })}
                required
              >
                <option value="">Elegí un envase</option>
                {envasesForm.map((e) => (
                  <option key={e.id} value={e.id}>
                    {etiquetaOpcion(e.codigo, e.nombre)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="g-label">Capacidad (kg / unidad)</span>
              <input
                className="g-input"
                readOnly
                value={
                  capacidad && capacidad.extra_numero > 0
                    ? `${nroVisible(capacidad.extra_numero, 1)} kg`
                    : "—"
                }
              />
            </label>
            <label className="col-span-2 block">
              <span className="g-label">Etiqueta</span>
              <select
                className="g-input"
                value={form.id_etiqueta}
                onChange={(e) => setForm({ ...form, id_etiqueta: e.target.value })}
                required
              >
                <option value="">Elegí una etiqueta</option>
                {etiquetasForm.map((e) => (
                  <option key={e.id} value={e.id}>
                    {etiquetaOpcion(e.codigo, e.nombre)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="g-btn g-btn-secondary" onClick={() => setForm(null)}>
              Cancelar
            </button>
            <button type="submit" className="g-btn g-btn-primary" disabled={pending}>
              Guardar
            </button>
          </div>
        </form>
      ) : null}

      <div className="relative">
        <div className="g-table-wrap">
          <div className="g-table-toolbar">
            <div className="g-filters">
              <label>
                <span className="g-label">Categoría</span>
                <select className="g-input" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                  <option>Todos</option>
                  {categorias.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="g-label">Código</span>
                <select className="g-input" value={codigo} onChange={(e) => setCodigo(e.target.value)}>
                  <option>Todos</option>
                  <option>Con código</option>
                  <option>Sin código</option>
                </select>
              </label>
              <label>
                <span className="g-label">Envase</span>
                <select className="g-input" value={envase} onChange={(e) => setEnvase(e.target.value)}>
                  <option>Todos</option>
                  {envasesFiltro.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="g-label">Stock</span>
                <select className="g-input" value={stock} onChange={(e) => setStock(e.target.value)}>
                  <option>Todos</option>
                  <option>Con stock</option>
                  <option>Sin stock</option>
                </select>
              </label>
              <label>
                <span className="g-label">Buscar</span>
                <div className="relative">
                  <IconSearch className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
                  <input
                    className="g-input pl-7"
                    placeholder="Código, producto, envase, etiqueta…"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                </div>
              </label>
              <label className="g-filters-fit flex h-[var(--control-height)] items-center gap-1.5 text-[12.5px] text-[var(--color-text-secondary)]">
                <input
                  type="checkbox"
                  checked={soloSinReceta}
                  onChange={(e) => setSoloSinReceta(e.target.checked)}
                />
                Solo sin receta PLC
              </label>
            </div>
            <ColumnPicker cols={cols.cols} isVisible={cols.isVisible} onToggle={cols.toggle} />
          </div>
          <div className="g-table-scroll">
            <table className="g-table">
              <thead>
                <tr>
                  {show("codigo") ? <th>Código</th> : null}
                  {show("nombre") ? <th>Producto</th> : null}
                  {show("categoria") ? <th>Categoría</th> : null}
                  {show("receta") ? <th>Receta PLC</th> : null}
                  {show("stk_pall") ? <th>Stk Pall.</th> : null}
                  {show("stk_un") ? <th>Stk Un.</th> : null}
                  {show("stk_kg") ? <th>Stk Kg.</th> : null}
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-[var(--color-text-muted)]">
                      {productos.length === 0
                        ? "No hay productos registrados."
                        : "No se encontraron productos con los filtros seleccionados."}
                    </td>
                  </tr>
                ) : (
                  filtrados.map((item) => {
                    const bajo = item.stk_pall < 0.0005;
                    return (
                      <tr key={item.id} className={detalleId === item.id ? "g-row-active" : ""}>
                        {show("codigo") ? <td>{item.codigo || "Pendiente"}</td> : null}
                        {show("nombre") ? <td className="font-medium">{item.nombre || "—"}</td> : null}
                        {show("categoria") ? <td>{item.categoria || "—"}</td> : null}
                        {show("receta") ? <td>{item.receta_plc || "—"}</td> : null}
                        {show("stk_pall") ? (
                          <td
                            className="tabular-nums font-medium"
                            style={{ color: bajo ? "var(--color-warning)" : undefined }}
                          >
                            {nro(item.stk_pall)}
                          </td>
                        ) : null}
                        {show("stk_un") ? <td className="tabular-nums">{nro(item.stk_un)}</td> : null}
                        {show("stk_kg") ? <td className="tabular-nums">{nro(item.stk_kg)}</td> : null}
                        <td className="whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <RowDetailButton onClick={() => setDetalleId(item.id)} />
                            {puedeEditar ? (
                              <>
                                <RowEditButton onClick={() => abrirEditar(item)} />
                                <RowDeleteButton
                                  disabled={pending}
                                  onClick={() => onEliminar(item)}
                                />
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {detalle ? (
          <RecordDetailDrawer
            heading="Detalle de producto"
            title={detalle.codigo || detalle.nombre || "Producto"}
            badge={
              !detalle.codigo ? <span className="g-badge g-badge-warning">Pendiente</span> : undefined
            }
            onClose={() => setDetalleId(null)}
          >
            <dl className="space-y-1 text-[13px]">
              <Fila label="Producto" valor={detalle.nombre || "—"} />
              <Fila label="Código" valor={detalle.codigo || "Pendiente"} />
              <Fila label="Categoría" valor={detalle.categoria || "—"} />
              <Fila label="Receta PLC" valor={detalle.receta_plc || "—"} />
              <Fila label="Medida" valor={detalle.medida || "kg"} />
              <Fila label="Fecha registro" valor={fechaVisible(aFecha(detalle.fecha_registro))} />
              <Fila label="Envase" valor={detalle.envase || "—"} />
              <Fila
                label="Capacidad envase"
                valor={
                  detalle.capacidad_kg > 0
                    ? `${nroVisible(detalle.capacidad_kg, 1)} kg / unidad`
                    : "—"
                }
              />
              <Fila
                label="Etiqueta"
                valor={
                  detalle.codigo_etiqueta && detalle.nombre_etiqueta
                    ? `${detalle.codigo_etiqueta} — ${detalle.nombre_etiqueta}`
                    : detalle.nombre_etiqueta || "—"
                }
              />
              <Fila label="Id" valor={String(detalle.id)} />
            </dl>
            <p className="mt-3 mb-1 text-[12px] font-semibold">Stock</p>
            <dl className="space-y-1 text-[13px]">
              <Fila
                label="Stock actual"
                valor={`${nro(detalle.stk_pall)} Pall. · ${nro(detalle.stk_un)} Un. · ${nro(detalle.stk_kg)} kg`}
                bajo={detalle.stk_pall < 0.0005}
              />
              <Fila label="Producción" valor={`${nro(detalle.produccion)} Pall.`} />
              <Fila
                label="Ingresos / egresos"
                valor={`${nro(detalle.ingresos)} Pall. / ${nro(detalle.egresos)} Pall.`}
              />
            </dl>
            <p className="mt-2 text-[11px] text-[var(--color-text-muted)]">
              El ajuste se hace en pallets. Unidades y kg se calculan con la solicitud de cada lote.
            </p>
            <p className="mt-3 mb-1 text-[12px] font-semibold">Lotes</p>
            {detalle.lotes.length === 0 ? (
              <p className="text-[12.5px] text-[var(--color-text-muted)]">Sin lotes con stock.</p>
            ) : (
              <ul className="space-y-1 text-[12.5px]">
                {detalle.lotes.map((l) => (
                  <li key={l.lote} className="flex justify-between gap-2">
                    <span>{l.lote}</span>
                    <span className="tabular-nums">
                      {nro(l.stk_pall)} Pall. · {nro(l.stk_un)} Un. · {nro(l.stk_kg)} kg
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 mb-1 text-[12px] font-semibold">Versiones</p>
            {detalle.versiones.length === 0 ? (
              <p className="text-[12.5px] text-[var(--color-text-muted)]">
                Este producto todavía no tiene versiones de fórmula.
              </p>
            ) : (
              <ul className="space-y-1 text-[12.5px]">
                {detalle.versiones.map((v) => (
                  <li key={v.id}>
                    <p className="font-medium">{v.etiqueta}</p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      Registro: {fechaVisible(aFecha(v.fecha_registro))}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </RecordDetailDrawer>
        ) : null}
      </div>
    </div>
  );
}

function Fila({ label, valor, bajo }: { label: string; valor: string; bajo?: boolean }) {
  return (
    <div className="flex justify-between gap-2 py-0.5">
      <dt className="shrink-0 text-[var(--color-text-muted)]">{label}</dt>
      <dd
        className="text-right font-medium"
        style={{ color: bajo ? "var(--color-warning)" : undefined }}
      >
        {valor}
      </dd>
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
  tono?: "warning";
}) {
  return (
    <div className="g-kpi">
      <p className="g-kpi-title">{titulo}</p>
      <p
        className="g-kpi-value"
        style={{ color: tono === "warning" ? "var(--color-warning)" : "var(--color-primary)" }}
      >
        {valor}
      </p>
      <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">{pie}</p>
    </div>
  );
}
