"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconPlus, IconSearch } from "@/components/ui/icons";
import { ColumnPicker } from "@/components/ui/column-picker";
import {
  RecordDetailDrawer,
  RowDeleteButton,
  RowDetailButton,
  RowEditButton,
} from "@/components/ui/record-detail";
import { useColumnVisibility } from "@/components/ui/use-column-visibility";
import {
  eliminarLinea,
  eliminarVersion,
  guardarLinea,
  guardarVersion,
} from "@/app/recetas/actions";
import {
  DatosLineaForm,
  DatosVersionForm,
  ESTADO_ACTIVO,
  LineaReceta,
  OpcionIngrediente,
  OpcionProducto,
  VersionVista,
  etiquetaOpcion,
  filtrarVersiones,
  hoyIso,
  pctTexto,
  resumenVersiones,
  siguienteNumero,
} from "@/lib/recetas/logic";
import { aFecha, fechaVisible } from "@/lib/solicitudes/logic";

const COLS = [
  { id: "codigo", label: "Código" },
  { id: "producto", label: "Producto" },
  { id: "version", label: "Versión" },
  { id: "estado", label: "Estado" },
  { id: "lineas", label: "Líneas" },
  { id: "formula", label: "Fórmula" },
  { id: "acciones", label: "Acciones", locked: true },
];

function versionVacia(): DatosVersionForm {
  return {
    fecha_registro: hoyIso(),
    id_producto: "",
    version: "",
    estado: "Activo",
  };
}

function versionDesde(item: VersionVista): DatosVersionForm {
  return {
    fecha_registro: aFecha(item.fecha_registro) ?? hoyIso(),
    id_producto: item.id_producto != null ? String(item.id_producto) : "",
    version: item.numero ? String(item.numero) : "",
    estado: item.estado_etiqueta === "Inactivo" ? "Inactivo" : "Activo",
  };
}

function lineaVacia(idVersion: number): DatosLineaForm {
  return {
    fecha_registro: hoyIso(),
    id_version: idVersion,
    id_ingrediente: "",
    tipo: "macro",
    puesto: "",
    participacion: "",
  };
}

function lineaDesde(linea: LineaReceta): DatosLineaForm {
  return {
    fecha_registro: aFecha(linea.fecha_registro) ?? hoyIso(),
    id_version: linea.id_version,
    id_ingrediente: linea.id_ingrediente != null ? String(linea.id_ingrediente) : "",
    tipo: linea.tipo === "micro" ? "micro" : "macro",
    puesto: linea.puesto ? String(linea.puesto) : "",
    participacion: linea.participacion > 0 ? String(linea.participacion_pct) : "",
  };
}

export function RecetasClient({
  versiones,
  productos,
  ingredientes,
  errorCarga,
  puedeEditar,
}: {
  versiones: VersionVista[];
  productos: OpcionProducto[];
  ingredientes: OpcionIngrediente[];
  errorCarga: string | null;
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [producto, setProducto] = useState("Todos");
  const [estado, setEstado] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [soloSinFormula, setSoloSinFormula] = useState(false);
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [formVersion, setFormVersion] = useState<DatosVersionForm | null>(null);
  const [idVersion, setIdVersion] = useState<number | undefined>(undefined);
  const [formLinea, setFormLinea] = useState<DatosLineaForm | null>(null);
  const [idLinea, setIdLinea] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const nombres = useMemo(() => {
    const set = new Set(versiones.map((v) => v.producto).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [versiones]);

  const baseKpi = useMemo(
    () =>
      filtrarVersiones(versiones, {
        producto,
        estado: "Todos",
        busqueda,
        soloSinFormula: false,
      }),
    [versiones, producto, busqueda],
  );
  const filtradas = useMemo(
    () =>
      filtrarVersiones(versiones, {
        producto,
        estado,
        busqueda,
        soloSinFormula,
      }),
    [versiones, producto, estado, busqueda, soloSinFormula],
  );
  const resumen = useMemo(() => resumenVersiones(baseKpi), [baseKpi]);
  const detalle = filtradas.find((v) => v.id === detalleId) ?? versiones.find((v) => v.id === detalleId) ?? null;
  const cols = useColumnVisibility("recetas", COLS);
  const show = cols.isVisible;

  const ingsForm = useMemo(() => {
    const actual = formLinea ? Number(formLinea.id_ingrediente) : NaN;
    return ingredientes.filter((i) => i.activo || i.id === actual);
  }, [ingredientes, formLinea]);

  function abrirNueva() {
    setFormLinea(null);
    setIdLinea(undefined);
    setIdVersion(undefined);
    setFormVersion(versionVacia());
    setError(null);
  }

  function abrirEditar(item: VersionVista) {
    setFormLinea(null);
    setIdLinea(undefined);
    setIdVersion(item.id);
    setFormVersion(versionDesde(item));
    setError(null);
  }

  function abrirLinea(idVer: number, linea?: LineaReceta) {
    setFormVersion(null);
    setIdVersion(undefined);
    setIdLinea(linea?.id);
    setFormLinea(linea ? lineaDesde(linea) : lineaVacia(idVer));
    setDetalleId(idVer);
    setError(null);
  }

  function onProductoForm(id: string) {
    if (!formVersion) return;
    const nro =
      idVersion == null && id
        ? String(siguienteNumero(versiones, Number(id)))
        : formVersion.version;
    setFormVersion({ ...formVersion, id_producto: id, version: nro });
  }

  function onGuardarVersion(e: FormEvent) {
    e.preventDefault();
    if (!formVersion) return;
    setError(null);
    setAviso(null);
    startTransition(async () => {
      try {
        await guardarVersion(formVersion, idVersion);
        setAviso(idVersion ? "Versión actualizada." : "Versión creada.");
        setFormVersion(null);
        setIdVersion(undefined);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar");
      }
    });
  }

  function onGuardarLinea(e: FormEvent) {
    e.preventDefault();
    if (!formLinea) return;
    setError(null);
    setAviso(null);
    startTransition(async () => {
      try {
        await guardarLinea(formLinea, idLinea);
        setAviso(idLinea ? "Ingrediente actualizado." : "Ingrediente agregado a la fórmula.");
        setFormLinea(null);
        setIdLinea(undefined);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar");
      }
    });
  }

  function onEliminarVersion(item: VersionVista) {
    const extra = item.lineas.length
      ? `\nTambién se van a borrar ${item.lineas.length} línea${item.lineas.length === 1 ? "" : "s"} de fórmula.`
      : "";
    if (
      !confirm(
        `¿Eliminar la versión ${item.numero} de ${item.producto || item.id}?${extra}`,
      )
    ) {
      return;
    }
    setError(null);
    setAviso(null);
    startTransition(async () => {
      try {
        await eliminarVersion(item.id, item.lineas.length);
        if (detalleId === item.id) setDetalleId(null);
        setAviso("Versión eliminada.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo eliminar");
      }
    });
  }

  function onEliminarLinea(linea: LineaReceta) {
    const nombre = linea.ingrediente || `id ${linea.id}`;
    if (!confirm(`¿Quitar ${nombre} de la fórmula?`)) return;
    setError(null);
    setAviso(null);
    startTransition(async () => {
      try {
        await eliminarLinea(linea.id);
        setAviso("Ingrediente quitado de la fórmula.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo quitar");
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
          <h1 className="g-page-title">Recetas</h1>
          <p className="g-page-subtitle">
            Cada versión de un producto tiene su fórmula. Los ingredientes y la
            participación se ven en el detalle.
          </p>
        </div>
        {puedeEditar ? (
          <button type="button" className="g-btn g-btn-primary" onClick={abrirNueva}>
            <IconPlus className="h-4 w-4" />
            Nueva versión
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Kpi titulo="Total" valor={String(resumen.total)} pie="Versiones registradas" />
        <Kpi titulo="Activas" valor={String(resumen.activas)} pie="Listas para usar" />
        <Kpi titulo="Inactivas" valor={String(resumen.inactivas)} pie="Fuera de uso" tono="muted" />
        <Kpi
          titulo="Sin fórmula"
          valor={String(resumen.sin_formula)}
          pie="Todavía sin ingredientes"
          tono="warning"
        />
      </div>

      {formVersion ? (
        <form className="g-card space-y-3 p-3" onSubmit={onGuardarVersion}>
          <p className="g-section-title">{idVersion ? "Editar versión" : "Nueva versión"}</p>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <label className="col-span-2 block">
              <span className="g-label">Producto</span>
              <select
                className="g-input"
                value={formVersion.id_producto}
                onChange={(e) => onProductoForm(e.target.value)}
                required
              >
                <option value="">Elegí un producto</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {etiquetaOpcion(p.codigo, p.nombre)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="g-label">Número de versión</span>
              <input
                className="g-input"
                inputMode="numeric"
                value={formVersion.version}
                onChange={(e) => setFormVersion({ ...formVersion, version: e.target.value })}
                required
              />
            </label>
            <label className="block">
              <span className="g-label">Estado</span>
              <select
                className="g-input"
                value={formVersion.estado}
                onChange={(e) => setFormVersion({ ...formVersion, estado: e.target.value })}
              >
                <option>Activo</option>
                <option>Inactivo</option>
              </select>
            </label>
            <label className="block">
              <span className="g-label">Fecha de registro</span>
              <input
                type="date"
                className="g-input"
                value={aFecha(formVersion.fecha_registro) ?? ""}
                onChange={(e) =>
                  setFormVersion({ ...formVersion, fecha_registro: e.target.value })
                }
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="g-btn g-btn-secondary" onClick={() => setFormVersion(null)}>
              Cancelar
            </button>
            <button type="submit" className="g-btn g-btn-primary" disabled={pending}>
              Guardar
            </button>
          </div>
        </form>
      ) : null}

      {formLinea ? (
        <form className="g-card space-y-3 p-3" onSubmit={onGuardarLinea}>
          <p className="g-section-title">
            {idLinea ? "Editar ingrediente" : "Agregar ingrediente"}
          </p>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <label className="col-span-2 block">
              <span className="g-label">Ingrediente</span>
              <select
                className="g-input"
                value={formLinea.id_ingrediente}
                onChange={(e) =>
                  setFormLinea({ ...formLinea, id_ingrediente: e.target.value })
                }
                required
              >
                <option value="">Elegí un ingrediente</option>
                {ingsForm.map((i) => (
                  <option key={i.id} value={i.id}>
                    {etiquetaOpcion(i.codigo, i.nombre)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="g-label">Tipo</span>
              <select
                className="g-input"
                value={formLinea.tipo}
                onChange={(e) => setFormLinea({ ...formLinea, tipo: e.target.value })}
              >
                <option value="macro">Macro</option>
                <option value="micro">Micro</option>
              </select>
            </label>
            <label className="block">
              <span className="g-label">Puesto</span>
              <input
                className="g-input"
                inputMode="numeric"
                value={formLinea.puesto}
                onChange={(e) => setFormLinea({ ...formLinea, puesto: e.target.value })}
                required
              />
            </label>
            <label className="block">
              <span className="g-label">Participación (%)</span>
              <input
                className="g-input"
                inputMode="decimal"
                value={formLinea.participacion}
                onChange={(e) =>
                  setFormLinea({ ...formLinea, participacion: e.target.value })
                }
                required
              />
            </label>
            <label className="block">
              <span className="g-label">Fecha de registro</span>
              <input
                type="date"
                className="g-input"
                value={aFecha(formLinea.fecha_registro) ?? ""}
                onChange={(e) =>
                  setFormLinea({ ...formLinea, fecha_registro: e.target.value })
                }
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="g-btn g-btn-secondary" onClick={() => setFormLinea(null)}>
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
                <span className="g-label">Producto</span>
                <select className="g-input" value={producto} onChange={(e) => setProducto(e.target.value)}>
                  <option>Todos</option>
                  {nombres.map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="g-label">Estado</span>
                <select className="g-input" value={estado} onChange={(e) => setEstado(e.target.value)}>
                  <option>Todos</option>
                  <option>Activo</option>
                  <option>Inactivo</option>
                </select>
              </label>
              <label>
                <span className="g-label">Buscar</span>
                <div className="relative">
                  <IconSearch className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
                  <input
                    className="g-input pl-7"
                    placeholder="Producto, código, ingrediente…"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                </div>
              </label>
              <label className="g-filters-fit flex h-[var(--control-height)] items-center gap-1.5 text-[12.5px] text-[var(--color-text-secondary)]">
                <input
                  type="checkbox"
                  checked={soloSinFormula}
                  onChange={(e) => setSoloSinFormula(e.target.checked)}
                />
                Solo sin fórmula
              </label>
            </div>
            <ColumnPicker cols={cols.cols} isVisible={cols.isVisible} onToggle={cols.toggle} />
          </div>
          <div className="g-table-scroll">
            <table className="g-table">
              <thead>
                <tr>
                  {show("codigo") ? <th>Código</th> : null}
                  {show("producto") ? <th>Producto</th> : null}
                  {show("version") ? <th>Versión</th> : null}
                  {show("estado") ? <th>Estado</th> : null}
                  {show("lineas") ? <th>Líneas</th> : null}
                  {show("formula") ? <th>Fórmula</th> : null}
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-[var(--color-text-muted)]">
                      {versiones.length === 0
                        ? "No hay versiones registradas."
                        : "No se encontraron versiones con los filtros seleccionados."}
                    </td>
                  </tr>
                ) : (
                  filtradas.map((item) => (
                    <tr key={item.id} className={detalleId === item.id ? "g-row-active" : ""}>
                      {show("codigo") ? <td>{item.codigo_producto || "Pendiente"}</td> : null}
                      {show("producto") ? (
                        <td className="font-medium">{item.producto || "—"}</td>
                      ) : null}
                      {show("version") ? (
                        <td className="tabular-nums">{item.numero || "—"}</td>
                      ) : null}
                      {show("estado") ? (
                        <td>
                          <span
                            className={
                              item.estado === ESTADO_ACTIVO
                                ? "g-badge g-badge-success"
                                : "g-badge g-badge-neutral"
                            }
                          >
                            {item.estado_etiqueta}
                          </span>
                        </td>
                      ) : null}
                      {show("lineas") ? (
                        <td className="tabular-nums">{item.lineas.length}</td>
                      ) : null}
                      {show("formula") ? (
                        <td className="tabular-nums">
                          {item.lineas.length === 0 ? "—" : pctTexto(item.participacion_total)}
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
                                onClick={() => onEliminarVersion(item)}
                              />
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
            heading="Detalle de receta"
            title={detalle.producto || "Versión"}
            badge={
              <span className="g-badge g-badge-success">
                {detalle.numero ? `v${detalle.numero}` : "—"}
              </span>
            }
            onClose={() => setDetalleId(null)}
          >
            <dl className="space-y-1 text-[13px]">
              <Fila label="Producto" valor={detalle.producto || "—"} />
              <Fila label="Código" valor={detalle.codigo_producto || "Pendiente"} />
              <Fila label="Versión" valor={detalle.numero ? String(detalle.numero) : "—"} />
              <Fila label="Estado" valor={detalle.estado_etiqueta} />
              <Fila label="Fecha registro" valor={fechaVisible(aFecha(detalle.fecha_registro))} />
              <Fila label="Líneas" valor={String(detalle.lineas.length)} />
              <Fila
                label="Participación total"
                valor={detalle.lineas.length === 0 ? "—" : pctTexto(detalle.participacion_total)}
              />
              <Fila label="Id" valor={String(detalle.id)} />
            </dl>
            <div className="mt-3 mb-1 flex items-center justify-between gap-2">
              <p className="text-[12px] font-semibold">Fórmula</p>
              {puedeEditar ? (
                <button
                  type="button"
                  className="g-btn g-btn-primary h-7 px-2 text-[12px]"
                  onClick={() => abrirLinea(detalle.id)}
                >
                  <IconPlus className="h-3.5 w-3.5" />
                  Ingrediente
                </button>
              ) : null}
            </div>
            {detalle.lineas.length === 0 ? (
              <p className="text-[12.5px] text-[var(--color-text-muted)]">
                Esta versión todavía no tiene ingredientes en la fórmula.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {detalle.lineas.map((linea) => (
                  <li
                    key={linea.id}
                    className="rounded-[var(--radius-md)] bg-[var(--color-surface-secondary)] px-2 py-1.5"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-[12.5px] font-medium">
                        {linea.codigo_ingrediente
                          ? `${linea.codigo_ingrediente} — ${linea.ingrediente}`
                          : linea.ingrediente || "—"}
                      </p>
                      {puedeEditar ? (
                        <span className="flex shrink-0">
                          <RowEditButton onClick={() => abrirLinea(detalle.id, linea)} />
                          <RowDeleteButton
                            disabled={pending}
                            onClick={() => onEliminarLinea(linea)}
                          />
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      {linea.tipo_etiqueta} · Puesto {linea.puesto || "—"} ·{" "}
                      {pctTexto(linea.participacion_pct)}
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
