"use client";

import { useMemo, useState, type ReactNode } from "react";
import { DialogoInforme } from "@/components/ui/informe";
import { IconDownload } from "@/components/ui/icons";
import { ColumnPicker } from "@/components/ui/column-picker";
import { useColumnVisibility, type ColDef } from "@/components/ui/use-column-visibility";
import { fmtHs, fmtKg, fmtPct } from "@/lib/analytics/logic";
import {
  armarInformeConsumoReceta,
  armarInformeConsumos,
  armarInformeHojaLote,
  armarInformeSolicitudesVs,
  type InformeFicha,
} from "@/lib/informes/exportar";
import {
  FAMILIAS_CONSUMO,
  armarConsumoVsReceta,
  armarHojaLote,
  armarSolicitudesVsProducido,
  SIN_LOTE_ARTICULO,
  claveArticuloConsumo,
  etiquetaFamiliaConsumo,
  filtrarConsumos,
  opcionesLote,
  type FiltroFamiliaConsumo,
} from "@/lib/informes/logic";
import { diasDelMes, etiquetaMes, hoyIso, primerDiaMes } from "@/lib/planificacion/logic";
import { nroDec, type ConsumoLinea, type DatosProduccion } from "@/lib/produccion/logic";
import {
  colorEstado,
  fechaVisible,
  nroVisible,
} from "@/lib/solicitudes/logic";

type FichaId = "lote" | "receta" | "comparativo" | "consumo";

const COLS_VS: ColDef[] = [
  { id: "lote", label: "Lote" },
  { id: "producto", label: "Producto" },
  { id: "oc", label: "O. compra" },
  { id: "op", label: "O. producción" },
  { id: "fecha", label: "Fecha" },
  { id: "kgSol", label: "Kg solicitados" },
  { id: "kgProd", label: "Kg producidos" },
  { id: "dif", label: "Diferencia" },
  { id: "cumplimiento", label: "Cumplimiento" },
  { id: "estado", label: "Estado" },
  { id: "fuente", label: "Fuente" },
];

const COLS_CONSUMO: ColDef[] = [
  { id: "fecha", label: "Fecha" },
  { id: "familia", label: "Tipo" },
  { id: "articulo", label: "Artículo" },
  { id: "loteArt", label: "Lote artículo" },
  { id: "cantidad", label: "Cantidad" },
  { id: "loteProd", label: "Lote producto" },
  { id: "producto", label: "Producto" },
];

function mesesConDatos(
  solicitudes: DatosProduccion["solicitudes"],
  consumos: DatosProduccion["consumosLinea"],
  hoy: string,
) {
  const actual = primerDiaMes(hoy);
  const meses = new Set<string>([actual]);
  for (const item of solicitudes) {
    const fecha = item.fecha_estimada || item.fecha_fin || item.fecha_registro;
    if (!fecha) continue;
    const mes = primerDiaMes(fecha);
    if (mes <= actual) meses.add(mes);
  }
  for (const item of consumos) {
    if (!item.fecha) continue;
    const mes = primerDiaMes(item.fecha);
    if (mes <= actual) meses.add(mes);
  }
  return [...meses].sort((a, b) => (a < b ? 1 : -1));
}

export function InformesClient({ datos }: { datos: DatosProduccion }) {
  const hoy = hoyIso();
  const mesActual = primerDiaMes(hoy);
  const [ficha, setFicha] = useState<FichaId>("comparativo");
  const [idSolicitud, setIdSolicitud] = useState("");
  const [familiaConsumo, setFamiliaConsumo] = useState<FiltroFamiliaConsumo>("todas");
  const [articuloConsumo, setArticuloConsumo] = useState("");
  const [loteArticulo, setLoteArticulo] = useState("");
  const [desdeConsumo, setDesdeConsumo] = useState(() => primerDiaMes(mesActual));
  const [hastaConsumo, setHastaConsumo] = useState(() => diasDelMes(mesActual).at(-1) ?? primerDiaMes(mesActual));
  const [mes, setMes] = useState(mesActual);
  const desde = primerDiaMes(mes);
  const hasta = diasDelMes(mes).at(-1) ?? desde;
  const [informe, setInforme] = useState<InformeFicha | null>(null);
  const meses = useMemo(
    () => mesesConDatos(datos.solicitudes, datos.consumosLinea, hoy),
    [datos.solicitudes, datos.consumosLinea, hoy],
  );
  const lotes = useMemo(() => opcionesLote(datos.solicitudes), [datos.solicitudes]);
  const idElegido = Number(idSolicitud) || 0;
  const hoja = useMemo(
    () => (idElegido ? armarHojaLote(datos, idElegido) : null),
    [datos, idElegido],
  );
  const receta = useMemo(
    () => (idElegido ? armarConsumoVsReceta(datos, idElegido) : null),
    [datos, idElegido],
  );
  const comparativo = useMemo(
    () => armarSolicitudesVsProducido(datos.solicitudes, desde, hasta),
    [datos.solicitudes, desde, hasta],
  );
  const baseConsumo = useMemo(
    () => ({ desde: desdeConsumo, hasta: hastaConsumo, idSolicitud: idElegido }),
    [desdeConsumo, hastaConsumo, idElegido],
  );
  const opcionesArticulo = useMemo(() => {
    const vistos = new Map<string, string>();
    for (const item of filtrarConsumos(datos.consumosLinea, { ...baseConsumo, familia: familiaConsumo })) {
      const id = claveArticuloConsumo(item);
      if (!vistos.has(id)) vistos.set(id, nombreArticulo(item));
    }
    return [...vistos.entries()]
      .map(([id, etiqueta]) => ({ id, etiqueta }))
      .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, "es"));
  }, [datos.consumosLinea, baseConsumo, familiaConsumo]);
  const articuloActivo = opcionesArticulo.some((item) => item.id === articuloConsumo) ? articuloConsumo : "";
  const opcionesLoteArticulo = useMemo(() => {
    const vistos = new Map<string, string>();
    let haySinLote = false;
    for (const item of filtrarConsumos(datos.consumosLinea, {
      ...baseConsumo,
      familia: familiaConsumo,
      articulo: articuloActivo,
    })) {
      if (!item.loteArticulo) {
        haySinLote = true;
        continue;
      }
      if (!vistos.has(item.loteArticulo)) vistos.set(item.loteArticulo, item.loteArticulo);
    }
    const lista = [...vistos.values()].sort((a, b) => a.localeCompare(b, "es"));
    return { lista, haySinLote };
  }, [datos.consumosLinea, baseConsumo, familiaConsumo, articuloActivo]);
  const loteActivo =
    loteArticulo === SIN_LOTE_ARTICULO
      ? opcionesLoteArticulo.haySinLote
        ? SIN_LOTE_ARTICULO
        : ""
      : opcionesLoteArticulo.lista.includes(loteArticulo)
        ? loteArticulo
        : "";
  const consumosPeriodo = useMemo(
    () =>
      filtrarConsumos(datos.consumosLinea, {
        ...baseConsumo,
        familia: "todas",
        articulo: articuloActivo,
        loteArticulo: loteActivo,
      }),
    [datos.consumosLinea, baseConsumo, articuloActivo, loteActivo],
  );
  const consumos = useMemo(
    () =>
      filtrarConsumos(datos.consumosLinea, {
        ...baseConsumo,
        familia: familiaConsumo,
        articulo: articuloActivo,
        loteArticulo: loteActivo,
      }),
    [datos.consumosLinea, baseConsumo, familiaConsumo, articuloActivo, loteActivo],
  );
  const colsVs = useColumnVisibility("informes-vs-producido", COLS_VS);
  const showVs = colsVs.isVisible;
  const colsConsumo = useColumnVisibility("informes-consumo-articulos", COLS_CONSUMO);
  const showConsumo = colsConsumo.isVisible;

  function abrir(id: FichaId) {
    if (id === "lote" && hoja) setInforme(armarInformeHojaLote(hoja));
    else if (id === "receta" && receta) setInforme(armarInformeConsumoReceta(receta));
    else if (id === "comparativo") setInforme(armarInformeSolicitudesVs(comparativo, desde, hasta));
    else if (id === "consumo") setInforme(armarInformeConsumos(consumos, desdeConsumo, hastaConsumo));
  }

  function cambiarMes(valor: string) {
    setMes(valor);
    const inicio = primerDiaMes(valor);
    setDesdeConsumo(inicio);
    setHastaConsumo(diasDelMes(valor).at(-1) ?? inicio);
  }

  function cambiarFamiliaConsumo(valor: FiltroFamiliaConsumo) {
    setFamiliaConsumo(valor);
    setArticuloConsumo((actual) => (!actual || valor === "todas" || actual.startsWith(`${valor}\t`) ? actual : ""));
    setLoteArticulo("");
  }

  return (
    <div className="g-stack">
      {datos.error ? <p className="g-alert g-alert-danger">{datos.error}</p> : null}

      <div>
        <h1 className="g-page-title">Informes</h1>
        <p className="g-page-subtitle">
          Documentos operativos por lote y período. Lo producido sale de las jornadas cuando
          coincide la solicitud.
        </p>
      </div>

      <div className="g-card px-3 py-2.5">
        <div className="g-filters">
          <label>
            <span className="g-label">Lote</span>
            <select
              className="g-input"
              value={idSolicitud}
              onChange={(e) => setIdSolicitud(e.target.value)}
            >
              <option value="">Elegí un lote</option>
              {lotes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.etiqueta}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="g-label">Mes</span>
            <select className="g-input" value={mes} onChange={(e) => cambiarMes(e.target.value)}>
              {meses.map((item) => (
                <option key={item} value={item}>
                  {etiquetaMes(item)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <CardFicha
          activa={ficha === "lote"}
          titulo="Hoja de lote"
          pie="Solicitud, jornadas, consumos, paradas y responsables"
          lineas={
            hoja
              ? [
                  { label: "Lote", valor: hoja.solicitud.lote || "—" },
                  { label: "Producto", valor: hoja.solicitud.producto || "—" },
                  { label: "Jornadas", valor: String(hoja.jornadas.length) },
                  { label: "Producido", valor: fmtKg(hoja.kgProducidos) },
                ]
              : [{ label: "Lote", valor: "Elegí un lote" }]
          }
          puedeExportar={!!hoja}
          onVer={() => setFicha("lote")}
          onExportar={() => abrir("lote")}
        />
        <CardFicha
          activa={ficha === "receta"}
          titulo="Consumo vs receta"
          pie="Teórico de la versión contra lo cargado en consumo"
          lineas={
            receta
              ? [
                  { label: "Versión", valor: receta.solicitud.version || "—" },
                  { label: "Líneas", valor: String(receta.lineas.length) },
                  { label: "Teórico", valor: fmtKg(receta.teoricoTotal) },
                  { label: "Real", valor: fmtKg(receta.realTotal) },
                ]
              : [{ label: "Lote", valor: "Elegí un lote" }]
          }
          puedeExportar={!!receta}
          onVer={() => setFicha("receta")}
          onExportar={() => abrir("receta")}
        />
        <CardFicha
          activa={ficha === "comparativo"}
          titulo="Solicitudes vs producido"
          pie="Kg pedidos contra kg de jornadas, por lote"
          lineas={[
            { label: "Solicitudes", valor: String(comparativo.filas.length) },
            { label: "Con producción", valor: String(comparativo.conProduccion) },
            { label: "Solicitado", valor: fmtKg(comparativo.kgSolicitados) },
            { label: "Producido", valor: fmtKg(comparativo.kgProducidos) },
          ]}
          puedeExportar
          onVer={() => setFicha("comparativo")}
          onExportar={() => abrir("comparativo")}
        />
        <CardFicha
          activa={ficha === "consumo"}
          titulo="Consumo de artículos"
          pie="Fecha, lote del artículo, cantidad y lote del producto"
          lineas={[
            { label: "Ingredientes", valor: String(consumosPeriodo.filter((item) => item.familia === "ingrediente").length) },
            { label: "Envases", valor: String(consumosPeriodo.filter((item) => item.familia === "envase").length) },
            { label: "Etiquetas", valor: String(consumosPeriodo.filter((item) => item.familia === "etiqueta").length) },
            { label: "Insumos", valor: String(consumosPeriodo.filter((item) => item.familia === "insumo").length) },
          ]}
          puedeExportar={consumos.length > 0}
          onVer={() => setFicha("consumo")}
          onExportar={() => abrir("consumo")}
        />
      </div>

      {ficha === "lote" ? (
        <VistaHoja hoja={hoja} />
      ) : ficha === "receta" ? (
        <VistaReceta receta={receta} />
      ) : ficha === "consumo" ? (
        <VistaConsumo
          lineas={consumos}
          familia={familiaConsumo}
          onFamilia={cambiarFamiliaConsumo}
          desde={desdeConsumo}
          hasta={hastaConsumo}
          onDesde={setDesdeConsumo}
          onHasta={setHastaConsumo}
          articulo={articuloActivo}
          articulos={opcionesArticulo}
          onArticulo={(valor) => {
            setArticuloConsumo(valor);
            setLoteArticulo("");
          }}
          lote={loteActivo}
          lotes={opcionesLoteArticulo.lista}
          haySinLote={opcionesLoteArticulo.haySinLote}
          onLote={setLoteArticulo}
          show={showConsumo}
          cols={colsConsumo}
        />
      ) : (
        <VistaComparativo
          comparativo={comparativo}
          show={showVs}
          cols={colsVs}
        />
      )}

      {informe ? (
        <DialogoInforme
          titulo={informe.titulo}
          nombreInicial={informe.nombreInicial}
          hoja={informe.hoja}
          encabezados={informe.encabezados}
          filas={informe.filas}
          filasPdf={informe.filasPdf}
          onCerrar={() => setInforme(null)}
        />
      ) : null}
    </div>
  );
}

function CardFicha({
  activa,
  titulo,
  pie,
  lineas,
  puedeExportar,
  onVer,
  onExportar,
}: {
  activa: boolean;
  titulo: string;
  pie: string;
  lineas: { label: string; valor: string }[];
  puedeExportar: boolean;
  onVer: () => void;
  onExportar: () => void;
}) {
  return (
    <div
      className={`g-card flex flex-col gap-3 p-3 ${activa ? "ring-1 ring-[var(--color-primary-muted)]" : ""}`}
    >
      <button type="button" className="text-left" onClick={onVer}>
        <p className="g-section-title">{titulo}</p>
        <p className="text-[12px] text-[var(--color-text-muted)]">{pie}</p>
      </button>
      <dl className="space-y-1.5">
        {lineas.map((linea) => (
          <div key={linea.label} className="flex justify-between gap-2 text-[13px]">
            <dt className="text-[var(--color-text-muted)]">{linea.label}</dt>
            <dd className="g-truncate text-right tabular-nums" title={linea.valor}>
              {linea.valor}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-auto flex gap-2">
        <button type="button" className="g-btn g-btn-secondary g-btn-sm" onClick={onVer}>
          Ver
        </button>
        <button
          type="button"
          className="g-btn g-btn-primary g-btn-sm"
          disabled={!puedeExportar}
          onClick={onExportar}
        >
          <IconDownload className="h-4 w-4" />
          Excel / PDF
        </button>
      </div>
    </div>
  );
}

function VistaHoja({ hoja }: { hoja: ReturnType<typeof armarHojaLote> }) {
  if (!hoja) {
    return (
      <p className="text-[13px] text-[var(--color-text-muted)]">
        Elegí un lote para ver la hoja.
      </p>
    );
  }
  const s = hoja.solicitud;
  return (
    <div className="g-stack">
      <div className="g-kpis grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi titulo="Kg producidos" valor={fmtKg(hoja.kgProducidos)} />
        <Kpi titulo="Jornadas" valor={String(hoja.jornadas.length)} />
        <Kpi titulo="Paradas" valor={fmtHs(hoja.hsParadas)} />
        <Kpi titulo="Estado" valor={s.estado_etiqueta} />
      </div>
      <div className="g-card p-3">
        <dl className="grid gap-x-4 gap-y-1.5 text-[13px] sm:grid-cols-2 lg:grid-cols-3">
          <Fila label="Lote" valor={s.lote || "—"} />
          <Fila label="Producto" valor={s.producto || "—"} />
          <Fila label="Código" valor={s.codigo_producto || "—"} />
          <Fila label="Versión" valor={s.version || "—"} />
          <Fila label="O. compra" valor={s.orden_compra || "—"} />
          <Fila label="O. producción" valor={s.orden_produccion || "—"} />
          <Fila label="Registro" valor={fechaVisible(s.fecha_registro)} />
          <Fila label="Fuente kg" valor={s.fuente_cargado === "produccion" ? "Producción" : "Solicitud"} />
        </dl>
      </div>

      <Tabla titulo="Jornadas">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Pallets</th>
            <th>Unidades</th>
            <th>Kg</th>
            <th>Hs disponibles</th>
            <th>Hs productivas</th>
            <th>Hs paradas prog.</th>
            <th>Hs paradas no prog.</th>
            <th>Kg/h</th>
          </tr>
        </thead>
        <tbody>
          {hoja.jornadas.length === 0 ? (
            <tr>
              <td colSpan={9} className="text-[var(--color-text-muted)]">
                Sin jornadas de producción para este lote.
              </td>
            </tr>
          ) : (
            hoja.jornadas.map((jornada) => (
              <tr key={jornada.id}>
                <td>{fechaVisible(jornada.fecha)}</td>
                <td className="tabular-nums">{nroVisible(jornada.pallets)}</td>
                <td className="tabular-nums">{nroVisible(jornada.unidades)}</td>
                <td className="tabular-nums">{nroVisible(jornada.kg, 1)}</td>
                <td className="tabular-nums">{fmtHs(jornada.hsDisponibles)}</td>
                <td className="tabular-nums">{fmtHs(jornada.hsProductivas)}</td>
                <td className="tabular-nums">{fmtHs(jornada.hsParadasProg)}</td>
                <td className="tabular-nums">{fmtHs(jornada.hsParadasNo)}</td>
                <td className="tabular-nums">{nroVisible(jornada.rendimientoKgH, 1)}</td>
              </tr>
            ))
          )}
        </tbody>
      </Tabla>

      <Tabla titulo="Consumos">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Ingrediente</th>
            <th>Lote artículo</th>
            <th>Cantidad</th>
            <th>Pallets</th>
          </tr>
        </thead>
        <tbody>
          {hoja.jornadas.every((item) => item.consumos.length === 0) ? (
            <tr>
              <td colSpan={5} className="text-[var(--color-text-muted)]">
                Sin consumos cargados.
              </td>
            </tr>
          ) : (
            hoja.jornadas.flatMap((jornada) =>
              jornada.consumos.map((consumo, i) => (
                <tr key={`${jornada.id}-${i}`}>
                  <td>{fechaVisible(jornada.fecha)}</td>
                  <td className="g-truncate" title={consumo.ingrediente}>
                    {consumo.ingrediente}
                  </td>
                  <td>{consumo.lote || "—"}</td>
                  <td className="tabular-nums">{nroVisible(consumo.cantidad, 2)}</td>
                  <td className="tabular-nums">
                    {consumo.palletInicio != null || consumo.palletFin != null
                      ? `${consumo.palletInicio ?? "—"}–${consumo.palletFin ?? "—"}`
                      : "—"}
                  </td>
                </tr>
              )),
            )
          )}
        </tbody>
      </Tabla>

      <Tabla titulo="Paradas">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Causa</th>
            <th>Hs progr.</th>
            <th>Hs no progr.</th>
            <th>Descripción</th>
          </tr>
        </thead>
        <tbody>
          {hoja.paradas.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-[var(--color-text-muted)]">
                Sin paradas registradas.
              </td>
            </tr>
          ) : (
            hoja.paradas.map((parada, i) => (
              <tr key={`${parada.fecha}-${parada.causa}-${i}`}>
                <td>{fechaVisible(parada.fecha)}</td>
                <td>{parada.causa}</td>
                <td className="tabular-nums">{parada.hsProg > 0 ? fmtHs(parada.hsProg) : "—"}</td>
                <td className="tabular-nums">{parada.hsNo > 0 ? fmtHs(parada.hsNo) : "—"}</td>
                <td className="g-truncate" title={parada.descripcion}>
                  {parada.descripcion || "—"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Tabla>

      <div className="grid gap-2 lg:grid-cols-3">
        <ListaSimple
          titulo="Responsables"
          vacio="Sin responsables"
          items={hoja.responsables.map((item) => `${item.rol}: ${item.nombre}`)}
        />
        <ListaSimple
          titulo="Barridos"
          vacio="Sin barridos"
          items={hoja.barridos.map((item) => `${item.ingrediente} · ${nroVisible(item.pesaje, 2)}`)}
        />
        <ListaSimple
          titulo="Limpieza"
          vacio="Sin equipos"
          items={hoja.limpieza.map((item) => item.equipo)}
        />
      </div>
    </div>
  );
}

function VistaReceta({ receta }: { receta: ReturnType<typeof armarConsumoVsReceta> }) {
  if (!receta) {
    return (
      <p className="text-[13px] text-[var(--color-text-muted)]">
        Elegí un lote para comparar consumo y receta.
      </p>
    );
  }
  return (
    <div className="g-stack">
      <div className="g-kpis grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi titulo="Kg producidos" valor={fmtKg(receta.kgProducidos)} />
        <Kpi titulo="Teórico" valor={fmtKg(receta.teoricoTotal)} />
        <Kpi titulo="Real" valor={fmtKg(receta.realTotal)} />
        <Kpi titulo="Diferencia" valor={fmtKg(receta.realTotal - receta.teoricoTotal)} />
      </div>
      {!receta.solicitud.id_version ? (
        <p className="text-[13px] text-[var(--color-text-muted)]">
          Esta solicitud no tiene versión de receta. Se listan solo los consumos cargados.
        </p>
      ) : null}
      <Tabla titulo="Ingredientes">
        <thead>
          <tr>
            <th>Ingrediente</th>
            <th>Código</th>
            <th>Tipo</th>
            <th>Participación</th>
            <th>Teórico</th>
            <th>Real</th>
            <th>Diferencia</th>
          </tr>
        </thead>
        <tbody>
          {receta.lineas.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-[var(--color-text-muted)]">
                Sin líneas de receta ni consumos de ingredientes.
              </td>
            </tr>
          ) : (
            receta.lineas.map((linea) => (
              <tr key={`${linea.idIngrediente}-${linea.enReceta ? "r" : "x"}`}>
                <td className="g-truncate" title={linea.nombre}>
                  {linea.nombre}
                  {!linea.enReceta ? (
                    <span className="g-badge g-badge-warning ml-2">Fuera de receta</span>
                  ) : null}
                </td>
                <td>{linea.codigo || "—"}</td>
                <td>{linea.tipo || "—"}</td>
                <td className="tabular-nums">{nroVisible(linea.participacion, 4)}</td>
                <td className="tabular-nums">{nroVisible(linea.teorico, 2)}</td>
                <td className="tabular-nums">{nroVisible(linea.real, 2)}</td>
                <td className="tabular-nums">{nroDec(linea.diferencia, 2)}</td>
              </tr>
            ))
          )}
        </tbody>
      </Tabla>
    </div>
  );
}

function VistaComparativo({
  comparativo,
  show,
  cols,
}: {
  comparativo: ReturnType<typeof armarSolicitudesVsProducido>;
  show: (id: string) => boolean;
  cols: ReturnType<typeof useColumnVisibility>;
}) {
  const visibles = COLS_VS.filter((col) => show(col.id)).length;
  return (
    <div className="g-stack">
      <div className="g-kpis grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi titulo="Solicitudes" valor={String(comparativo.filas.length)} />
        <Kpi titulo="Con producción" valor={String(comparativo.conProduccion)} />
        <Kpi titulo="Solicitado" valor={fmtKg(comparativo.kgSolicitados)} />
        <Kpi titulo="Producido" valor={fmtKg(comparativo.kgProducidos)} />
      </div>
      <div className="g-table-wrap">
        <div className="g-table-toolbar">
          <p className="g-section-title">Por lote</p>
          <ColumnPicker cols={cols.cols} isVisible={cols.isVisible} onToggle={cols.toggle} />
        </div>
        <div className="g-table-scroll g-table-scroll-ops">
          <table className="g-table">
            <thead>
              <tr>
                {show("lote") ? <th>Lote</th> : null}
                {show("producto") ? <th>Producto</th> : null}
                {show("oc") ? <th>O. compra</th> : null}
                {show("op") ? <th>O. producción</th> : null}
                {show("fecha") ? <th>Fecha</th> : null}
                {show("kgSol") ? <th>Kg solicitados</th> : null}
                {show("kgProd") ? <th>Kg producidos</th> : null}
                {show("dif") ? <th>Diferencia</th> : null}
                {show("cumplimiento") ? <th>Cumplimiento</th> : null}
                {show("estado") ? <th>Estado</th> : null}
                {show("fuente") ? <th>Fuente</th> : null}
              </tr>
            </thead>
            <tbody>
              {comparativo.filas.length === 0 ? (
                <tr>
                  <td colSpan={Math.max(1, visibles)} className="text-[var(--color-text-muted)]">
                    No hay solicitudes en el período.
                  </td>
                </tr>
              ) : (
                comparativo.filas.map((item) => (
                  <tr key={item.id || item.lote}>
                    {show("lote") ? (
                      <td className="g-truncate" title={item.lote}>
                        {item.lote || "—"}
                      </td>
                    ) : null}
                    {show("producto") ? (
                      <td className="g-truncate" title={item.producto}>
                        {item.producto || "—"}
                      </td>
                    ) : null}
                    {show("oc") ? <td>{item.ordenCompra || "—"}</td> : null}
                    {show("op") ? <td>{item.ordenProduccion || "—"}</td> : null}
                    {show("fecha") ? <td>{fechaVisible(item.fecha)}</td> : null}
                    {show("kgSol") ? (
                      <td className="tabular-nums">{nroVisible(item.kgSolicitados, 1)}</td>
                    ) : null}
                    {show("kgProd") ? (
                      <td className="tabular-nums">{nroVisible(item.kgProducidos, 1)}</td>
                    ) : null}
                    {show("dif") ? (
                      <td className="tabular-nums">{nroDec(item.diferencia, 1)}</td>
                    ) : null}
                    {show("cumplimiento") ? (
                      <td className="tabular-nums">
                        {item.cumplimiento == null ? "—" : fmtPct(item.cumplimiento)}
                      </td>
                    ) : null}
                    {show("estado") ? (
                      <td>
                        <span className={colorEstado(item.estado)}>{item.estadoEtiqueta}</span>
                      </td>
                    ) : null}
                    {show("fuente") ? (
                      <td>{item.fuente === "produccion" ? "Producción" : "Solicitud"}</td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function nombreArticulo(item: ConsumoLinea) {
  if (item.codigo && item.articulo && item.codigo !== item.articulo) return `${item.codigo} — ${item.articulo}`;
  return item.articulo || item.codigo || "—";
}

function VistaConsumo({
  lineas,
  familia,
  onFamilia,
  desde,
  hasta,
  onDesde,
  onHasta,
  articulo,
  articulos,
  onArticulo,
  lote,
  lotes,
  haySinLote,
  onLote,
  show,
  cols,
}: {
  lineas: ConsumoLinea[];
  familia: FiltroFamiliaConsumo;
  onFamilia: (familia: FiltroFamiliaConsumo) => void;
  desde: string;
  hasta: string;
  onDesde: (valor: string) => void;
  onHasta: (valor: string) => void;
  articulo: string;
  articulos: { id: string; etiqueta: string }[];
  onArticulo: (valor: string) => void;
  lote: string;
  lotes: string[];
  haySinLote: boolean;
  onLote: (valor: string) => void;
  show: (id: string) => boolean;
  cols: ReturnType<typeof useColumnVisibility>;
}) {
  const visibles = COLS_CONSUMO.filter((col) => show(col.id)).length;
  return (
    <div className="g-stack">
      <div className="g-table-wrap">
        <div className="g-table-toolbar">
          <div className="g-filters">
            <label>
              <span className="g-label">Tipo</span>
              <select
                className="g-input"
                value={familia}
                onChange={(e) => onFamilia(e.target.value as FiltroFamiliaConsumo)}
              >
                {FAMILIAS_CONSUMO.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="g-label">Fecha desde</span>
              <input type="date" className="g-input" value={desde} onChange={(e) => onDesde(e.target.value)} />
            </label>
            <label>
              <span className="g-label">Fecha hasta</span>
              <input type="date" className="g-input" value={hasta} onChange={(e) => onHasta(e.target.value)} />
            </label>
            <label>
              <span className="g-label">Artículo</span>
              <select className="g-input" value={articulo} onChange={(e) => onArticulo(e.target.value)}>
                <option value="">Todos</option>
                {articulos.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.etiqueta}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="g-label">Lote del artículo</span>
              <select className="g-input" value={lote} onChange={(e) => onLote(e.target.value)}>
                <option value="">Todos</option>
                {haySinLote ? <option value={SIN_LOTE_ARTICULO}>Sin lote</option> : null}
                {lotes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <ColumnPicker cols={cols.cols} isVisible={cols.isVisible} onToggle={cols.toggle} />
        </div>
        <div className="g-table-scroll g-table-scroll-ops">
          <table className="g-table">
            <thead>
              <tr>
                {show("fecha") ? <th>Fecha</th> : null}
                {show("familia") ? <th>Tipo</th> : null}
                {show("articulo") ? <th>Artículo</th> : null}
                {show("loteArt") ? <th>Lote artículo</th> : null}
                {show("cantidad") ? <th>Cantidad</th> : null}
                {show("loteProd") ? <th>Lote producto</th> : null}
                {show("producto") ? <th>Producto</th> : null}
              </tr>
            </thead>
            <tbody>
              {lineas.length === 0 ? (
                <tr>
                  <td colSpan={Math.max(1, visibles)} className="text-[var(--color-text-muted)]">
                    No hay consumos en el período con estos filtros.
                  </td>
                </tr>
              ) : (
                lineas.map((item) => (
                  <tr key={item.id}>
                    {show("fecha") ? <td>{fechaVisible(item.fecha)}</td> : null}
                    {show("familia") ? <td>{etiquetaFamiliaConsumo(item.familia)}</td> : null}
                    {show("articulo") ? (
                      <td className="g-truncate" title={nombreArticulo(item)}>
                        {nombreArticulo(item)}
                      </td>
                    ) : null}
                    {show("loteArt") ? <td>{item.loteArticulo || "—"}</td> : null}
                    {show("cantidad") ? (
                      <td className="tabular-nums">
                        {nroVisible(item.cantidad, 3)} {item.unidad}
                      </td>
                    ) : null}
                    {show("loteProd") ? <td>{item.loteProducto || "—"}</td> : null}
                    {show("producto") ? (
                      <td className="g-truncate" title={item.producto}>
                        {item.producto || "—"}
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[12px] text-[var(--color-text-muted)]">
        El lote del artículo queda vacío cuando el consumo se registró sin lote. El lote del producto es el de la solicitud.
      </p>
    </div>
  );
}

function Tabla({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="g-table-wrap">
      <div className="g-table-toolbar">
        <p className="g-section-title">{titulo}</p>
      </div>
      <div className="g-table-scroll">
        <table className="g-table">{children}</table>
      </div>
    </div>
  );
}

function ListaSimple({
  titulo,
  vacio,
  items,
}: {
  titulo: string;
  vacio: string;
  items: string[];
}) {
  return (
    <div className="g-card p-3">
      <p className="g-section-title">{titulo}</p>
      {items.length === 0 ? (
        <p className="mt-2 text-[13px] text-[var(--color-text-muted)]">{vacio}</p>
      ) : (
        <ul className="mt-2 space-y-1 text-[13px]">
          {items.map((item) => (
            <li key={item} className="g-truncate" title={item}>
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Kpi({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="g-kpi">
      <p className="g-kpi-title">{titulo}</p>
      <p className="g-kpi-value">{valor}</p>
    </div>
  );
}

function Fila({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-[var(--color-text-muted)]">{label}</dt>
      <dd className="g-truncate text-right" title={valor}>
        {valor}
      </dd>
    </div>
  );
}
