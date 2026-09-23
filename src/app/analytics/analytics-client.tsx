"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  IconBolt,
  IconCalendar,
  IconChart,
  IconCheck,
  IconClipboard,
  IconClose,
  IconDownload,
  IconFactory,
  IconWeight,
} from "@/components/ui/icons";
import { DialogoInforme } from "@/components/ui/informe";
import { ColumnPicker } from "@/components/ui/column-picker";
import {
  DetalleFilas,
  RecordDetailDrawer,
  RowDetailButton,
} from "@/components/ui/record-detail";
import { useColumnVisibility } from "@/components/ui/use-column-visibility";
import { fechaVisible } from "@/lib/solicitudes/logic";
import { hoyIso } from "@/lib/planificacion/logic";
import {
  CUMPLE_PLAN,
  PRESETS,
  deltaPct,
  etiquetaPeriodo,
  filtrarJornadas,
  fmtHs,
  fmtKg,
  fmtKgH,
  fmtPct,
  opcionesFiltro,
  productosDeCategoria,
  rangoAnterior,
  rangoDePunto,
  rangoPreset,
  resumenAnalytics,
  resumenPlan,
  type JornadaAnalytics,
  type LineaPlanAnalytics,
  type PresetAnalytics,
  type ResumenAnalytics,
} from "@/lib/analytics/logic";
import {
  GraficoHoras,
  GraficoKg,
  GraficoPlanReal,
  LeyendaHoras,
  LeyendaPlan,
  PanelGrafico,
  PanelPartes,
} from "@/app/analytics/analytics-charts";
import { AnalyticsStock } from "@/app/analytics/analytics-stock";
import { AnalyticsTrazabilidad } from "@/app/analytics/analytics-trazabilidad";
import { AnalyticsReportes } from "@/app/analytics/analytics-reportes";
import { armarInformeAnalytics } from "@/lib/analytics/exportar";
import { type DatosStockAnalytics, type FamiliaStock } from "@/lib/analytics/stock";

type Props = {
  jornadas: JornadaAnalytics[];
  plan: LineaPlanAnalytics[];
  stock: DatosStockAnalytics;
  errorCarga: string | null;
};

const COLS = [
  { id: "fecha", label: "Fecha" },
  { id: "lote", label: "Lote" },
  { id: "producto", label: "Producto" },
  { id: "categoria", label: "Categoría" },
  { id: "envase", label: "Envase" },
  { id: "kg", label: "Kg" },
  { id: "hsProd", label: "Hs prod." },
  { id: "paradas", label: "Paradas" },
  { id: "rendimiento", label: "Kg/h" },
  { id: "acciones", label: "Acciones", locked: true },
];

const PAGE = 50;

export function AnalyticsClient({ jornadas, plan, stock, errorCarga }: Props) {
  const [preset, setPreset] = useState<PresetAnalytics>("Mes actual");
  const [desde, setDesde] = useState(() => rangoPreset("Mes actual")?.desde ?? hoyIso());
  const [hasta, setHasta] = useState(() => rangoPreset("Mes actual")?.hasta ?? hoyIso());
  const [categoria, setCategoria] = useState("Todos");
  const [producto, setProducto] = useState("Todos");
  const [envase, setEnvase] = useState("Todos");
  const [causa, setCausa] = useState<{ nombre: string; tipo: "prog" | "no" } | null>(null);
  const [tab, setTab] = useState<"produccion" | "stock" | "trazabilidad" | "reportes">("produccion");
  const [familia, setFamilia] = useState<FamiliaStock>("Todas");
  const [exportar, setExportar] = useState(false);
  const [comparar, setComparar] = useState(true);
  const [seleccionId, setSeleccionId] = useState<number | null>(null);
  const [pagina, setPagina] = useState(0);
  const tablaRef = useRef<HTMLDivElement>(null);
  const cols = useColumnVisibility("analytics-jornadas", COLS);
  const show = cols.isVisible;

  const errorFechas = !desde || !hasta ? null : desde > hasta ? "La fecha desde no puede ser posterior a la fecha hasta." : null;
  const opciones = useMemo(() => opcionesFiltro(jornadas), [jornadas]);
  const productos = useMemo(
    () => productosDeCategoria(jornadas, categoria),
    [jornadas, categoria],
  );

  const recortadas = useMemo(
    () => filtrarJornadas(jornadas, categoria, producto, envase, causa),
    [jornadas, categoria, producto, envase, causa],
  );

  const resumen = useMemo<ResumenAnalytics | null>(() => {
    if (errorFechas || !desde || !hasta) return null;
    return resumenAnalytics(recortadas, desde, hasta);
  }, [recortadas, desde, hasta, errorFechas]);

  const anteriorRango = desde && hasta && !errorFechas ? rangoAnterior(desde, hasta) : null;
  const resumenAnt = useMemo(() => {
    if (!comparar || errorFechas || !desde || !hasta) return null;
    const rango = rangoAnterior(desde, hasta);
    return resumenAnalytics(recortadas, rango.desde, rango.hasta);
  }, [comparar, desde, hasta, recortadas, errorFechas]);

  const planActual = useMemo(() => {
    if (!resumen || producto !== "Todos") return null;
    return resumenPlan(plan, resumen.diario, categoria, resumen.desde, resumen.hasta);
  }, [resumen, plan, categoria, producto]);

  const informe = useMemo(
    () =>
      tab === "produccion" || tab === "stock"
        ? armarInformeAnalytics({
            tab,
            desde,
            hasta,
            categoria,
            producto,
            envase,
            causa,
            familia,
            comparar,
            resumen,
            plan: planActual,
            anterior: resumenAnt,
            stock,
          })
        : null,
    [tab, desde, hasta, categoria, producto, envase, causa, familia, comparar, resumen, planActual, resumenAnt, stock],
  );

  const seleccion = resumen?.detalle.find((j) => j.id === seleccionId) ?? null;
  const totalPaginas = resumen ? Math.max(1, Math.ceil(resumen.detalle.length / PAGE)) : 1;
  const paginaSafe = Math.min(pagina, totalPaginas - 1);
  const filas = resumen?.detalle.slice(paginaSafe * PAGE, paginaSafe * PAGE + PAGE) ?? [];

  function aplicarPreset(valor: PresetAnalytics) {
    setPreset(valor);
    const rango = rangoPreset(valor);
    if (!rango) return;
    setDesde(rango.desde);
    setHasta(rango.hasta);
    setPagina(0);
    setSeleccionId(null);
  }

  function cambiarFecha(campo: "desde" | "hasta", valor: string) {
    setPreset("Personalizado");
    if (campo === "desde") setDesde(valor);
    else setHasta(valor);
    setPagina(0);
    setSeleccionId(null);
  }

  function cambiarCategoria(valor: string) {
    setCategoria(valor);
    if (producto !== "Todos" && !productosDeCategoria(jornadas, valor).includes(producto)) {
      setProducto("Todos");
    }
    setPagina(0);
    setSeleccionId(null);
  }

  function cambiarProducto(valor: string) {
    setProducto(valor);
    setPagina(0);
    setSeleccionId(null);
  }

  function irATabla() {
    requestAnimationFrame(() => {
      tablaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function recortarPeriodo(fecha: string) {
    if (!desde || !hasta || errorFechas) return;
    const modo = resumen?.modoSerie ?? "dia";
    const rango = rangoDePunto(fecha, modo, desde, hasta);
    setPreset("Personalizado");
    setDesde(rango.desde);
    setHasta(rango.hasta);
    setPagina(0);
    setSeleccionId(null);
    irATabla();
  }

  function recortarCategoria(nombre: string) {
    cambiarCategoria(nombre);
    irATabla();
  }

  function recortarEnvase(nombre: string) {
    setEnvase(nombre);
    setPagina(0);
    setSeleccionId(null);
    irATabla();
  }

  function recortarCausa(nombre: string, tipo: "prog" | "no") {
    setCausa({ nombre, tipo });
    setPagina(0);
    setSeleccionId(null);
    irATabla();
  }

  return (
    <div className="g-stack">
      {errorCarga ? <p className="g-alert g-alert-danger">{errorCarga}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="g-page-title">Data Analytics</h1>
          <p className="g-page-subtitle">
            Indicadores de producción, stock y paradas a partir de los registros reales.
          </p>
        </div>
        {tab === "produccion" || tab === "stock" ? (
          <button
            type="button"
            className="g-btn g-btn-icon h-9 w-9"
            title="Exportar recorte"
            aria-label="Exportar recorte"
            disabled={!informe}
            onClick={() => setExportar(true)}
          >
            <IconDownload className="h-4 w-4" />
          </button>
        ) : null}
      </div>

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

      <div className="inline-flex w-fit max-w-full flex-wrap rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5">
        <button
          type="button"
          onClick={() => setTab("produccion")}
          className={`rounded-[5px] px-3 py-1.5 text-[13px] font-medium transition-[background,color] duration-150 ${
            tab === "produccion"
              ? "bg-[var(--color-primary)] text-white"
              : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]"
          }`}
        >
          Producción
        </button>
        <button
          type="button"
          onClick={() => setTab("stock")}
          className={`rounded-[5px] px-3 py-1.5 text-[13px] font-medium transition-[background,color] duration-150 ${
            tab === "stock"
              ? "bg-[var(--color-primary)] text-white"
              : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]"
          }`}
        >
          Stock
        </button>
        <button
          type="button"
          onClick={() => setTab("trazabilidad")}
          className={`rounded-[5px] px-3 py-1.5 text-[13px] font-medium transition-[background,color] duration-150 ${
            tab === "trazabilidad"
              ? "bg-[var(--color-primary)] text-white"
              : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]"
          }`}
        >
          Trazabilidad
        </button>
        <button
          type="button"
          onClick={() => setTab("reportes")}
          className={`rounded-[5px] px-3 py-1.5 text-[13px] font-medium transition-[background,color] duration-150 ${
            tab === "reportes"
              ? "bg-[var(--color-primary)] text-white"
              : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]"
          }`}
        >
          Reportes
        </button>
      </div>

      {tab === "trazabilidad" ? (
        <AnalyticsTrazabilidad jornadas={jornadas} stock={stock} />
      ) : tab === "reportes" ? (
        <AnalyticsReportes jornadas={jornadas} plan={plan} stock={stock} />
      ) : (
        <>
      <div className="g-card px-3 py-2.5">
        <span className="g-label">Período</span>
        <div className="mt-1 flex flex-wrap gap-1">
          {PRESETS.map((item) => (
            <button
              key={item}
              type="button"
              className={`g-btn g-btn-sm ${preset === item ? "g-btn-primary" : "g-btn-secondary"}`}
              onClick={() => aplicarPreset(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="g-filters mt-2">
          <label>
            <span className="g-label">Desde</span>
            <input
              type="date"
              className="g-input"
              value={desde}
              onChange={(e) => cambiarFecha("desde", e.target.value)}
            />
          </label>
          <label>
            <span className="g-label">Hasta</span>
            <input
              type="date"
              className="g-input"
              value={hasta}
              onChange={(e) => cambiarFecha("hasta", e.target.value)}
            />
          </label>
          <label>
            <span className="g-label">Categoría</span>
            <select
              className="g-input"
              value={categoria}
              onChange={(e) => cambiarCategoria(e.target.value)}
            >
              <option>Todos</option>
              {opciones.categorias.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="g-label">Producto</span>
            <select
              className="g-input"
              value={producto}
              onChange={(e) => cambiarProducto(e.target.value)}
            >
              <option>Todos</option>
              {productos.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>
        {tab === "produccion" ? (
          <label className="mt-2 inline-flex items-center gap-2 text-[13px] text-[var(--color-text-secondary)]">
            <input
              type="checkbox"
              checked={comparar}
              onChange={(e) => setComparar(e.target.checked)}
              className="h-3.5 w-3.5 accent-[var(--color-primary)]"
            />
            Comparar con el período anterior
            {comparar && anteriorRango ? (
              <span className="text-[12px] text-[var(--color-text-muted)]">
                ({etiquetaPeriodo(anteriorRango.desde, anteriorRango.hasta)})
              </span>
            ) : null}
          </label>
        ) : (
          <p className="mt-2 text-[12px] text-[var(--color-text-muted)]">
            Período y producto/categoría se aplican al consumo y a los barridos. El stock es el saldo actual.
          </p>
        )}
        {envase !== "Todos" || causa ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {envase !== "Todos" ? (
              <Chip texto={`Envase: ${envase}`} onQuitar={() => setEnvase("Todos")} />
            ) : null}
            {causa ? (
              <Chip
                texto={`Parada ${causa.tipo === "prog" ? "prog." : "no prog."}: ${causa.nombre}`}
                onQuitar={() => setCausa(null)}
              />
            ) : null}
          </div>
        ) : null}
        {errorFechas ? (
          <p className="mt-2 text-[12px] text-[var(--color-danger)]">{errorFechas}</p>
        ) : null}
      </div>

      {tab === "stock" && desde && hasta && !errorFechas ? (
        <AnalyticsStock
          datos={stock}
          desde={desde}
          hasta={hasta}
          categoria={categoria}
          producto={producto}
          familia={familia}
          onFamilia={setFamilia}
        />
      ) : tab === "stock" ? (
        <p className="text-[13px] text-[var(--color-text-muted)]">
          Elegí ambas fechas para ver los indicadores.
        </p>
      ) : resumen?.sinDatos && !planActual?.tienePlan ? (
        <div className="g-card p-4">
          <p className="text-[13px] text-[var(--color-text-muted)]">
            No existen registros para el período y los filtros seleccionados.
          </p>
        </div>
      ) : !resumen && !errorFechas ? (
        <p className="text-[13px] text-[var(--color-text-muted)]">
          Elegí ambas fechas para ver los indicadores.
        </p>
      ) : resumen ? (
        <>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <Kpi
              tono="mint"
              icono={<IconWeight className="h-5 w-5" />}
              titulo="Producción total"
              valor={fmtKg(resumen.kgTotal)}
              pie={`Promedio diario: ${fmtKg(resumen.kgPromedioDia)} · ${fmtKgH(resumen.kgHora)}`}
              delta={comparar ? deltaPct(resumen.kgTotal, resumenAnt?.kgTotal ?? 0) : null}
              comparar={comparar}
            />
            <Kpi
              tono="sage"
              icono={<IconCalendar className="h-5 w-5" />}
              titulo="Horas disponibles"
              valor={fmtHs(resumen.hsDisponibles)}
              pie={`Promedio diario: ${fmtHs(resumen.hsDisponiblesDia)}`}
              delta={comparar ? deltaPct(resumen.hsDisponibles, resumenAnt?.hsDisponibles ?? 0) : null}
              comparar={comparar}
            />
            <Kpi
              tono="blue"
              icono={<IconFactory className="h-5 w-5" />}
              titulo="Horas productivas"
              valor={fmtHs(resumen.hsProductivas)}
              pie={`Promedio diario: ${fmtHs(resumen.hsProductivasDia)}`}
              delta={comparar ? deltaPct(resumen.hsProductivas, resumenAnt?.hsProductivas ?? 0) : null}
              comparar={comparar}
            />
            <Kpi
              tono="violet"
              icono={<IconClipboard className="h-5 w-5" />}
              titulo="Paradas programadas"
              valor={fmtHs(resumen.hsParadasProg)}
              pie={`Promedio diario: ${fmtHs(resumen.hsParadasProgDia)}`}
              delta={comparar ? deltaPct(resumen.hsParadasProg, resumenAnt?.hsParadasProg ?? 0) : null}
              comparar={comparar}
              invertido
            />
            <Kpi
              tono="mint"
              icono={<IconBolt className="h-5 w-5" />}
              titulo="Paradas no programadas"
              valor={fmtHs(resumen.hsParadasNo)}
              pie={`Promedio diario: ${fmtHs(resumen.hsParadasNoDia)}`}
              delta={comparar ? deltaPct(resumen.hsParadasNo, resumenAnt?.hsParadasNo ?? 0) : null}
              comparar={comparar}
              invertido
            />
            <Kpi
              tono="sage"
              icono={<IconChart className="h-5 w-5" />}
              titulo="% de utilización"
              valor={fmtPct(resumen.utilizacionPct)}
              pie="Horas productivas / horas disponibles"
              delta={comparar ? deltaPct(resumen.utilizacionPct, resumenAnt?.utilizacionPct ?? 0) : null}
              comparar={comparar}
            />
            {planActual ? (
              <Kpi
                tono={
                  planActual.cumplimiento == null
                    ? "sage"
                    : planActual.cumplimiento >= CUMPLE_PLAN
                      ? "mint"
                      : "violet"
                }
                icono={<IconCheck className="h-5 w-5" />}
                titulo="Cumplimiento del plan"
                valor={planActual.cumplimiento == null ? "—" : fmtPct(planActual.cumplimiento)}
                pie={
                  planActual.cumplimiento == null
                    ? "Sin kg planificados vigentes en el período"
                    : `Real ${fmtKg(planActual.kgReal)} · Plan vigente ${fmtKg(planActual.kgPlanVigente)}`
                }
              />
            ) : producto !== "Todos" ? (
              <Kpi
                tono="sage"
                icono={<IconCheck className="h-5 w-5" />}
                titulo="Cumplimiento del plan"
                valor="—"
                pie="El plan es por categoría. Sacá el filtro de producto para compararlo."
              />
            ) : null}
          </div>

          <h2 className="g-section-title">Producción</h2>
          <PanelGrafico
            titulo="Producción por día"
            pie={
              resumen.modoSerie === "dia"
                ? "Pasá el mouse para ver kg · clic para ver las jornadas"
                : resumen.modoSerie === "semana"
                  ? "Agrupado por semana · clic para ver ese tramo"
                  : "Agrupado por mes · clic para ver ese mes"
            }
          >
            <GraficoKg serie={resumen.serie} onSeleccionar={(punto) => recortarPeriodo(punto.fecha)} />
          </PanelGrafico>
          <div className="grid gap-2 lg:grid-cols-2">
            <PanelPartes
              titulo="Producción por categoría"
              partes={resumen.porCategoria}
              unidad="kg"
              onSeleccionar={recortarCategoria}
            />
            <PanelPartes
              titulo="Producción por envase"
              partes={resumen.porEnvase}
              unidad="kg"
              onSeleccionar={recortarEnvase}
            />
          </div>
          <PanelPartes
            titulo="Promedio diario por categoría"
            partes={resumen.promedioCategoria}
            unidad="kg/día"
            extra
            onSeleccionar={recortarCategoria}
          />

          {planActual?.tienePlan ? (
            <>
              <h2 className="g-section-title">Plan vs real</h2>
              <PanelGrafico
                titulo="Kg planificados y producidos"
                pie={
                  <div className="flex flex-wrap items-center gap-3">
                    <LeyendaPlan />
                    {planActual.desvioPct != null ? (
                      <span>
                        Desvío {planActual.desvioPct > 0 ? "+" : ""}
                        {fmtPct(planActual.desvioPct)}
                      </span>
                    ) : null}
                  </div>
                }
              >
                <GraficoPlanReal serie={planActual.serie} onSeleccionar={(punto) => recortarPeriodo(punto.fecha)} />
              </PanelGrafico>
            </>
          ) : null}

          <h2 className="g-section-title">Tiempos</h2>
          <PanelGrafico titulo="Composición de horas" pie={<LeyendaHoras />}>
            <GraficoHoras serie={resumen.serie} onSeleccionar={(punto) => recortarPeriodo(punto.fecha)} />
          </PanelGrafico>

          <h2 className="g-section-title">Análisis de paradas</h2>
          <div className="grid gap-2 lg:grid-cols-2">
            <PanelPartes
              titulo="Causas de paradas programadas"
              partes={resumen.causasProgramadas}
              unidad="h"
              onSeleccionar={(nombre) => recortarCausa(nombre, "prog")}
            />
            <PanelPartes
              titulo="Causas de paradas no programadas"
              partes={resumen.causasNoProgramadas}
              unidad="h"
              onSeleccionar={(nombre) => recortarCausa(nombre, "no")}
            />
          </div>

          <div className="relative" ref={tablaRef}>
            <div className="g-table-wrap min-w-0">
              <div className="g-table-toolbar">
                <div>
                  <p className="g-section-title">Jornadas del período</p>
                  <p className="text-[12px] text-[var(--color-text-muted)]">
                    {resumen.jornadas} jornada{resumen.jornadas === 1 ? "" : "s"} · {resumen.diasConRegistro} día
                    {resumen.diasConRegistro === 1 ? "" : "s"} con registro · Fuente: producción registrada
                  </p>
                </div>
                <ColumnPicker cols={cols.cols} isVisible={cols.isVisible} onToggle={cols.toggle} />
              </div>
              <div className="g-table-scroll g-table-scroll-ops">
                <table className="g-table">
                  <thead>
                    <tr>
                      {show("fecha") ? <th>Fecha</th> : null}
                      {show("lote") ? <th>Lote</th> : null}
                      {show("producto") ? <th>Producto</th> : null}
                      {show("categoria") ? <th>Categoría</th> : null}
                      {show("envase") ? <th>Envase</th> : null}
                      {show("kg") ? <th>Kg</th> : null}
                      {show("hsProd") ? <th>Hs prod.</th> : null}
                      {show("paradas") ? <th>Paradas</th> : null}
                      {show("rendimiento") ? <th>Kg/h</th> : null}
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.length === 0 ? (
                      <tr>
                        <td colSpan={cols.visibleCount} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                          No hay jornadas en el período.
                        </td>
                      </tr>
                    ) : (
                      filas.map((j) => {
                        const on = j.id === seleccion?.id;
                        return (
                          <tr
                            key={j.id}
                            className={on ? "g-row-active" : ""}
                            onClick={() => setSeleccionId(j.id)}
                          >
                            {show("fecha") ? (
                              <td className="whitespace-nowrap">{fechaVisible(j.fecha)}</td>
                            ) : null}
                            {show("lote") ? (
                              <td className="font-medium whitespace-nowrap">{j.lote || "—"}</td>
                            ) : null}
                            {show("producto") ? (
                              <td className="max-w-[160px]">
                                <span className="g-truncate block" title={j.producto}>
                                  {j.producto}
                                </span>
                              </td>
                            ) : null}
                            {show("categoria") ? <td>{j.categoria}</td> : null}
                            {show("envase") ? (
                              <td className="max-w-[140px]">
                                <span className="g-truncate block" title={j.envase}>
                                  {j.envase}
                                </span>
                              </td>
                            ) : null}
                            {show("kg") ? (
                              <td className="tabular-nums whitespace-nowrap">{fmtKg(j.kg)}</td>
                            ) : null}
                            {show("hsProd") ? (
                              <td className="tabular-nums whitespace-nowrap">{fmtHs(j.hsProductivas)}</td>
                            ) : null}
                            {show("paradas") ? (
                              <td className="tabular-nums whitespace-nowrap">
                                {fmtHs(j.hsParadasProg + j.hsParadasNo)}
                              </td>
                            ) : null}
                            {show("rendimiento") ? (
                              <td className="tabular-nums whitespace-nowrap">{fmtKgH(j.rendimientoKgH)}</td>
                            ) : null}
                            <td>
                              <RowDetailButton onClick={() => setSeleccionId(j.id)} />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {resumen.detalle.length > PAGE ? (
                <div className="flex items-center justify-between gap-2 border-t border-[var(--color-border)] px-3 py-2 text-[12px]">
                  <span className="text-[var(--color-text-muted)]">
                    Página {paginaSafe + 1} de {totalPaginas}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="g-btn g-btn-sm g-btn-secondary"
                      disabled={paginaSafe <= 0}
                      onClick={() => setPagina((p) => Math.max(0, p - 1))}
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      className="g-btn g-btn-sm g-btn-secondary"
                      disabled={paginaSafe >= totalPaginas - 1}
                      onClick={() => setPagina((p) => p + 1)}
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            {seleccion ? (
              <RecordDetailDrawer
                heading="Jornada"
                title={seleccion.lote || `Producción #${seleccion.id}`}
                onClose={() => setSeleccionId(null)}
              >
                <DetalleFilas
                  filas={[
                    { label: "Fecha", valor: fechaVisible(seleccion.fecha) },
                    { label: "Producto", valor: seleccion.producto },
                    { label: "Categoría", valor: seleccion.categoria },
                    { label: "Envase", valor: seleccion.envase },
                    { label: "Orden prod.", valor: seleccion.ordenProduccion || "—" },
                    { label: "Kg", valor: fmtKg(seleccion.kg) },
                    { label: "Pallets", valor: String(Math.round(seleccion.pallets)) },
                    { label: "Unidades", valor: String(Math.round(seleccion.unidades)) },
                    { label: "Hs disponibles", valor: fmtHs(seleccion.hsDisponibles) },
                    { label: "Hs productivas", valor: fmtHs(seleccion.hsProductivas) },
                    { label: "Paradas prog.", valor: fmtHs(seleccion.hsParadasProg) },
                    { label: "Paradas no prog.", valor: fmtHs(seleccion.hsParadasNo) },
                    { label: "Rendimiento", valor: fmtKgH(seleccion.rendimientoKgH) },
                  ]}
                />
                {seleccion.paradasProg.length + seleccion.paradasNo.length > 0 ? (
                  <div className="mt-3 space-y-1 text-[13px]">
                    <p className="font-semibold text-[var(--color-text-secondary)]">Paradas</p>
                    {seleccion.paradasProg.map((p, i) => (
                      <p key={`p-${i}`} className="text-[var(--color-text-muted)]">
                        Prog. · {p.causa} · {fmtHs(p.horas)}
                      </p>
                    ))}
                    {seleccion.paradasNo.map((p, i) => (
                      <p key={`n-${i}`} className="text-[var(--color-text-muted)]">
                        No prog. · {p.causa} · {fmtHs(p.horas)}
                      </p>
                    ))}
                  </div>
                ) : null}
                <p className="mt-3">
                  <Link href="/produccion" className="g-btn g-btn-secondary g-btn-sm">
                    Ir a Producción
                  </Link>
                </p>
              </RecordDetailDrawer>
            ) : null}
          </div>

          <p className="text-[11px] text-[var(--color-text-muted)]">
            Período {resumen.periodo} · {resumen.jornadas} jornadas · {resumen.diasConRegistro} días con
            registro · Fuente: producción registrada
          </p>
        </>
      ) : null}
        </>
      )}
    </div>
  );
}

function Chip({ texto, onQuitar }: { texto: string; onQuitar: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-primary-light)] px-2 py-0.5 text-[12px] text-[var(--color-text)]">
      <span className="g-truncate max-w-[16rem]" title={texto}>
        {texto}
      </span>
      <button
        type="button"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
        title="Quitar"
        aria-label={`Quitar ${texto}`}
        onClick={onQuitar}
      >
        <IconClose className="h-3 w-3" />
      </button>
    </span>
  );
}

function Kpi({
  tono,
  icono,
  titulo,
  valor,
  pie,
  delta,
  comparar,
  invertido,
}: {
  tono: "mint" | "blue" | "violet" | "sage";
  icono: ReactNode;
  titulo: string;
  valor: string;
  pie: string;
  delta?: number | null;
  comparar?: boolean;
  invertido?: boolean;
}) {
  const textoDelta =
    !comparar
      ? null
      : delta == null
        ? "Sin dato anterior"
        : `vs ant. ${delta > 0.05 ? "+" : ""}${fmtPct(delta)}`;
  const bueno = delta == null ? null : invertido ? delta < -0.05 : delta > 0.05;
  const malo = delta == null ? null : invertido ? delta > 0.05 : delta < -0.05;
  return (
    <div className={`g-kpi g-kpi-rich g-kpi-${tono}`}>
      <span className="g-kpi-badge text-[var(--color-primary)]">{icono}</span>
      <span className="min-w-0 flex-1">
        <p className="g-kpi-title">{titulo}</p>
        <p className="g-kpi-value">{valor}</p>
        <p className="text-[12px] text-[var(--color-text-muted)]">{pie}</p>
        {textoDelta ? (
          <p
            className="mt-0.5 text-[12px] tabular-nums"
            style={{
              color:
                bueno
                  ? "var(--color-success)"
                  : malo
                    ? "var(--color-warning)"
                    : "var(--color-text-muted)",
            }}
          >
            {textoDelta}
          </p>
        ) : null}
      </span>
    </div>
  );
}
