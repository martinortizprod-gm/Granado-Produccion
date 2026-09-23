"use client";

import { FormEvent, ReactNode, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconDownload, IconPlus, IconSearch } from "@/components/ui/icons";
import { DialogoInforme } from "@/components/ui/informe";
import { ColumnPicker } from "@/components/ui/column-picker";
import {
  DetalleFilas,
  RecordDetailDrawer,
  RowDeleteButton,
  RowDetailButton,
  RowEditButton,
} from "@/components/ui/record-detail";
import {
  useColumnVisibility,
  type ColDef,
} from "@/components/ui/use-column-visibility";
import { eliminarCatalogo, guardarCatalogo } from "@/app/catalogo/actions";
import {
  ArticuloVista,
  CATALOGOS,
  DatosCatalogoForm,
  KindCatalogo,
  ConfigCatalogo,
  filtrarArticulos,
  resumenArticulos,
  unicos,
} from "@/lib/catalogos/logic";
import { aFecha, fechaVisible } from "@/lib/solicitudes/logic";

function hoyIso() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dia}`;
}

function fechaArchivo() {
  const iso = hoyIso();
  return `${iso.slice(8, 10)}-${iso.slice(5, 7)}-${iso.slice(0, 4)}`;
}

function encabezadosCatalogo(cfg: ConfigCatalogo) {
  const columnas = ["Código", cfg.etiquetaItem, "Categoría", "Gestión", "Medida"];
  if (cfg.etiquetaExtra) columnas.push(cfg.etiquetaExtra);
  columnas.push("Estado", "Stock");
  return columnas;
}

function filaCatalogoInforme(cfg: ConfigCatalogo, item: ArticuloVista): (string | number | null)[] {
  const fila: (string | number | null)[] = [item.codigo, item.nombre, item.categoria, item.gestion, item.medida];
  if (cfg.etiquetaExtra) fila.push(item.extra);
  fila.push(item.estado_etiqueta, item.stock);
  return fila;
}

function nroStock(valor: number) {
  const n = Number(valor) || 0;
  if (Math.abs(n - Math.round(n)) < 0.05) {
    return Math.round(n).toLocaleString("es-AR");
  }
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function vacio(cfgUnidad: string): DatosCatalogoForm {
  return {
    fecha_registro: hoyIso(),
    codigo: "",
    nombre: "",
    categoria: "",
    gestion: "",
    medida: cfgUnidad,
    estado: "Activo",
    extra: "",
  };
}

function desdeArticulo(item: ArticuloVista, extraEsNumero?: boolean): DatosCatalogoForm {
  return {
    fecha_registro: aFecha(item.fecha_registro) ?? hoyIso(),
    codigo: item.codigo,
    nombre: item.nombre,
    categoria: item.categoria,
    gestion: item.gestion,
    medida: item.medida,
    estado: item.estado_etiqueta,
    extra: extraEsNumero
      ? item.extra_numero > 0
        ? String(item.extra_numero)
        : ""
      : item.extra,
  };
}

export function CatalogoClient({
  kind,
  articulos,
  errorCarga,
  puedeEditar,
}: {
  kind: KindCatalogo;
  articulos: ArticuloVista[];
  errorCarga: string | null;
  puedeEditar: boolean;
}) {
  const cfg = CATALOGOS[kind];
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [estado, setEstado] = useState("Todos");
  const [categoria, setCategoria] = useState("Todos");
  const [gestion, setGestion] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [soloSinStock, setSoloSinStock] = useState(false);
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [form, setForm] = useState<DatosCatalogoForm | null>(null);
  const [idEdicion, setIdEdicion] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [exportar, setExportar] = useState(false);

  const categorias = useMemo(() => unicos(articulos, "categoria"), [articulos]);
  const gestiones = useMemo(() => unicos(articulos, "gestion"), [articulos]);
  const medidas = useMemo(() => {
    const set = new Set(articulos.map((a) => a.medida).filter(Boolean));
    if (cfg.unidad) set.add(cfg.unidad);
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [articulos, cfg.unidad]);

  const baseKpi = useMemo(
    () =>
      filtrarArticulos(articulos, cfg, {
        estado: "Todos",
        categoria,
        gestion,
        busqueda,
        soloSinStock: false,
      }),
    [articulos, cfg, categoria, gestion, busqueda],
  );
  const filtrados = useMemo(
    () =>
      filtrarArticulos(articulos, cfg, {
        estado,
        categoria,
        gestion,
        busqueda,
        soloSinStock,
      }),
    [articulos, cfg, estado, categoria, gestion, busqueda, soloSinStock],
  );
  const resumen = useMemo(
    () => resumenArticulos(baseKpi, cfg.stockMinimo),
    [baseKpi, cfg.stockMinimo],
  );
  const detalle = filtrados.find((a) => a.id === detalleId) ?? null;

  const colsDef = useMemo(() => {
    const cols: ColDef[] = [
      { id: "codigo", label: "Código" },
      { id: "nombre", label: cfg.etiquetaItem },
      { id: "categoria", label: "Categoría" },
      { id: "gestion", label: "Gestión" },
      { id: "medida", label: "Medida" },
    ];
    if (cfg.campoExtra) {
      cols.push({ id: "extra", label: cfg.etiquetaExtra || "Extra" });
    }
    cols.push(
      { id: "estado", label: "Estado" },
      { id: "stock", label: "Stock" },
      { id: "acciones", label: "Acciones", locked: true },
    );
    return cols;
  }, [cfg]);
  const cols = useColumnVisibility(kind, colsDef);
  const show = cols.isVisible;

  function abrirNuevo() {
    setIdEdicion(undefined);
    setForm(vacio(cfg.unidad));
    setError(null);
  }

  function abrirEditar(item: ArticuloVista) {
    setIdEdicion(item.id);
    setForm(desdeArticulo(item, cfg.extraEsNumero));
    setError(null);
  }

  function onGuardar(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    setAviso(null);
    startTransition(async () => {
      try {
        await guardarCatalogo(kind, form, idEdicion);
        setAviso(idEdicion ? "Cambios guardados." : "Registro creado.");
        setForm(null);
        setIdEdicion(undefined);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar");
      }
    });
  }

  function onEliminar(item: ArticuloVista) {
    const art = cfg.genero === "f" ? "esta" : "este";
    if (!confirm(`¿Eliminar ${art} ${cfg.etiquetaItem.toLowerCase()} ${item.nombre || item.codigo}?`)) {
      return;
    }
    setError(null);
    setAviso(null);
    startTransition(async () => {
      try {
        await eliminarCatalogo(kind, item.id);
        if (detalleId === item.id) setDetalleId(null);
        setAviso("Registro eliminado.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo eliminar");
      }
    });
  }

  const nuevo =
    cfg.genero === "f"
      ? `Nueva ${cfg.etiquetaItem.toLowerCase()}`
      : `Nuevo ${cfg.etiquetaItem.toLowerCase()}`;

  return (
    <div className="g-stack">
      {errorCarga ? <p className="g-alert g-alert-danger">{errorCarga}</p> : null}
      {error ? <p className="g-alert g-alert-danger">{error}</p> : null}
      {aviso ? <p className="g-alert g-alert-success">{aviso}</p> : null}

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="g-page-title">{cfg.titulo}</h1>
          <p className="g-page-subtitle">{cfg.subtitulo}</p>
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
              {nuevo}
            </button>
          ) : null}
        </div>
      </div>

      {exportar ? (
        <DialogoInforme
          titulo={`Stock de ${cfg.titulo.toLowerCase()}`}
          nombreInicial={`Stock ${cfg.titulo.toLowerCase()} ${fechaArchivo()}`}
          hoja="Stock"
          encabezados={encabezadosCatalogo(cfg)}
          filas={filtrados.map((item) => filaCatalogoInforme(cfg, item))}
          onCerrar={() => setExportar(false)}
        />
      ) : null}

      <div className="g-kpis grid grid-cols-2 gap-2 md:grid-cols-4">
        <Kpi titulo="Total" valor={String(resumen.total)} pie="Registrados" />
        <Kpi titulo="Activos" valor={String(resumen.activos)} pie="Disponibles para usar" />
        <Kpi titulo="Inactivos" valor={String(resumen.inactivos)} pie="Fuera de uso" tono="muted" />
        <Kpi
          titulo="Sin stock"
          valor={String(resumen.sin_stock)}
          pie={`Stock total ${nroStock(resumen.stock_total)} ${cfg.unidad}`}
          tono="warning"
        />
      </div>

      {form ? (
        <form className="g-card space-y-3 p-3" onSubmit={onGuardar}>
          <p className="g-section-title">
            {idEdicion ? `Editar ${cfg.etiquetaItem.toLowerCase()}` : nuevo}
          </p>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Campo label="Código">
              <input
                className="g-input"
                value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                required
              />
            </Campo>
            <Campo label={cfg.etiquetaItem}>
              <input
                className="g-input"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                required
              />
            </Campo>
            <Campo label="Fecha de registro">
              <input
                type="date"
                className="g-input"
                value={aFecha(form.fecha_registro) ?? ""}
                onChange={(e) => setForm({ ...form, fecha_registro: e.target.value })}
                required
              />
            </Campo>
            <Campo label="Estado">
              <select
                className="g-input"
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value })}
              >
                <option>Activo</option>
                <option>Inactivo</option>
              </select>
            </Campo>
            <Campo label="Categoría">
              <input
                className="g-input"
                list={`${kind}-cat`}
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              />
              <datalist id={`${kind}-cat`}>
                {categorias.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Campo>
            <Campo label="Gestión">
              <input
                className="g-input"
                list={`${kind}-ges`}
                value={form.gestion}
                onChange={(e) => setForm({ ...form, gestion: e.target.value })}
              />
              <datalist id={`${kind}-ges`}>
                {gestiones.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Campo>
            <Campo label="Medida">
              <input
                className="g-input"
                list={`${kind}-med`}
                value={form.medida}
                onChange={(e) => setForm({ ...form, medida: e.target.value })}
              />
              <datalist id={`${kind}-med`}>
                {medidas.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Campo>
            {cfg.campoExtra ? (
              <Campo label={cfg.etiquetaExtra || "Extra"}>
                <input
                  className="g-input"
                  inputMode={cfg.extraEsNumero ? "decimal" : "text"}
                  value={form.extra}
                  onChange={(e) => setForm({ ...form, extra: e.target.value })}
                />
              </Campo>
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="g-btn g-btn-secondary"
              onClick={() => setForm(null)}
            >
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
              <div className="relative">
                <IconSearch className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input
                  className="g-input pl-7"
                  placeholder="Buscar código, nombre…"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
              <select
                className="g-input"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
              >
                <option>Todos</option>
                <option>Activos</option>
                <option>Inactivos</option>
              </select>
              <select
                className="g-input"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
              >
                <option>Todos</option>
                {categorias.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <select
                className="g-input"
                value={gestion}
                onChange={(e) => setGestion(e.target.value)}
              >
                <option>Todos</option>
                {gestiones.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <label className="g-filters-fit flex h-[var(--control-height)] items-center gap-1.5 text-[12.5px] text-[var(--color-text-secondary)]">
                <input
                  type="checkbox"
                  checked={soloSinStock}
                  onChange={(e) => setSoloSinStock(e.target.checked)}
                />
                Solo sin stock
              </label>
            </div>
            <ColumnPicker cols={cols.cols} isVisible={cols.isVisible} onToggle={cols.toggle} />
          </div>
          <div className="g-table-scroll">
            <table className="g-table">
              <thead>
                <tr>
                  {show("codigo") ? <th>Código</th> : null}
                  {show("nombre") ? <th>{cfg.etiquetaItem}</th> : null}
                  {show("categoria") ? <th>Categoría</th> : null}
                  {show("gestion") ? <th>Gestión</th> : null}
                  {show("medida") ? <th>Medida</th> : null}
                  {cfg.campoExtra && show("extra") ? <th>{cfg.etiquetaExtra}</th> : null}
                  {show("estado") ? <th>Estado</th> : null}
                  {show("stock") ? <th>Stock</th> : null}
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-[var(--color-text-muted)]">
                      {articulos.length === 0
                        ? `No hay ${cfg.titulo.toLowerCase()} registrados.`
                        : "No se encontraron registros con los filtros seleccionados."}
                    </td>
                  </tr>
                ) : (
                  filtrados.map((item) => {
                    const bajo = item.stock < cfg.stockMinimo;
                    return (
                      <tr key={item.id} className={detalleId === item.id ? "g-row-active" : ""}>
                        {show("codigo") ? <td>{item.codigo || "—"}</td> : null}
                        {show("nombre") ? (
                          <td className="font-medium">{item.nombre || "—"}</td>
                        ) : null}
                        {show("categoria") ? <td>{item.categoria || "—"}</td> : null}
                        {show("gestion") ? <td>{item.gestion || "—"}</td> : null}
                        {show("medida") ? <td>{item.medida || "—"}</td> : null}
                        {cfg.campoExtra && show("extra") ? <td>{item.extra || "—"}</td> : null}
                        {show("estado") ? (
                          <td>
                            <span
                              className={
                                item.estado === "activo"
                                  ? "g-badge g-badge-success"
                                  : "g-badge g-badge-neutral"
                              }
                            >
                              {item.estado_etiqueta}
                            </span>
                          </td>
                        ) : null}
                        {show("stock") ? (
                          <td
                            className="tabular-nums font-medium"
                            style={{
                              color: bajo
                                ? "var(--color-warning)"
                                : "var(--color-primary)",
                            }}
                          >
                            {nroStock(item.stock)} {item.medida || cfg.unidad}
                          </td>
                        ) : null}
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
            heading={`Detalle de ${cfg.etiquetaItem.toLowerCase()}`}
            title={detalle.codigo || detalle.nombre || cfg.etiquetaItem}
            badge={
              <span
                className={
                  detalle.estado === "activo"
                    ? "g-badge g-badge-success"
                    : "g-badge g-badge-neutral"
                }
              >
                {detalle.estado_etiqueta}
              </span>
            }
            onClose={() => setDetalleId(null)}
          >
            <DetalleFilas
              filas={[
                { label: cfg.etiquetaItem, valor: detalle.nombre || "—" },
                { label: "Código", valor: detalle.codigo || "—" },
                { label: "Categoría", valor: detalle.categoria || "—" },
                { label: "Gestión", valor: detalle.gestion || "—" },
                { label: "Medida", valor: detalle.medida || cfg.unidad },
                { label: "Fecha registro", valor: fechaVisible(aFecha(detalle.fecha_registro)) },
                ...(cfg.campoExtra
                  ? [{ label: cfg.etiquetaExtra || "Extra", valor: detalle.extra || "—" }]
                  : []),
                { label: "Id", valor: String(detalle.id) },
              ]}
            />
            <p className="mt-3 mb-1 text-[12px] font-semibold">Stock</p>
            <dl className="space-y-1 text-[13px]">
              <FilaStock
                label="Stock actual"
                valor={`${nroStock(detalle.stock)} ${detalle.medida || cfg.unidad}`}
                bajo={detalle.stock < cfg.stockMinimo}
              />
              <FilaStock
                label="Ingresos"
                valor={`${nroStock(detalle.ingresos)} ${detalle.medida || cfg.unidad}`}
              />
              <FilaStock
                label="Egresos"
                valor={`${nroStock(detalle.egresos)} ${detalle.medida || cfg.unidad}`}
              />
              <FilaStock
                label="Consumo producción"
                valor={`${nroStock(detalle.produccion)} ${detalle.medida || cfg.unidad}`}
              />
            </dl>
            <p className="mt-3 mb-1 text-[12px] font-semibold">Lotes</p>
            {detalle.lotes.length === 0 ? (
              <p className="text-[12.5px] text-[var(--color-text-muted)]">
                Sin lotes con stock disponible.
              </p>
            ) : (
              <ul className="space-y-1 text-[12.5px]">
                {detalle.lotes.map((l) => (
                  <li key={l.lote} className="flex justify-between gap-2">
                    <span>
                      {l.lote}
                      {l.vencimiento ? (
                        <span className="text-[var(--color-text-muted)]">
                          {" "}
                          · vence {fechaVisible(aFecha(l.vencimiento))}
                        </span>
                      ) : null}
                    </span>
                    <span className="tabular-nums font-medium">
                      {nroStock(l.stock)} {detalle.medida || cfg.unidad}
                    </span>
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

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="g-label">{label}</span>
      {children}
    </label>
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
  tono?: "muted" | "warning";
}) {
  const color =
    tono === "warning"
      ? "var(--color-warning)"
      : tono === "muted"
        ? "var(--color-text-secondary)"
        : "var(--color-primary)";
  return (
    <div className="g-kpi">
      <p className="g-kpi-title">{titulo}</p>
      <p className="g-kpi-value" style={{ color }}>
        {valor}
      </p>
      <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">{pie}</p>
    </div>
  );
}

function FilaStock({
  label,
  valor,
  bajo,
}: {
  label: string;
  valor: string;
  bajo?: boolean;
}) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-[var(--color-text-muted)]">{label}</dt>
      <dd
        className="font-medium tabular-nums"
        style={{ color: bajo ? "var(--color-warning)" : undefined }}
      >
        {valor}
      </dd>
    </div>
  );
}
