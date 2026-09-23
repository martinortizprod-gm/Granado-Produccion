"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ESTADO_COMPLETADA,
  ProductoOpcion,
  SolicitudVista,
  colorEstado,
  fechaVisible,
  filtrarSolicitudes,
  nroVisible,
  resumenSolicitudes,
} from "@/lib/solicitudes/logic";
import { eliminarSolicitud } from "@/app/solicitudes/actions";
import { IconPlus } from "@/components/ui/icons";
import { ColumnPicker } from "@/components/ui/column-picker";
import {
  RecordDetailDrawer,
  RowDeleteButton,
  RowDetailButton,
  RowEditButton,
} from "@/components/ui/record-detail";
import { useColumnVisibility } from "@/components/ui/use-column-visibility";

type Props = {
  solicitudes: SolicitudVista[];
  productos: ProductoOpcion[];
  puedeEditar: boolean;
  errorCarga: string | null;
};

const COLS_SOLICITUDES = [
  { id: "estado", label: "Estado" },
  { id: "fecha", label: "Fecha fin" },
  { id: "lote", label: "Lote" },
  { id: "producto", label: "Producto" },
  { id: "version", label: "Versión" },
  { id: "oc", label: "OC / SAP" },
  { id: "solicitado", label: "Solicitado" },
  { id: "cargado", label: "Cargado" },
  { id: "pendiente", label: "Pendiente" },
  { id: "progreso", label: "Progreso" },
  { id: "acciones", label: "Acciones", locked: true },
];

export function SolicitudesClient({
  solicitudes,
  productos,
  puedeEditar,
  errorCarga,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [estado, setEstado] = useState("Todos");
  const [producto, setProducto] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [soloPendientes, setSoloPendientes] = useState(false);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [seleccionId, setSeleccionId] = useState<number | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cols = useColumnVisibility("solicitudes", COLS_SOLICITUDES);
  const show = cols.isVisible;

  const nombresProducto = useMemo(() => {
    const set = new Set(solicitudes.map((s) => s.producto).filter(Boolean));
    return ["Todos", ...Array.from(set).sort((a, b) => a.localeCompare(b, "es"))];
  }, [solicitudes]);

  const filtradas = useMemo(
    () =>
      filtrarSolicitudes(solicitudes, {
        estado,
        producto,
        busqueda,
        soloPendientes,
        fechaDesde: fechaDesde || null,
        fechaHasta: fechaHasta || null,
      }),
    [
      solicitudes,
      estado,
      producto,
      busqueda,
      soloPendientes,
      fechaDesde,
      fechaHasta,
    ],
  );

  const kpiBase = useMemo(
    () =>
      filtrarSolicitudes(solicitudes, {
        producto,
        busqueda,
        fechaDesde: fechaDesde || null,
        fechaHasta: fechaHasta || null,
      }),
    [solicitudes, producto, busqueda, fechaDesde, fechaHasta],
  );
  const resumen = resumenSolicitudes(kpiBase);

  const seleccion = filtradas.find((s) => s.id === seleccionId) ?? null;

  function onEliminar(item: SolicitudVista) {
    if (!puedeEditar || item.id == null) return;
    const msg = item.tiene_produccion
      ? `La solicitud ${item.lote} tiene producción asociada. Se eliminará la solicitud pero NO las jornadas de producción. ¿Continuar?`
      : `¿Eliminar la solicitud ${item.lote || item.id}?`;
    if (!confirm(msg)) return;
    setError(null);
    setAviso(null);
    startTransition(async () => {
      try {
        const r = await eliminarSolicitud(item.id!);
        setAviso(
          r.teniaProduccion
            ? "Solicitud eliminada. Las jornadas de producción quedaron sin vínculo."
            : "Solicitud eliminada.",
        );
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo eliminar");
      }
    });
  }

  return (
    <div className="g-stack">
      {errorCarga ? <p className="g-alert g-alert-danger">{errorCarga}</p> : null}
      {error ? <p className="g-alert g-alert-danger">{error}</p> : null}
      {aviso ? <p className="g-alert g-alert-success">{aviso}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="g-page-title">Solicitudes</h1>
          <p className="g-page-subtitle">
            Seguimiento de pedidos, avance y detalle operativo.
          </p>
        </div>
        {puedeEditar ? (
          <Link href="/solicitudes/nueva" className="g-btn g-btn-primary">
            <IconPlus className="h-4 w-4" />
            Nueva solicitud
          </Link>
        ) : null}
      </div>

      <div className="g-kpis grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi titulo="Total" valor={resumen.total} tono="primary" />
        <Kpi titulo="Pendientes" valor={resumen.pendientes} tono="muted" />
        <Kpi titulo="En producción" valor={resumen.en_produccion} tono="warning" />
        <Kpi titulo="Completadas" valor={resumen.completadas} tono="success" />
      </div>

      <div className="g-card px-3 py-2.5">
        <div className="g-filters">
          <label>
            <span className="g-label">Estado</span>
            <select
              className="g-input"
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
            >
              <option>Todos</option>
              <option>Pendientes</option>
              <option>En producción</option>
              <option>Completadas</option>
            </select>
          </label>
          <label>
            <span className="g-label">Producto</span>
            <select
              className="g-input"
              value={producto}
              onChange={(e) => setProducto(e.target.value)}
            >
              {nombresProducto.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="g-label">Desde</span>
            <input
              type="date"
              className="g-input"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
            />
          </label>
          <label>
            <span className="g-label">Hasta</span>
            <input
              type="date"
              className="g-input"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
            />
          </label>
          <label>
            <span className="g-label">Buscar</span>
            <input
              className="g-input"
              placeholder="Lote, OC, producto…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </label>
          <label className="g-filters-fit flex h-[var(--control-height)] items-center gap-2 text-[13px] text-[var(--color-text-secondary)]">
            <input
              type="checkbox"
              checked={soloPendientes}
              onChange={(e) => setSoloPendientes(e.target.checked)}
              className="h-3.5 w-3.5 accent-[var(--color-primary)]"
            />
            Solo pendientes
          </label>
        </div>
      </div>

      <div className="relative">
        <div className="g-table-wrap min-w-0">
          <div className="g-table-toolbar">
            <div>
              <p className="g-section-title">Listado de solicitudes</p>
              <p className="text-[12px] text-[var(--color-text-muted)]">
                {filtradas.length} resultado(s)
              </p>
            </div>
            <ColumnPicker
              cols={cols.cols}
              isVisible={cols.isVisible}
              onToggle={cols.toggle}
            />
          </div>
          <div className="g-table-scroll g-table-scroll-ops">
          <table className="g-table">
            <thead>
              <tr>
                {show("estado") ? <th>Estado</th> : null}
                {show("fecha") ? <th>Fecha fin</th> : null}
                {show("lote") ? <th>Lote</th> : null}
                {show("producto") ? <th>Producto</th> : null}
                {show("version") ? <th>Vers.</th> : null}
                {show("oc") ? <th>OC / SAP</th> : null}
                {show("solicitado") ? <th>Solicitado</th> : null}
                {show("cargado") ? <th>Cargado</th> : null}
                {show("pendiente") ? <th>Pendiente</th> : null}
                {show("progreso") ? <th>Progreso</th> : null}
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 ? (
                <tr>
                  <td
                    colSpan={cols.visibleCount}
                    className="px-4 py-8 text-center text-[var(--color-text-muted)]"
                  >
                    No hay solicitudes con estos filtros.
                  </td>
                </tr>
              ) : (
                filtradas.map((s) => {
                  const on = s.id === seleccion?.id;
                  const prod = s.producto || "—";
                  const solTxt = `${nroVisible(s.unidades_solicitadas)} ${s.etiqueta_unidad}`;
                  return (
                    <tr
                      key={s.id}
                      className={on ? "g-row-active" : ""}
                    >
                      {show("estado") ? (
                        <td>
                          <span className={colorEstado(s.estado)}>
                            {s.estado_etiqueta}
                          </span>
                        </td>
                      ) : null}
                      {show("fecha") ? (
                        <td className="whitespace-nowrap">
                          {fechaVisible(s.fecha_estimada)}
                        </td>
                      ) : null}
                      {show("lote") ? (
                        <td className="font-medium whitespace-nowrap">
                          {s.lote || "—"}
                        </td>
                      ) : null}
                      {show("producto") ? (
                        <td className="max-w-[140px]">
                          <span className="g-truncate block" title={prod}>
                            {prod}
                          </span>
                        </td>
                      ) : null}
                      {show("version") ? <td>{s.version || "—"}</td> : null}
                      {show("oc") ? (
                        <td className="max-w-[100px]">
                          <span
                            className="g-truncate block"
                            title={s.orden_compra || undefined}
                          >
                            {s.orden_compra || "—"}
                          </span>
                        </td>
                      ) : null}
                      {show("solicitado") ? (
                        <td className="whitespace-nowrap tabular-nums" title={solTxt}>
                          {solTxt}
                        </td>
                      ) : null}
                      {show("cargado") ? (
                        <td className="whitespace-nowrap tabular-nums">
                          {nroVisible(s.unidades_cargadas)}
                        </td>
                      ) : null}
                      {show("pendiente") ? (
                        <td className="whitespace-nowrap tabular-nums">
                          {nroVisible(s.unidades_pendientes)}
                        </td>
                      ) : null}
                      {show("progreso") ? (
                        <td className="min-w-[100px]">
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${s.progreso}%`,
                                  background:
                                    s.estado === ESTADO_COMPLETADA
                                      ? "var(--color-success)"
                                      : "var(--color-warning)",
                                }}
                              />
                            </div>
                            <span className="w-8 text-right text-[11px] tabular-nums text-[var(--color-text-muted)]">
                              {Math.round(s.progreso)}%
                            </span>
                          </div>
                        </td>
                      ) : null}
                      <td className="whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <RowDetailButton
                            onClick={() => setSeleccionId(s.id ?? null)}
                          />
                          {puedeEditar ? (
                            <>
                              <RowEditButton href={`/solicitudes/${s.id}/editar`} />
                              <RowDeleteButton
                                disabled={pending}
                                onClick={() => onEliminar(s)}
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

        {seleccion ? (
          <RecordDetailDrawer
            heading="Detalle de solicitud"
            title={seleccion.lote || "Sin lote"}
            badge={
              <span className={colorEstado(seleccion.estado)}>
                {seleccion.estado_etiqueta}
              </span>
            }
            onClose={() => setSeleccionId(null)}
          >
            <Detalle solicitud={seleccion} />
          </RecordDetailDrawer>
        ) : null}
      </div>

      <p className="text-[11px] text-[var(--color-text-muted)]">
        Catálogo: {productos.length} productos disponibles para altas.
        {puedeEditar ? "" : " Tenés acceso de solo lectura en este módulo."}
      </p>
    </div>
  );
}

function Kpi({
  titulo,
  valor,
  tono,
}: {
  titulo: string;
  valor: number;
  tono: "primary" | "muted" | "warning" | "success";
}) {
  const color =
    tono === "warning"
      ? "var(--color-warning)"
      : tono === "success"
        ? "var(--color-success)"
        : tono === "muted"
          ? "var(--color-text-secondary)"
          : "var(--color-primary)";
  return (
    <div className="g-kpi">
      <p className="g-kpi-title">{titulo}</p>
      <p className="g-kpi-value" style={{ color }}>
        {valor}
      </p>
    </div>
  );
}

function Detalle({ solicitud: s }: { solicitud: SolicitudVista }) {
  return (
    <div className="space-y-3 text-[13px]">
      <dl className="space-y-1">
        <Fila label="Producto" valor={s.producto} />
        <Fila label="Código" valor={s.codigo_producto} />
        <Fila label="Receta PLC" valor={s.receta_plc} />
        <Fila label="Versión" valor={s.version} />
        <Fila label="Envase" valor={s.envase} />
        <Fila
          label="Capacidad"
          valor={s.capacidad_kg ? `${nroVisible(s.capacidad_kg, 2)} kg` : "—"}
        />
        <Fila label="Etiqueta" valor={s.nombre_etiqueta} />
        <Fila label="OC / SAP" valor={s.orden_compra} />
        <Fila label="Orden prod." valor={s.orden_produccion} />
        <Fila label="Registro" valor={fechaVisible(s.fecha_registro)} />
        <Fila label="Estimada" valor={fechaVisible(s.fecha_estimada)} />
      </dl>
      <div className="grid grid-cols-3 gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-surface-secondary)] p-2.5 text-[11px]">
        <Bloque
          titulo="Solicitado"
          un={s.unidades_solicitadas}
          pal={s.pallets_solicitados}
          kg={s.kg_solicitados}
          unidad={s.etiqueta_unidad}
        />
        <Bloque
          titulo="Cargado"
          un={s.unidades_cargadas}
          pal={s.pallets_cargados}
          kg={s.kg_cargados}
          unidad={s.etiqueta_unidad}
        />
        <Bloque
          titulo="Pendiente"
          un={s.unidades_pendientes}
          pal={s.pallets_pendientes}
          kg={s.kg_pendientes}
          unidad={s.etiqueta_unidad}
        />
      </div>
      {s.excedente_kg > 0.01 ? (
        <p className="g-alert g-alert-warning">
          Excedente de {nroVisible(s.excedente_kg, 1)} kg respecto a lo
          solicitado.
        </p>
      ) : null}
      <p className="text-[11px] text-[var(--color-text-muted)]">
        Fuente cargado:{" "}
        {s.fuente_cargado === "produccion" ? "Producción" : "Solicitud"}
        {s.tiene_produccion ? " · Con jornadas registradas" : ""}
      </p>
    </div>
  );
}

function Fila({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex justify-between gap-2 py-0.5">
      <dt className="shrink-0 text-[var(--color-text-muted)]">{label}</dt>
      <dd
        className="g-truncate text-right font-medium"
        title={valor || undefined}
      >
        {valor || "—"}
      </dd>
    </div>
  );
}

function Bloque({
  titulo,
  un,
  pal,
  kg,
  unidad,
}: {
  titulo: string;
  un: number;
  pal: number;
  kg: number;
  unidad: string;
}) {
  return (
    <div>
      <p className="font-semibold text-[var(--color-text-secondary)]">{titulo}</p>
      <p className="tabular-nums">
        {nroVisible(un)} {unidad}
      </p>
      <p className="tabular-nums text-[var(--color-text-muted)]">
        {nroVisible(pal)} pal
      </p>
      <p className="tabular-nums text-[var(--color-text-muted)]">
        {nroVisible(kg, 1)} kg
      </p>
    </div>
  );
}
