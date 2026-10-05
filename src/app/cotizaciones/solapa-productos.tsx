"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconDownload, IconPlus, IconSearch } from "@/components/ui/icons";
import { DialogoInforme } from "@/components/ui/informe";
import { ColumnPicker } from "@/components/ui/column-picker";
import { RecordDetailDrawer, RowDetailButton } from "@/components/ui/record-detail";
import { useColumnVisibility } from "@/components/ui/use-column-visibility";
import { guardarCotizacionProducto } from "@/app/cotizaciones/actions";
import { Kpi, fechaHoraVisible } from "@/app/cotizaciones/piezas";
import { descargarExcelCotizacionProductos } from "@/lib/cotizaciones/excel";
import { descargarCotizacionPdf } from "@/lib/cotizaciones/pdf";
import {
  CotizProductoGuardada,
  DatosCotizProductoForm,
  ENCABEZADOS_INFORME_PRODUCTOS,
  FilaProductoCotiz,
  ListaFazon,
  ListaMp,
  ParFazon,
  ProductoCotiz,
  armarDesgloseProducto,
  capacidadesDeCategoria,
  etiquetaOpcion,
  filasInformeProductos,
  filtrarFilasProducto,
  textoCapacidad,
  textoDinero,
  versionesActivasDe,
} from "@/lib/cotizaciones/logic";
import type { VersionVista } from "@/lib/recetas/logic";
import { pctTexto } from "@/lib/recetas/logic";
import { nroVisible } from "@/lib/solicitudes/logic";

const COLS = [
  { id: "codigo", label: "Código" },
  { id: "categoria", label: "Categoría" },
  { id: "producto", label: "Producto" },
  { id: "version", label: "Versión" },
  { id: "capacidad", label: "Capacidad" },
  { id: "mp", label: "Costo MP $/Tn" },
  { id: "fazon", label: "Fazón $/Tn" },
  { id: "total", label: "Costo $/Tn" },
  { id: "acciones", label: "Acciones", locked: true },
];

const COLS_REG = [
  { id: "fecha", label: "Fecha" },
  { id: "producto", label: "Producto" },
  { id: "tn", label: "Tn" },
  { id: "total", label: "Total" },
  { id: "usuario", label: "Usuario" },
  { id: "acciones", label: "Acciones", locked: true },
];

function fechaArchivo() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
}

function formVacio(): DatosCotizProductoForm {
  return { id_producto: "", id_version: "", capacidad_kg: "", toneladas: "" };
}

export function SolapaProductos({
  productos,
  pares,
  versiones,
  listasMp,
  listasFazon,
  filas,
  guardadas,
  errorCarga,
  puedeEditar,
}: {
  productos: ProductoCotiz[];
  pares: ParFazon[];
  versiones: VersionVista[];
  listasMp: ListaMp[];
  listasFazon: ListaFazon[];
  filas: FilaProductoCotiz[];
  guardadas: CotizProductoGuardada[];
  errorCarga: string | null;
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [categoria, setCategoria] = useState("Todos");
  const [producto, setProducto] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [detalleClave, setDetalleClave] = useState<string | null>(null);
  const [detalleGuardada, setDetalleGuardada] = useState<number | null>(null);
  const [form, setForm] = useState<DatosCotizProductoForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [exportar, setExportar] = useState(false);

  const vigenteMp = listasMp.find((l) => l.vigente);
  const vigenteFz = listasFazon.find((l) => l.vigente);
  const categorias = useMemo(() => {
    const set = new Set(filas.map((f) => f.categoria).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [filas]);
  const nombres = useMemo(() => {
    const set = new Set(filas.map((f) => f.producto).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [filas]);
  const filtradas = useMemo(
    () => filtrarFilasProducto(filas, { categoria, producto, busqueda }),
    [filas, categoria, producto, busqueda],
  );
  const sinMp = filtradas.filter((f) => f.lineas_sin_costo > 0).length;
  const cols = useColumnVisibility("cotiz-productos", COLS);
  const colsReg = useColumnVisibility("cotiz-productos-reg", COLS_REG);
  const detalle = filtradas.find((f) => f.clave === detalleClave) ?? filas.find((f) => f.clave === detalleClave);
  const guardada = guardadas.find((g) => g.id === detalleGuardada) ?? null;

  const prodForm = productos.find((p) => String(p.id) === form?.id_producto);
  const versForm = prodForm ? versionesActivasDe(versiones, prodForm.id) : [];
  const capsForm = prodForm
    ? capacidadesDeCategoria(pares, vigenteFz, prodForm.categoria, prodForm.capacidad_kg)
    : [];
  const preview = useMemo(() => {
    if (!form) return null;
    const idP = Number(form.id_producto);
    const idV = Number(form.id_version);
    const cap = Number(String(form.capacidad_kg).replace(",", "."));
    const tn = Number(String(form.toneladas).replace(",", "."));
    if (!idP || !idV) return null;
    return armarDesgloseProducto({
      productos,
      versiones,
      listaMp: vigenteMp,
      listaFazon: vigenteFz,
      idProducto: idP,
      idVersion: idV,
      capacidadKg: cap,
      toneladas: tn > 0 ? tn : 0,
    });
  }, [form, productos, versiones, vigenteMp, vigenteFz]);

  function abrirCotizar(fila?: FilaProductoCotiz) {
    if (fila) {
      setForm({
        id_producto: String(fila.id_producto),
        id_version: String(fila.id_version),
        capacidad_kg: String(fila.capacidad_kg || ""),
        toneladas: "",
      });
    } else {
      setForm(formVacio());
    }
    setError(null);
    setAviso(null);
  }

  function onProducto(id: string) {
    if (!form) return;
    const prod = productos.find((p) => String(p.id) === id);
    const vers = prod ? versionesActivasDe(versiones, prod.id) : [];
    const preferida = vers[vers.length - 1];
    setForm({
      ...form,
      id_producto: id,
      id_version: preferida ? String(preferida.id) : "",
      capacidad_kg: prod && prod.capacidad_kg > 0 ? String(prod.capacidad_kg) : "",
    });
  }

  function onGuardar(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    setAviso(null);
    startTransition(async () => {
      try {
        const guardado = await guardarCotizacionProducto(form);
        setAviso("Cotización de producto registrada.");
        setForm(null);
        descargarCotizacionPdf({
          fila: guardado.fila,
          toneladas: guardado.toneladas,
          total: guardado.total,
          nombreArchivo: `Cotizacion ${guardado.fila.codigo || guardado.fila.producto} ${fechaArchivo()}`,
        });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar");
      }
    });
  }

  function abrirPdfGuardada(item: CotizProductoGuardada) {
    const fila: FilaProductoCotiz = {
      clave: `g-${item.id}`,
      id_producto: item.id_producto ?? 0,
      id_version: item.id_version ?? 0,
      codigo: item.codigo_producto,
      producto: item.producto,
      categoria: item.categoria,
      version: item.version,
      envase: "",
      capacidad_kg: item.capacidad_kg,
      costo_mp_tn: item.costo_mp_tn,
      costo_fazon_tn: item.costo_fazon_tn,
      costo_tn: item.costo_tn,
      lineas: item.items.map((l) => ({
        id_ingrediente: l.id_ingrediente,
        codigo: l.codigo,
        nombre: l.nombre,
        participacion: l.participacion,
        participacion_pct: l.participacion_pct,
        costo_ingrediente_tn: l.costo_ingrediente_tn,
        costo_linea_tn: l.costo_linea_tn,
        sin_costo: !(l.costo_ingrediente_tn > 0),
      })),
      otras_presentaciones: [],
      lineas_sin_costo: item.items.filter((l) => !(l.costo_ingrediente_tn > 0)).length,
    };
    descargarCotizacionPdf({
      fila,
      toneladas: item.toneladas,
      total: item.total,
      nombreArchivo: `Cotizacion ${item.codigo_producto || item.producto} ${fechaArchivo()}`,
    });
  }

  return (
    <div className="g-stack">
      {errorCarga ? <p className="g-alert g-alert-warning">{errorCarga}</p> : null}
      {error ? <p className="g-alert g-alert-danger">{error}</p> : null}
      {aviso ? <p className="g-alert g-alert-success">{aviso}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="g-section-title">Listado</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="g-btn g-btn-secondary" onClick={() => setExportar(true)}>
            <IconDownload className="h-4 w-4" />
            Exportar
          </button>
          {puedeEditar ? (
            <button type="button" className="g-btn g-btn-primary" disabled={pending || !!errorCarga} onClick={() => abrirCotizar()}>
              <IconPlus className="h-4 w-4" />
              Cotizar un producto
            </button>
          ) : null}
        </div>
      </div>

      <div className="g-kpis grid grid-cols-2 gap-2 md:grid-cols-3">
        <Kpi titulo="Cotizables" valor={String(filtradas.length)} pie="Recetas activas con fazón de la categoría" />
        <Kpi
          titulo="Sin costo MP"
          valor={String(sinMp)}
          pie="Algún ingrediente de la receta está en $ 0"
          />
        <Kpi titulo="Guardadas" valor={String(guardadas.length)} pie="PDFs / snapshots históricos" />
      </div>

      {form ? (
        <form className="g-card space-y-3 p-3" onSubmit={onGuardar}>
          <p className="g-section-title">Cotizar un producto</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="g-label">Producto</span>
              <select
                className="g-input"
                value={form.id_producto}
                onChange={(e) => onProducto(e.target.value)}
                required
              >
                <option value="">Seleccioná</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {etiquetaOpcion(p.codigo, p.nombre)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="g-label">Versión</span>
              <select
                className="g-input"
                value={form.id_version}
                onChange={(e) => setForm({ ...form, id_version: e.target.value })}
                required
              >
                <option value="">Seleccioná</option>
                {versForm.map((v) => (
                  <option key={v.id} value={v.id}>
                    Versión {v.numero}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="g-label">Capacidad (kg)</span>
              <select
                className="g-input"
                value={form.capacidad_kg}
                onChange={(e) => setForm({ ...form, capacidad_kg: e.target.value })}
                required
              >
                <option value="">Seleccioná</option>
                {capsForm.map((kg) => (
                  <option key={kg} value={kg}>
                    {textoCapacidad(kg)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="g-label">Toneladas</span>
              <input
                className="g-input"
                inputMode="decimal"
                value={form.toneladas}
                onChange={(e) => setForm({ ...form, toneladas: e.target.value })}
                required
              />
            </label>
          </div>

          {preview?.fila ? (
            <div className="space-y-2">
              {preview.fila.lineas_sin_costo > 0 ? (
                <p className="g-alert g-alert-warning">
                  Hay {preview.fila.lineas_sin_costo} ingrediente
                  {preview.fila.lineas_sin_costo === 1 ? "" : "s"} sin costo vigente. El total puede quedar corto.
                </p>
              ) : null}
              <div className="g-table-wrap">
                <div className="g-table-scroll max-h-[240px]">
                  <table className="g-table">
                    <thead>
                      <tr>
                        <th>Ingrediente</th>
                        <th>Participación</th>
                        <th>$/Tn</th>
                        <th>Costo $/Tn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.fila.lineas.map((l) => (
                        <tr key={`${l.id_ingrediente}-${l.nombre}`}>
                          <td>{l.nombre || l.codigo || "—"}</td>
                          <td className="tabular-nums">{pctTexto(l.participacion_pct)}</td>
                          <td className="tabular-nums">{textoDinero(l.costo_ingrediente_tn)}</td>
                          <td className="tabular-nums">{textoDinero(l.costo_linea_tn)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <dl className="grid gap-1 text-[13px] sm:grid-cols-2 lg:grid-cols-4">
                <Fila label="Costo MP $/Tn" valor={textoDinero(preview.fila.costo_mp_tn)} />
                <Fila label="Fazón $/Tn" valor={textoDinero(preview.costo_fazon_tn)} />
                <Fila label="Costo $/Tn" valor={textoDinero(preview.costo_tn)} />
                <Fila
                  label="Cotización total"
                  valor={preview.toneladas > 0 ? textoDinero(preview.total) : "—"}
                />
              </dl>
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <button type="button" className="g-btn g-btn-secondary" onClick={() => setForm(null)}>
              Salir
            </button>
            <button type="submit" className="g-btn g-btn-primary" disabled={pending}>
              Crear PDF
            </button>
          </div>
        </form>
      ) : null}

      <div className="relative">
      <div className="g-table-wrap">
        <div className="g-table-toolbar">
          <div className="g-filters">
            <label className="relative block min-w-[160px] flex-1">
              <IconSearch className="pointer-events-none absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                className="g-input pl-8"
                placeholder="Buscar"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </label>
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
              <span className="g-label">Producto</span>
              <select className="g-input" value={producto} onChange={(e) => setProducto(e.target.value)}>
                <option>Todos</option>
                {nombres.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
          </div>
          <ColumnPicker cols={cols.cols} isVisible={cols.isVisible} onToggle={cols.toggle} />
        </div>
        <div className="g-table-scroll">
          <table className="g-table">
            <thead>
              <tr>
                {cols.isVisible("codigo") ? <th>Código</th> : null}
                {cols.isVisible("categoria") ? <th>Categoría</th> : null}
                {cols.isVisible("producto") ? <th>Producto</th> : null}
                {cols.isVisible("version") ? <th>Versión</th> : null}
                {cols.isVisible("capacidad") ? <th>Capacidad</th> : null}
                {cols.isVisible("mp") ? <th>Costo MP $/Tn</th> : null}
                {cols.isVisible("fazon") ? <th>Fazón $/Tn</th> : null}
                {cols.isVisible("total") ? <th>Costo $/Tn</th> : null}
                {cols.isVisible("acciones") ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {filtradas.length ? (
                filtradas.map((f) => (
                  <tr
                    key={f.clave}
                    className={detalleClave === f.clave ? "g-row-active" : undefined}
                    onClick={() => setDetalleClave(f.clave)}
                  >
                    {cols.isVisible("codigo") ? <td className="tabular-nums">{f.codigo || "—"}</td> : null}
                    {cols.isVisible("categoria") ? <td>{f.categoria || "—"}</td> : null}
                    {cols.isVisible("producto") ? <td>{f.producto}</td> : null}
                    {cols.isVisible("version") ? <td className="tabular-nums">{f.version}</td> : null}
                    {cols.isVisible("capacidad") ? (
                      <td className="tabular-nums">{textoCapacidad(f.capacidad_kg)}</td>
                    ) : null}
                    {cols.isVisible("mp") ? <td className="tabular-nums">{textoDinero(f.costo_mp_tn)}</td> : null}
                    {cols.isVisible("fazon") ? (
                      <td className="tabular-nums">{textoDinero(f.costo_fazon_tn)}</td>
                    ) : null}
                    {cols.isVisible("total") ? <td className="tabular-nums">{textoDinero(f.costo_tn)}</td> : null}
                    {cols.isVisible("acciones") ? (
                      <td className="flex items-center gap-1">
                        <RowDetailButton onClick={() => setDetalleClave(f.clave)} />
                        {puedeEditar ? (
                          <button
                            type="button"
                            className="g-btn g-btn-icon h-7 w-7"
                            title="Cotizar"
                            onClick={(e) => {
                              e.stopPropagation();
                              abrirCotizar(f);
                            }}
                          >
                            <IconPlus className="h-4 w-4" />
                          </button>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="text-[var(--color-text-muted)]">
                    No hay productos con receta activa y fazón de la categoría mayor a $ 0,00.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
        {detalle ? (
          <RecordDetailDrawer
            heading="Producto"
            title={detalle.producto}
            badge={<span className="g-badge g-badge-neutral">v{detalle.version}</span>}
            onClose={() => setDetalleClave(null)}
          >
            <dl className="mb-3 space-y-1 text-[13px]">
              <Fila label="Código" valor={detalle.codigo || "—"} />
              <Fila label="Categoría" valor={detalle.categoria || "—"} />
              <Fila label="Envase" valor={detalle.envase || "—"} />
              <Fila label="Capacidad" valor={textoCapacidad(detalle.capacidad_kg)} />
              <Fila label="Costo MP $/Tn" valor={textoDinero(detalle.costo_mp_tn)} />
              <Fila label="Fazón $/Tn" valor={textoDinero(detalle.costo_fazon_tn)} />
              <Fila label="Costo $/Tn" valor={textoDinero(detalle.costo_tn)} />
            </dl>
            {detalle.lineas_sin_costo > 0 ? (
              <p className="mb-2 text-[12px] text-[var(--color-warning)]">
                {detalle.lineas_sin_costo} ingrediente{detalle.lineas_sin_costo === 1 ? "" : "s"} sin costo.
              </p>
            ) : null}
            <p className="mb-1 text-[11px] font-medium text-[var(--color-text-muted)]">Receta</p>
            <table className="g-table mb-3 text-[12px]">
              <thead>
                <tr>
                  <th>Ingrediente</th>
                  <th>%</th>
                  <th>$/Tn</th>
                </tr>
              </thead>
              <tbody>
                {detalle.lineas.map((l) => (
                  <tr key={`${l.id_ingrediente}-${l.nombre}`}>
                    <td>{l.nombre || "—"}</td>
                    <td className="tabular-nums">{nroVisible(l.participacion_pct, 2)}</td>
                    <td className="tabular-nums">{textoDinero(l.costo_linea_tn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {detalle.otras_presentaciones.length ? (
              <>
                <p className="mb-1 text-[11px] font-medium text-[var(--color-text-muted)]">
                  Otras capacidades de la categoría
                </p>
                <table className="g-table text-[12px]">
                  <thead>
                    <tr>
                      <th>Capacidad</th>
                      <th>Fazón</th>
                      <th>Total $/Tn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalle.otras_presentaciones.map((p) => (
                      <tr key={p.capacidad_kg}>
                        <td>{textoCapacidad(p.capacidad_kg)}</td>
                        <td className="tabular-nums">{textoDinero(p.costo_fazon_tn)}</td>
                        <td className="tabular-nums">{textoDinero(p.costo_tn)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : null}
          </RecordDetailDrawer>
        ) : null}
      </div>

      <p className="g-section-title">Cotizaciones guardadas</p>
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
                {colsReg.isVisible("producto") ? <th>Producto</th> : null}
                {colsReg.isVisible("tn") ? <th>Tn</th> : null}
                {colsReg.isVisible("total") ? <th>Total</th> : null}
                {colsReg.isVisible("usuario") ? <th>Usuario</th> : null}
                {colsReg.isVisible("acciones") ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {guardadas.length ? (
                guardadas.map((g) => (
                  <tr
                    key={g.id}
                    className={detalleGuardada === g.id ? "g-row-active" : undefined}
                    onClick={() => setDetalleGuardada(g.id)}
                  >
                    {colsReg.isVisible("fecha") ? <td>{fechaHoraVisible(g.fecha_hora_registro)}</td> : null}
                    {colsReg.isVisible("producto") ? (
                      <td>
                        {g.producto} <span className="text-[var(--color-text-muted)]">v{g.version}</span>
                      </td>
                    ) : null}
                    {colsReg.isVisible("tn") ? <td className="tabular-nums">{nroVisible(g.toneladas, 2)}</td> : null}
                    {colsReg.isVisible("total") ? <td className="tabular-nums">{textoDinero(g.total)}</td> : null}
                    {colsReg.isVisible("usuario") ? <td>{g.usuario}</td> : null}
                    {colsReg.isVisible("acciones") ? (
                      <td className="flex items-center gap-1">
                        <RowDetailButton onClick={() => setDetalleGuardada(g.id)} />
                        <button
                          type="button"
                          className="g-btn g-btn-icon h-7 w-7"
                          title="PDF"
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirPdfGuardada(g);
                          }}
                        >
                          <IconDownload className="h-4 w-4" />
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-[var(--color-text-muted)]">
                    Todavía no hay cotizaciones de producto guardadas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
        {guardada ? (
          <RecordDetailDrawer
            heading="Cotización guardada"
            title={guardada.producto}
            onClose={() => setDetalleGuardada(null)}
          >
            <dl className="mb-3 space-y-1 text-[13px]">
              <Fila label="Fecha" valor={fechaHoraVisible(guardada.fecha_hora_registro)} />
              <Fila label="Usuario" valor={guardada.usuario} />
              <Fila label="Versión" valor={String(guardada.version)} />
              <Fila label="Capacidad" valor={textoCapacidad(guardada.capacidad_kg)} />
              <Fila label="Toneladas" valor={nroVisible(guardada.toneladas, 2)} />
              <Fila label="Costo MP $/Tn" valor={textoDinero(guardada.costo_mp_tn)} />
              <Fila label="Fazón $/Tn" valor={textoDinero(guardada.costo_fazon_tn)} />
              <Fila label="Costo $/Tn" valor={textoDinero(guardada.costo_tn)} />
              <Fila label="Total" valor={textoDinero(guardada.total)} />
            </dl>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              Snapshot inmutable. No cambia si después se actualizan recetas o listas de costo.
            </p>
          </RecordDetailDrawer>
        ) : null}
      </div>

      {exportar ? (
        <DialogoInforme
          titulo="Costos de productos"
          nombreInicial={`Cotizaciones productos ${fechaArchivo()}`}
          hoja="Productos"
          encabezados={[...ENCABEZADOS_INFORME_PRODUCTOS]}
          filas={filasInformeProductos(filtradas)}
          onExcel={(nombre) => descargarExcelCotizacionProductos(nombre, filasInformeProductos(filtradas))}
          onCerrar={() => setExportar(false)}
        />
      ) : null}
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
