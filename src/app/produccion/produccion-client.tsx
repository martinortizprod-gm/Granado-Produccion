"use client";

import { useMemo, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ColumnPicker } from "@/components/ui/column-picker";
import { DialogoInforme } from "@/components/ui/informe";
import { type ColDef, useColumnVisibility } from "@/components/ui/use-column-visibility";
import { IconCalculator, IconCalendar, IconCheck, IconChevron, IconEye, IconFactory, IconFile, IconList, IconPackage, IconPencil, IconPlus, IconTrash, IconUserPlus } from "@/components/ui/icons";
import { agregarCatalogoPrevio, eliminarJornada, guardarPrevios, registrarJornada } from "@/app/produccion/actions";
import { PanelDetalle, PanelInformeStock, PanelPlan } from "@/app/produccion/produccion-informes";
import {
  CierreVista,
  DatosProduccion,
  ETIQUETA_PARADAS,
  LoteConsumo,
  ParadaCarga,
  activas,
  calcularHoras,
  catalogoActivo,
  cierresDeSolicitud,
  esRolProduccion,
  etiquetaSolicitud,
  estadoCompletada,
  kgElaborados,
  kgNecesarios,
  lotesEditables,
  nroDec,
  pendientesInforme,
  precargaJornada,
  rangosDeLotes,
  rendimiento,
  unidadesElaboradas,
} from "@/lib/produccion/logic";
import { hoyIso } from "@/lib/planificacion/logic";
import { SolicitudVista, fechaVisible, nroVisible, numero } from "@/lib/solicitudes/logic";

type FilaLote = { lote: string; cantidad: string };
type FilaParada = { idCausa: string; tiempo: string; descripcion: string };

const PAGINA = 50;

const COLS_JORNADAS: ColDef[] = [
  { id: "oc", label: "O. Compra" },
  { id: "op", label: "O. Prod." },
  { id: "codigo", label: "Código" },
  { id: "producto", label: "Nombre del producto" },
  { id: "kgSol", label: "Kg solicitados" },
  { id: "peso", label: "Peso unitario" },
  { id: "lote", label: "Lote" },
  { id: "fecha", label: "Fecha" },
  { id: "pallet", label: "Pallet" },
  { id: "unidades", label: "Unidades" },
  { id: "kg", label: "Kg" },
  { id: "acciones", label: "Acciones", locked: true },
];

function fechaLarga(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  const texto = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function ProduccionClient({ datos, puedeEditar }: { datos: DatosProduccion; puedeEditar: boolean }) {
  const router = useRouter();
  const cols = useColumnVisibility("produccion-jornadas", COLS_JORNADAS);
  const show = cols.isVisible;
  const [pendiente, start] = useTransition();
  const [sel, setSel] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [fecha, setFecha] = useState(hoyIso());
  const [pallets, setPallets] = useState("");
  const [hs, setHs] = useState("");
  const [prog, setProg] = useState<FilaParada[]>([]);
  const [noProg, setNoProg] = useState<FilaParada[]>([]);
  const [operarios, setOperarios] = useState<number[]>([]);
  const [encargado, setEncargado] = useState("");
  const [limpieza, setLimpieza] = useState<number[]>([]);
  const [lotes, setLotes] = useState<Record<string, FilaLote[]>>({});
  const [aplica, setAplica] = useState<Record<string, boolean>>({});
  const [barridoIng, setBarridoIng] = useState("");
  const [barridoKg, setBarridoKg] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [pagina, setPagina] = useState(1);
  const [panel, setPanel] = useState<null | "stock" | "plan" | "export">(null);
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [alta, setAlta] = useState<null | "operario" | "encargado" | "equipo" | "causa">(null);
  const [previosCerrados, setPreviosCerrados] = useState(false);
  const [altaNombre, setAltaNombre] = useState("");
  const [altaApellido, setAltaApellido] = useState("");

  const opciones = activas(datos.solicitudes);
  const solicitud: SolicitudVista | null =
    sel && sel !== "paradas" ? datos.solicitudes.find((item) => String(item.id) === sel) ?? null : null;
  const sinProduccion = sel === "paradas";
  const detalle = editId != null ? datos.detalles[String(editId)] : undefined;
  const formula = solicitud ? datos.formulas[String(solicitud.id_version ?? "")] ?? [] : [];
  const previo = solicitud ? datos.previos[String(solicitud.id)] : undefined;
  const bloqueado = !puedeEditar || previosCerrados;
  const listaOperarios = datos.usuarios.filter(
    (usuario) => catalogoActivo(usuario.estado) && (esRolProduccion(usuario, "operario") || operarios.includes(usuario.id)),
  );
  const listaEncargados = datos.usuarios.filter(
    (usuario) => catalogoActivo(usuario.estado) && (esRolProduccion(usuario, "encargado") || String(usuario.id) === encargado),
  );
  const listaEquipos = datos.equipos.filter((equipo) => catalogoActivo(equipo.estado) || limpieza.includes(equipo.id));
  const palN = numero(pallets);
  const hsN = numero(hs);
  const paradasProg = aParadas(prog);
  const paradasNo = aParadas(noProg);
  const horas = calcularHoras(hsN, paradasProg, paradasNo);
  const kg = solicitud ? kgElaborados(solicitud, palN) : 0;
  const unidades = solicitud ? unidadesElaboradas(solicitud, palN) : 0;
  const rend = rendimiento(kg, horas.hsProd);
  const palletInicial = detalle?.palletInicial ?? (solicitud ? Math.round(solicitud.pallets_cargados) + 1 : 1);
  const completada = solicitud ? estadoCompletada(solicitud.estado) && editId == null : false;
  const lotesDisponibles = useMemo(() => lotesEditables(datos, detalle ?? null), [datos, detalle]);
  const cierres = useMemo(() => (solicitud ? cierresDeSolicitud(datos, solicitud) : []), [datos, solicitud]);

  const visibles = useMemo(() => {
    return datos.jornadas.filter((jornada) => {
      if (desde && (jornada.fecha ?? "") < desde) return false;
      if (hasta && (jornada.fecha ?? "") > hasta) return false;
      return true;
    });
  }, [datos.jornadas, desde, hasta]);
  const paginas = Math.max(1, Math.ceil(visibles.length / PAGINA));
  const paginaSegura = Math.min(pagina, paginas);
  const filas = visibles.slice((paginaSegura - 1) * PAGINA, paginaSegura * PAGINA);
  const pendientes = useMemo(
    () => [...pendientesInforme(datos.jornadas, visibles).entries()],
    [datos.jornadas, visibles],
  );
  const kpis = {
    pendientes: datos.solicitudes.filter((item) => item.estado === "pendiente").length,
    curso: datos.solicitudes.filter((item) => item.estado === "en_produccion").length,
    completadas: datos.solicitudes.filter((item) => item.estado === "completada").length,
    pallets: activas(datos.solicitudes).reduce((s, item) => s + item.pallets_pendientes, 0),
  };

  function elegir(valor: string) {
    setError("");
    setSel(valor);
    setEditId(null);
    const item = valor && valor !== "paradas" ? datos.solicitudes.find((sol) => String(sol.id) === valor) : null;
    const base = item ? datos.previos[String(item.id)] : undefined;
    const hoy = hoyIso();
    setFecha(hoy);
    setPallets(item && item.pallets_pendientes > 0.0005 ? String(item.pallets_pendientes) : "");
    const precarga = valor ? precargaJornada(hoy) : null;
    setHs(precarga ? String(precarga.horas) : "");
    setProg(precarga ? precarga.paradas.map((p) => ({ idCausa: String(p.idCausa), tiempo: String(p.tiempo), descripcion: "" })) : []);
    setNoProg([]);
    setOperarios(base?.operarios ?? []);
    setEncargado(base?.encargado != null ? String(base.encargado) : "");
    const libre = datos.limpiezaLibre.filter((fila) => fila.fecha === hoy).map((fila) => fila.idEquipo);
    setLimpieza(valor === "paradas" ? libre : base?.limpieza ?? []);
    const mapa: Record<string, FilaLote[]> = {};
    for (const linea of item ? datos.formulas[String(item.id_version ?? "")] ?? [] : []) {
      mapa[String(linea.idIngrediente)] = [{ lote: "", cantidad: "" }];
    }
    setLotes(mapa);
    const flags: Record<string, boolean> = {};
    for (const insumo of datos.consumibles) flags[insumo.codigo] = insumo.aplica;
    setAplica(flags);
    setBarridoIng("");
    setBarridoKg("");
    setPreviosCerrados(false);
    setAlta(null);
  }

  function editar(id: number) {
    const det = datos.detalles[String(id)];
    if (!det) return;
    setError("");
    setEditId(id);
    setSel(det.idSolicitud == null ? "paradas" : String(det.idSolicitud));
    const item = det.idSolicitud != null ? datos.solicitudes.find((sol) => sol.id === det.idSolicitud) : null;
    const base = item ? datos.previos[String(item.id)] : undefined;
    setFecha(det.fecha ?? hoyIso());
    setPallets(det.pallets > 0 ? String(det.pallets) : "");
    setHs(det.hsDisponibles > 0 ? String(det.hsDisponibles) : "");
    setProg(det.paradasProg.map((p) => ({ idCausa: String(p.idCausa), tiempo: String(p.tiempo), descripcion: p.descripcion })));
    setNoProg(det.paradasNo.map((p) => ({ idCausa: String(p.idCausa), tiempo: String(p.tiempo), descripcion: p.descripcion })));
    setOperarios(base?.operarios ?? []);
    setEncargado(base?.encargado != null ? String(base.encargado) : "");
    const libre = datos.limpiezaLibre.filter((fila) => fila.fecha === det.fecha).map((fila) => fila.idEquipo);
    setLimpieza(det.idSolicitud == null ? libre : base?.limpieza ?? []);
    const mapa: Record<string, FilaLote[]> = {};
    const lineas = item ? datos.formulas[String(item.id_version ?? "")] ?? [] : [];
    for (const linea of lineas) {
      const propios = det.lotes.filter((lote) => lote.idIngrediente === linea.idIngrediente);
      mapa[String(linea.idIngrediente)] = propios.length
        ? propios.map((lote) => ({ lote: lote.lote, cantidad: String(lote.cantidad) }))
        : [{ lote: "", cantidad: "" }];
    }
    setLotes(mapa);
    const flags: Record<string, boolean> = {};
    for (const insumo of datos.consumibles) {
      const uso = det.extra.insumos.some((itemIns) => itemIns.codigo === insumo.codigo && itemIns.cantidad > 0.0005);
      flags[insumo.codigo] = det.idSolicitud == null ? insumo.aplica : uso || (det.pallets <= 0 && insumo.aplica);
    }
    if (det.aplicaCorrugado) flags["INS-403"] = true;
    if (det.aplicaDuro) flags["INS-404"] = true;
    if (det.aplicaExportacion) flags["INS-405"] = true;
    setAplica(flags);
    setBarridoIng("");
    setBarridoKg("");
    setPreviosCerrados(false);
    setAlta(null);
  }

  function guardar(e: FormEvent) {
    e.preventDefault();
    if (!puedeEditar || completada) return;
    setError("");
    const lotesPayload: LoteConsumo[] = [];
    if (solicitud) {
      for (const linea of formula) {
        const filas = lotes[String(linea.idIngrediente)] ?? [];
        const cantidades = filas.map((fila) => (fila.lote ? numero(fila.cantidad) : 0));
        const kgPallet = linea.participacion * solicitud.unidades_por_pallets * solicitud.peso_unitario;
        const rangos = rangosDeLotes(cantidades, kgPallet, palN, palletInicial);
        filas.forEach((fila, indice) => {
          if (!fila.lote || numero(fila.cantidad) <= 0) return;
          lotesPayload.push({
            idIngrediente: linea.idIngrediente,
            articulo: linea.etiqueta,
            lote: fila.lote,
            cantidad: numero(fila.cantidad),
            palletInicio: rangos[indice]?.inicio ?? null,
            palletFin: rangos[indice]?.fin ?? null,
          });
        });
      }
    }
    start(async () => {
      try {
        await registrarJornada({
          idProduccion: editId,
          idSolicitud: sinProduccion ? null : solicitud?.id ?? null,
          fecha,
          pallets: palN,
          hsDisponibles: hsN,
          paradasProg,
          paradasNo,
          idsOperarios: operarios,
          idEncargado: encargado ? Number(encargado) : null,
          idsLimpieza: limpieza,
          lotes: lotesPayload,
          consumibles: datos.consumibles.map((insumo) => ({ codigo: insumo.codigo, aplica: !!aplica[insumo.codigo] })),
          barrido:
            barridoIng && numero(barridoKg) > 0 ? { idIngrediente: Number(barridoIng), pesaje: numero(barridoKg) } : null,
        });
        setSel("");
        setEditId(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo registrar la jornada.");
      }
    });
  }

  function borrar(id: number) {
    if (!puedeEditar || !confirm("¿Eliminar esta producción?")) return;
    setError("");
    start(async () => {
      try {
        await eliminarJornada(id);
        if (editId === id) {
          setSel("");
          setEditId(null);
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo eliminar.");
      }
    });
  }

  function crearPrevio() {
    if (!alta) return;
    setError("");
    const tipo = alta === "operario" || alta === "encargado" ? "usuario" : alta;
    const rol = alta === "encargado" ? "encargado" : "operario";
    start(async () => {
      try {
        await agregarCatalogoPrevio(tipo, altaNombre, altaApellido, rol);
        setAlta(null);
        setAltaNombre("");
        setAltaApellido("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo agregar.");
      }
    });
  }

  function aplicarPrevios() {
    if (!solicitud?.id) return;
    setError("");
    start(async () => {
      try {
        await guardarPrevios({
          idSolicitud: solicitud.id as number,
          idsOperarios: operarios,
          idEncargado: encargado ? Number(encargado) : null,
          idsLimpieza: limpieza,
          barrido:
            barridoIng && numero(barridoKg) > 0
              ? { idIngrediente: Number(barridoIng), pesaje: numero(barridoKg) }
              : null,
        });
        setBarridoIng("");
        setBarridoKg("");
        setPreviosCerrados(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron guardar los datos previos.");
      }
    });
  }

  const filasExport = useMemo(() => {
    const mapa = new Map(pendientes);
    return [...visibles]
      .sort((a, b) => (a.fecha ?? "").localeCompare(b.fecha ?? "") || a.id - b.id)
      .map((jornada) => {
        const pend = mapa.get(jornada.id);
        const ultima = pend?.ultima ?? false;
        return [
          jornada.ordenCompra,
          jornada.ordenProduccion,
          jornada.codigoProducto,
          jornada.producto,
          jornada.kgSolicitados,
          jornada.pesoUnitario,
          jornada.envase,
          jornada.lote,
          fechaVisible(jornada.fecha),
          jornada.pallets,
          jornada.unidades,
          jornada.kg,
          ultima ? pend?.pal ?? 0 : 0,
          ultima ? pend?.un ?? 0 : 0,
          ultima ? pend?.kg ?? 0 : 0,
        ];
      });
  }, [visibles, pendientes]);

  return (
    <div className="g-stack">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[var(--color-primary)] text-white">
            <IconFactory className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="g-page-title">Producción</h1>
            <p className="g-page-subtitle">Registro de jornada, consumos y datos previos de cada lote</p>
          </div>
        </div>
        <p className="flex items-center gap-2 text-[13px] text-[var(--color-text-secondary)]">
          <IconCalendar className="h-4 w-4 text-[var(--color-text-muted)]" />
          {fechaLarga(hoyIso())}
        </p>
      </div>
      {datos.error && <p className="text-[13px] text-[var(--color-danger)]">{datos.error}</p>}
      {error && <p className="text-[13px] text-[var(--color-danger)]">{error}</p>}

      <div className="g-kpis grid grid-cols-2 gap-2 xl:grid-cols-4">
        <Tarjeta tono="mint" icono={<IconCheck className="h-5 w-5" />} titulo="Pendientes" valor={String(kpis.pendientes)} pie="Aún sin completar" />
        <Tarjeta tono="blue" icono={<IconFactory className="h-5 w-5" />} titulo="En producción" valor={String(kpis.curso)} pie="Con consumo cargado" />
        <Tarjeta tono="violet" icono={<IconCheck className="h-5 w-5" />} titulo="Completadas" valor={String(kpis.completadas)} pie="Lote cerrado" />
        <Tarjeta tono="sage" icono={<IconPackage className="h-5 w-5" />} titulo="Pallets pendientes" valor={nroVisible(kpis.pallets)} pie="De solicitudes activas" />
      </div>

      <div className="g-card space-y-2 p-4">
        <label className="block text-[12px] text-[var(--color-text-muted)]">
          Solicitud pendiente
          <select className="g-input mt-1" value={sel} onChange={(e) => elegir(e.target.value)}>
            <option value="">Elegí una solicitud pendiente</option>
            <option value="paradas">{ETIQUETA_PARADAS}</option>
            {opciones.map((item) => (
              <option key={item.id} value={String(item.id)}>
                {etiquetaSolicitud(item)}
              </option>
            ))}
            {solicitud && !opciones.some((item) => item.id === solicitud.id) && (
              <option value={String(solicitud.id)}>{etiquetaSolicitud(solicitud)}</option>
            )}
          </select>
        </label>
      </div>

      {sel && (
        <form className="g-stack" onSubmit={guardar}>
          {solicitud && (
            <section className="g-card space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="g-section-title">Solicitud de producción</h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="g-btn g-btn-primary"
                    style={{ width: 34, height: 34, padding: 0 }}
                    title="Plan de dosificación"
                    aria-label="Plan de dosificación"
                    onClick={() => setPanel("plan")}
                  >
                    <IconCalculator className="mx-auto h-4 w-4" />
                  </button>
                  <span className="rounded-full border border-[var(--color-border)] px-3 py-1 text-[11px] font-semibold tracking-wide">
                    {solicitud.estado_etiqueta.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="grid gap-3 text-[13px] sm:grid-cols-2 lg:grid-cols-4">
                <Dato etiqueta="Lote" valor={solicitud.lote} fuerte />
                <Dato etiqueta="O. compra" valor={solicitud.orden_compra} fuerte />
                <Dato etiqueta="O. producción" valor={solicitud.orden_produccion} fuerte />
                <Dato etiqueta="Versión" valor={solicitud.version} fuerte />
              </div>
              <div className="grid gap-3 text-[13px] sm:grid-cols-2">
                <Dato etiqueta="Producto" valor={`${solicitud.codigo_producto} ${solicitud.producto}`.trim()} fuerte />
                <Dato etiqueta="Envase" valor={solicitud.envase} fuerte />
              </div>
              <Dato etiqueta="Etiquetas" valor={solicitud.nombre_etiqueta} fuerte />
              <div className="grid gap-3 text-[13px] sm:grid-cols-3">
                <Dato etiqueta="Unidades solicitadas" valor={nroDec(solicitud.unidades_solicitadas, 0)} fuerte />
                <Dato etiqueta="Pallets solicitados" valor={nroDec(solicitud.pallets_solicitados, 0)} fuerte />
                <Dato etiqueta="Kg solicitados" valor={nroDec(solicitud.kg_solicitados)} fuerte />
              </div>
              <div className="grid gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-3 text-[13px] sm:grid-cols-3">
                <Dato etiqueta="Unidades elaboradas" valor={nroDec(solicitud.unidades_cargadas, 0)} fuerte />
                <Dato etiqueta="Pallets elaborados" valor={nroDec(solicitud.pallets_cargados, 0)} fuerte />
                <Dato etiqueta="Kg elaborados" valor={nroDec(solicitud.kg_cargados)} fuerte />
                <Dato etiqueta="Unidades pendientes" valor={nroDec(solicitud.unidades_pendientes, 0)} fuerte />
                <Dato etiqueta="Pallets pendientes" valor={nroDec(solicitud.pallets_pendientes, 0)} fuerte />
                <Dato etiqueta="Kg pendientes" valor={nroDec(solicitud.kg_pendientes)} fuerte />
              </div>
            </section>
          )}

          {completada ? (
            <section className="g-card p-4">
              <p className="font-semibold text-[var(--color-primary)]">Producción finalizada</p>
              <p className="text-[13px] text-[var(--color-text-muted)]">Este lote ya está completo. No se puede cargar un cierre nuevo.</p>
            </section>
          ) : (
            <>
              <section className="g-card space-y-3 p-4">
                <h2 className="g-section-title">Datos previos</h2>
                {alta && alta !== "causa" && (
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="text-[12px]">
                      Nombre
                      <input className="g-input" value={altaNombre} onChange={(e) => setAltaNombre(e.target.value)} />
                    </label>
                    {(alta === "operario" || alta === "encargado") && (
                      <label className="text-[12px]">
                        Apellido
                        <input className="g-input" value={altaApellido} onChange={(e) => setAltaApellido(e.target.value)} />
                      </label>
                    )}
                    <button type="button" className="g-btn g-btn-primary h-9" disabled={pendiente} onClick={crearPrevio}>
                      Agregar
                    </button>
                    <button type="button" className="g-btn g-btn-secondary h-9" onClick={() => setAlta(null)}>
                      Cancelar
                    </button>
                  </div>
                )}
                <div className="grid gap-3 md:grid-cols-2">
                  {!sinProduccion && (
                    <CajaPrevia
                      titulo="Operarios"
                      accion={
                        puedeEditar ? (
                          <button type="button" className="g-btn g-btn-icon h-7 w-7" title="Agregar operario" aria-label="Agregar operario" onClick={() => setAlta("operario")}>
                            <IconUserPlus className="h-4 w-4" />
                          </button>
                        ) : null
                      }
                    >
                      <div className="max-h-40 space-y-1 overflow-auto">
                        {listaOperarios.length === 0 && (
                          <p className="text-[12px] text-[var(--color-text-muted)]">No hay operarios activos.</p>
                        )}
                        {listaOperarios.map((usuario) => (
                          <label key={usuario.id} className="flex items-center gap-2 text-[13px]">
                            <input
                              type="checkbox"
                              disabled={bloqueado}
                              checked={operarios.includes(usuario.id)}
                              onChange={(e) =>
                                setOperarios((actual) =>
                                  e.target.checked ? [...actual, usuario.id] : actual.filter((id) => id !== usuario.id),
                                )
                              }
                            />
                            {usuario.etiqueta}
                          </label>
                        ))}
                      </div>
                    </CajaPrevia>
                  )}
                  {!sinProduccion && (
                    <CajaPrevia
                      titulo="Encargado de producción"
                      accion={
                        puedeEditar ? (
                          <button type="button" className="g-btn g-btn-icon h-7 w-7" title="Agregar encargado" aria-label="Agregar encargado" onClick={() => setAlta("encargado")}>
                            <IconUserPlus className="h-4 w-4" />
                          </button>
                        ) : null
                      }
                    >
                      <div className="max-h-40 space-y-1 overflow-auto">
                        {listaEncargados.length === 0 && (
                          <p className="text-[12px] text-[var(--color-text-muted)]">No hay encargados activos.</p>
                        )}
                        {listaEncargados.map((usuario) => (
                          <label key={usuario.id} className="flex items-center gap-2 text-[13px]">
                            <input
                              type="radio"
                              name="encargado-produccion"
                              disabled={bloqueado}
                              checked={encargado === String(usuario.id)}
                              onChange={() => setEncargado(String(usuario.id))}
                            />
                            {usuario.etiqueta}
                          </label>
                        ))}
                      </div>
                    </CajaPrevia>
                  )}
                  <CajaPrevia
                    titulo="Limpieza de equipos"
                    accion={
                      puedeEditar ? (
                        <button type="button" className="g-btn g-btn-icon h-7 w-7" title="Agregar equipo" aria-label="Agregar equipo" onClick={() => setAlta("equipo")}>
                          <IconUserPlus className="h-4 w-4" />
                        </button>
                      ) : null
                    }
                  >
                    <div className="max-h-48 space-y-1 overflow-auto">
                      {listaEquipos.length === 0 && (
                        <p className="text-[12px] text-[var(--color-text-muted)]">No hay equipos activos.</p>
                      )}
                      {listaEquipos.map((equipo) => (
                        <label key={equipo.id} className="flex items-center gap-2 text-[13px]">
                          <input
                            type="checkbox"
                            disabled={bloqueado}
                            checked={limpieza.includes(equipo.id)}
                            onChange={(e) =>
                              setLimpieza((actual) =>
                                e.target.checked ? [...actual, equipo.id] : actual.filter((id) => id !== equipo.id),
                              )
                            }
                          />
                          {equipo.nombre}
                        </label>
                      ))}
                    </div>
                  </CajaPrevia>
                  {!sinProduccion && (
                    <CajaPrevia titulo="Barrido de línea">
                      <div className="grid gap-2 sm:grid-cols-[1fr_90px]">
                        <select className="g-input" disabled={bloqueado} value={barridoIng} onChange={(e) => setBarridoIng(e.target.value)}>
                          <option value="">Elegí un ingrediente</option>
                          {datos.ingredientes.map((ing) => (
                            <option key={ing.id} value={ing.id}>
                              {ing.etiqueta}
                            </option>
                          ))}
                        </select>
                        <input className="g-input" disabled={bloqueado} placeholder="Kg" value={barridoKg} onChange={(e) => setBarridoKg(e.target.value)} />
                      </div>
                      {previo && previo.barridos.length > 0 && (
                        <p className="mt-2 text-[12px] text-[var(--color-text-muted)]">
                          Ya cargados:{" "}
                          {previo.barridos
                            .map((item) => {
                              const ing = datos.ingredientes.find((op) => op.id === item.idIngrediente);
                              return `${ing?.etiqueta ?? item.idIngrediente} ${nroDec(item.pesaje)} kg`;
                            })
                            .join(" · ")}
                        </p>
                      )}
                    </CajaPrevia>
                  )}
                </div>
                {!sinProduccion && puedeEditar && (
                  <div className="flex justify-end gap-2">
                    <button type="button" className="g-btn g-btn-primary h-9" disabled={pendiente || bloqueado} onClick={aplicarPrevios}>
                      Aplicar
                    </button>
                    <button
                      type="button"
                      className="g-btn h-9 text-white"
                      style={{ background: "var(--color-warning)" }}
                      onClick={() => setPreviosCerrados(false)}
                    >
                      Editar
                    </button>
                  </div>
                )}
              </section>

              {!sinProduccion && (
                <section className="g-card space-y-2 p-4">
                  <h2 className="g-section-title">Consumibles</h2>
                  <div className="flex flex-wrap gap-4">
                    {datos.consumibles.map((insumo) => (
                      <label key={insumo.codigo} className="flex items-center gap-2 text-[13px]">
                        <input
                          type="checkbox"
                          checked={!!aplica[insumo.codigo]}
                          onChange={(e) => setAplica((actual) => ({ ...actual, [insumo.codigo]: e.target.checked }))}
                        />
                        {insumo.codigo} — {insumo.nombre}
                      </label>
                    ))}
                  </div>
                </section>
              )}

              {!sinProduccion && solicitud && (
                <section className="g-card space-y-3 p-4">
                  <h2 className="g-section-title">Cierres anteriores</h2>
                  <CierresAnteriores cierres={cierres} ocultarPendientes={completada} />
                </section>
              )}

              {!sinProduccion && (
                <section className="g-card space-y-3 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="g-section-title">Ingredientes</h2>
                    <label className="flex items-center gap-2 text-[12px]">
                      Pallets elaborados
                      <input className="g-input h-8 w-24" value={pallets} onChange={(e) => setPallets(e.target.value)} />
                    </label>
                  </div>
                  {formula.length === 0 && (
                    <p className="text-[13px] text-[var(--color-text-muted)]">La versión no tiene receta cargada.</p>
                  )}
                  {formula.map((linea) => {
                    const necesario = kgNecesarios(linea, kg);
                    const filasIng = lotes[String(linea.idIngrediente)] ?? [];
                    const opcionesLote = (lotesDisponibles[String(linea.idIngrediente)] ?? []).filter((lote) => lote.stock >= 0.005);
                    const kgPallet = linea.participacion * (solicitud?.unidades_por_pallets ?? 0) * (solicitud?.peso_unitario ?? 0);
                    const rangos = rangosDeLotes(
                      filasIng.map((fila) => (fila.lote ? numero(fila.cantidad) : 0)),
                      kgPallet,
                      palN,
                      palletInicial,
                    );
                    const cargado = filasIng.reduce((suma, fila) => suma + (fila.lote ? numero(fila.cantidad) : 0), 0);
                    const faltante = necesario - cargado;
                    const stockTotal = opcionesLote.reduce((suma, lote) => suma + Math.max(0, lote.stock), 0);
                    const avisoFaltante =
                      faltante > 0.01 && cargado > 0.0005
                        ? stockTotal + 0.01 < necesario
                          ? `Stock insuficiente · faltan ${nroDec(faltante)} kg`
                          : `Faltan ${nroDec(faltante)} kg`
                        : "";
                    return (
                      <div key={linea.idIngrediente} className="space-y-1 border-t border-[var(--color-border)] pt-2">
                        <div className="flex flex-wrap items-start justify-between gap-2 text-[13px]">
                          <span className="font-semibold">{linea.etiqueta}</span>
                          <span className="text-right">
                            <span className="block">Necesario {nroDec(necesario)} kg</span>
                            {avisoFaltante && <span className="block text-[12px] text-[var(--color-warning)]">{avisoFaltante}</span>}
                          </span>
                        </div>
                        {filasIng.map((fila, indice) => {
                          const usados = filasIng.filter((otra, i) => i !== indice && otra.lote).map((otra) => otra.lote);
                          const opcionesFila = opcionesLote.filter((lote) => lote.lote === fila.lote || !usados.includes(lote.lote));
                          return (
                          <div key={indice} className="grid items-end gap-2 sm:grid-cols-[1fr_120px_90px_90px_auto]">
                            <select
                              className="g-input"
                              value={fila.lote}
                              onChange={(e) => cambiarLote(linea.idIngrediente, indice, { lote: e.target.value })}
                            >
                              <option value="">{opcionesFila.length ? "Elegí un lote" : "Sin lotes con stock"}</option>
                              {opcionesFila.map((lote) => (
                                <option key={lote.lote} value={lote.lote}>
                                  {lote.lote} · {nroDec(lote.stock)} kg
                                </option>
                              ))}
                              {fila.lote && !opcionesLote.some((lote) => lote.lote === fila.lote) && (
                                <option value={fila.lote}>{fila.lote}</option>
                              )}
                            </select>
                            <input
                              className="g-input"
                              placeholder="Cantidad"
                              value={fila.lote ? fila.cantidad : ""}
                              disabled={!fila.lote}
                              onChange={(e) => cambiarLote(linea.idIngrediente, indice, { cantidad: e.target.value })}
                            />
                            <span className="text-[12px] text-[var(--color-text-muted)]">Inicio {rangos[indice]?.inicio ?? "—"}</span>
                            <span className="text-[12px] text-[var(--color-text-muted)]">Fin {rangos[indice]?.fin ?? "—"}</span>
                            <button
                              type="button"
                              className="g-btn g-btn-icon g-btn-icon-danger h-8 w-8"
                              aria-label="Quitar lote"
                              onClick={() =>
                                setLotes((actual) => ({
                                  ...actual,
                                  [String(linea.idIngrediente)]: filasIng.filter((_, i) => i !== indice),
                                }))
                              }
                            >
                              <IconTrash className="h-4 w-4" />
                            </button>
                          </div>
                          );
                        })}
                        <button
                          type="button"
                          className="g-btn g-btn-secondary h-8"
                          onClick={() =>
                            setLotes((actual) => ({
                              ...actual,
                              [String(linea.idIngrediente)]: [...filasIng, { lote: "", cantidad: "" }],
                            }))
                          }
                        >
                          <IconPlus className="h-4 w-4" /> Lote
                        </button>
                      </div>
                    );
                  })}
                </section>
              )}

              <section className="g-card space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <h2 className="g-section-title">Jornada</h2>
                  {puedeEditar && (
                    <button type="button" className="g-btn g-btn-secondary h-8" onClick={() => setAlta("causa")}>
                      Causa
                    </button>
                  )}
                </div>
                {alta === "causa" && (
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="text-[12px]">
                      Nombre
                      <input className="g-input" value={altaNombre} onChange={(e) => setAltaNombre(e.target.value)} />
                    </label>
                    <button type="button" className="g-btn g-btn-primary h-9" disabled={pendiente} onClick={crearPrevio}>
                      Agregar
                    </button>
                    <button type="button" className="g-btn g-btn-secondary h-9" onClick={() => setAlta(null)}>
                      Cancelar
                    </button>
                  </div>
                )}
                <div className="grid max-w-xl gap-2 sm:grid-cols-2">
                  <label className="text-[12px]">
                    Fecha
                    <input
                      type="date"
                      className="g-input mt-1"
                      value={fecha}
                      onChange={(e) => {
                        const valor = e.target.value;
                        setFecha(valor);
                        if (editId != null) return;
                        const precarga = precargaJornada(valor);
                        if (!precarga) return;
                        setHs(String(precarga.horas));
                        setProg(precarga.paradas.map((p) => ({ idCausa: String(p.idCausa), tiempo: String(p.tiempo), descripcion: "" })));
                      }}
                    />
                  </label>
                  <label className="text-[12px]">
                    Hs disponibles
                    <input className="g-input mt-1" value={hs} onChange={(e) => setHs(e.target.value)} />
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <EtiquetaJornada titulo="Productivas" valor={nroDec(horas.hsProd)} />
                  <EtiquetaJornada titulo="Programadas" valor={nroDec(horas.hsPp)} />
                  <EtiquetaJornada titulo="No programadas" valor={nroDec(horas.hsNp)} />
                  {!sinProduccion && <EtiquetaJornada titulo="Rendimiento" valor={`${nroDec(rend)} kg/h`} />}
                  {!sinProduccion && <EtiquetaJornada titulo="Esta jornada" valor={`${nroDec(unidades)} un. · ${nroDec(kg)} kg`} />}
                </div>
                <BloqueParadas titulo="Paradas programadas" filas={prog} causas={datos.causas} onChange={setProg} />
                <BloqueParadas titulo="Paradas no programadas" filas={noProg} causas={datos.causas} onChange={setNoProg} />
                {puedeEditar && (
                  <button type="submit" className="g-btn g-btn-primary" disabled={pendiente}>
                    {editId != null ? "Guardar cambios" : "Registrar jornada"}
                  </button>
                )}
              </section>
            </>
          )}
        </form>
      )}

      <section className="g-card space-y-3 p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="g-section-title">Producciones cargadas</h2>
            <p className="text-[12px] text-[var(--color-text-muted)]">De la más reciente a la más antigua</p>
          </div>
          <div className="g-filters">
            <label className="text-[12px]">
              Fecha desde
              <input type="date" className="g-input" value={desde} onChange={(e) => { setDesde(e.target.value); setPagina(1); }} />
            </label>
            <label className="text-[12px]">
              Fecha hasta
              <input type="date" className="g-input" value={hasta} onChange={(e) => { setHasta(e.target.value); setPagina(1); }} />
            </label>
          </div>
          <div className="flex gap-1">
            <ColumnPicker cols={cols.cols} isVisible={cols.isVisible} onToggle={cols.toggle} />
            <button type="button" className="g-btn g-btn-icon h-9 w-9" title="Informe stock" aria-label="Informe stock" onClick={() => setPanel("stock")}>
              <IconList className="h-4 w-4" />
            </button>
            <button type="button" className="g-btn g-btn-icon h-9 w-9" title="Exportar" aria-label="Exportar" onClick={() => setPanel("export")}>
              <IconFile className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="g-table min-w-full text-[12px]">
            <thead>
              <tr>
                {show("oc") ? <th>O. Compra</th> : null}
                {show("op") ? <th>O. Prod.</th> : null}
                {show("codigo") ? <th>Código</th> : null}
                {show("producto") ? <th>Nombre del producto</th> : null}
                {show("kgSol") ? <th>Kg solicitados</th> : null}
                {show("peso") ? <th>Peso unitario</th> : null}
                {show("lote") ? <th>Lote</th> : null}
                {show("fecha") ? <th>Fecha</th> : null}
                {show("pallet") ? <th>Pallet</th> : null}
                {show("unidades") ? <th>Unidades</th> : null}
                {show("kg") ? <th>Kg</th> : null}
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filas.length === 0 ? (
                <tr>
                  <td colSpan={cols.visibleCount}>No hay producciones para el filtro.</td>
                </tr>
              ) : (
                filas.map((jornada) => (
                  <tr key={jornada.id}>
                    {show("oc") ? <td>{jornada.ordenCompra || "—"}</td> : null}
                    {show("op") ? <td>{jornada.ordenProduccion || "—"}</td> : null}
                    {show("codigo") ? <td>{jornada.codigoProducto || "—"}</td> : null}
                    {show("producto") ? <td>{jornada.producto || (jornada.idSolicitud == null ? "Paradas sin producción" : "—")}</td> : null}
                    {show("kgSol") ? <td className="tabular-nums">{nroVisible(jornada.kgSolicitados, 2)}</td> : null}
                    {show("peso") ? <td className="tabular-nums">{nroVisible(jornada.pesoUnitario, 3)}</td> : null}
                    {show("lote") ? <td>{jornada.lote || "—"}</td> : null}
                    {show("fecha") ? <td>{fechaVisible(jornada.fecha)}</td> : null}
                    {show("pallet") ? <td className="tabular-nums">{nroVisible(jornada.pallets, 2)}</td> : null}
                    {show("unidades") ? <td className="tabular-nums">{nroVisible(jornada.unidades, 2)}</td> : null}
                    {show("kg") ? <td className="tabular-nums">{nroVisible(jornada.kg, 2)}</td> : null}
                    <td>
                      <div className="flex gap-1">
                        <button type="button" className="g-btn g-btn-icon h-8 w-8" title="Ver" aria-label="Ver" onClick={() => setDetalleId(jornada.id)}>
                          <IconEye className="h-4 w-4" />
                        </button>
                        {puedeEditar && (
                          <button type="button" className="g-btn g-btn-icon g-btn-icon-edit h-8 w-8" title="Editar" aria-label="Editar" onClick={() => editar(jornada.id)}>
                            <IconPencil className="h-4 w-4" />
                          </button>
                        )}
                        {puedeEditar && (
                          <button type="button" className="g-btn g-btn-icon g-btn-icon-danger h-8 w-8" title="Eliminar" aria-label="Eliminar" onClick={() => borrar(jornada.id)}>
                            <IconTrash className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between text-[12px]">
          <div className="flex items-center gap-2">
            <button type="button" className="g-btn g-btn-secondary h-8" disabled={paginaSegura <= 1} onClick={() => setPagina((n) => Math.max(1, n - 1))}>
              Anterior
            </button>
            <span>
              Página {paginaSegura} de {paginas}
            </span>
            <button type="button" className="g-btn g-btn-secondary h-8" disabled={paginaSegura >= paginas} onClick={() => setPagina((n) => n + 1)}>
              Siguiente
            </button>
          </div>
          <span className="text-[var(--color-text-muted)]">{visibles.length} producciones</span>
        </div>
      </section>

      {panel === "stock" && <PanelInformeStock datos={datos} onCerrar={() => setPanel(null)} />}
      {panel === "plan" && solicitud && (
        <PanelPlan datos={datos} solicitud={solicitud} formula={formula} palletsInicial={palN || solicitud.pallets_pendientes} onCerrar={() => setPanel(null)} />
      )}
      {panel === "export" && (
        <DialogoInforme
          titulo="Exportar producciones"
          nombreInicial={`produccion_${hoyIso()}`}
          hoja="Produccion"
          encabezados={[
            "O. Compra",
            "O. Prod.",
            "Código",
            "Nombre del producto",
            "Kg Solicitados",
            "Peso Unitario",
            "Tipo de envase",
            "Lote",
            "Fecha",
            "Pallet",
            "Unidades",
            "Kg",
            "Pallets Pendientes",
            "Unidades Pendientes",
            "kg Pendientes",
          ]}
          filas={filasExport}
          onCerrar={() => setPanel(null)}
        />
      )}
      {detalleId != null && datos.detalles[String(detalleId)] && (
        <PanelDetalle detalle={datos.detalles[String(detalleId)]} causas={datos.causas} onCerrar={() => setDetalleId(null)} />
      )}
    </div>
  );

  function cambiarLote(idIngrediente: number, indice: number, cambio: Partial<FilaLote>) {
    setLotes((actual) => {
      const filasIng = (actual[String(idIngrediente)] ?? []).map((fila) => ({ ...fila }));
      const previa = filasIng[indice];
      if (!previa) return actual;
      const fila = { ...previa, ...cambio };
      if (!fila.lote) fila.cantidad = "";
      if (fila.lote && (cambio.cantidad != null || cambio.lote != null)) {
        const linea = formula.find((item) => item.idIngrediente === idIngrediente);
        const stockItem = (lotesDisponibles[String(idIngrediente)] ?? []).find((item) => item.lote === fila.lote);
        if (linea && stockItem && fila.cantidad.trim() !== "") {
          const otras = filasIng.reduce((suma, item, i) => (i === indice ? suma : suma + numero(item.cantidad)), 0);
          const otrasMismo = filasIng.reduce((suma, item, i) => {
            if (i === indice || item.lote !== fila.lote) return suma;
            return suma + numero(item.cantidad);
          }, 0);
          const disponible = Math.max(0, stockItem.stock - otrasMismo);
          const tope = Math.min(disponible, Math.max(0, kgNecesarios(linea, kg) - otras));
          if (numero(fila.cantidad) > tope + 0.0005) fila.cantidad = tope > 0.0005 ? nroPlano(tope) : "";
        }
      }
      filasIng[indice] = fila;
      return { ...actual, [String(idIngrediente)]: filasIng };
    });
  }
}

function nroPlano(valor: number) {
  const redondo = Math.round((Number(valor) || 0) * 1000) / 1000;
  return String(redondo).replace(".", ",");
}

function CierresAnteriores({ cierres, ocultarPendientes }: { cierres: CierreVista[]; ocultarPendientes: boolean }) {
  if (cierres.length === 0) {
    return <p className="text-[13px] text-[var(--color-text-muted)]">Todavía no hay cierres diarios cargados.</p>;
  }
  return (
    <div className="space-y-3">
      {cierres.map((cierre) => {
        const muestraHoras = cierre.hsDisponibles > 0.0005 || cierre.paradas.length > 0;
        const sinPendientes =
          ocultarPendientes ||
          (cierre.palletsPendientes <= 0.0005 && cierre.unidadesPendientes <= 0.0005 && cierre.kgPendientes <= 0.0005);
        let anterior = "";
        return (
          <article key={cierre.id} className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="flex flex-wrap items-start justify-between gap-2 px-3.5 pt-3">
              <p className="text-[13px] font-semibold">Día {fechaVisible(cierre.fecha)}</p>
              <p className="text-[12px] text-[var(--color-primary-muted)]">
                {nroDec(cierre.pallets)} pallets · {nroDec(cierre.unidades)} un. · {nroDec(cierre.kg)} kg
              </p>
            </div>
            {muestraHoras && (
              <div className="space-y-0.5 px-3.5 pt-1 text-[12px] text-[var(--color-text-muted)]">
                <p>
                  {nroDec(cierre.hsDisponibles)} h disp. · {nroDec(cierre.hsProductivas)} h prod. · {nroDec(cierre.hsParadasProg)} h prog. ·{" "}
                  {nroDec(cierre.hsParadasNo)} h no prog. · {nroDec(cierre.rendimientoKgH)} kg/h
                </p>
                {cierre.paradas.length > 0 && (
                  <p>
                    {cierre.paradas
                      .map((parada) => `${parada.causa}: ${nroDec(parada.tiempo)} h${parada.descripcion ? ` — ${parada.descripcion}` : ""}`)
                      .join(" · ")}
                  </p>
                )}
              </div>
            )}
            <div className="px-3 py-2">
              {cierre.consumos.length === 0 ? (
                <p className="px-1 py-2 text-[12px] text-[var(--color-text-muted)]">Sin consumo de ingredientes en este día.</p>
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
                    {cierre.consumos.map((consumo, indice) => {
                      const nombre = consumo.ingrediente !== anterior ? consumo.ingrediente : "";
                      anterior = consumo.ingrediente;
                      return (
                        <tr key={`${consumo.ingrediente}-${consumo.lote}-${indice}`}>
                          <td>{nombre}</td>
                          <td>{consumo.lote || "—"}</td>
                          <td className="tabular-nums">
                            {nroDec(consumo.cantidad)} kg
                          </td>
                          <td>{consumo.palletInicio ?? "—"}</td>
                          <td>{consumo.palletFin ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            {!sinPendientes && (
              <div className="mx-3 mb-3 grid gap-2 rounded-lg px-2 py-2 sm:grid-cols-3" style={{ background: "var(--color-warning-bg)" }}>
                <p>
                  <span className="block text-[11px] text-[var(--color-warning)]">Pallets pendientes</span>
                  <span className="text-[13px]">{nroDec(cierre.palletsPendientes)}</span>
                </p>
                <p>
                  <span className="block text-[11px] text-[var(--color-warning)]">Unidades pendientes</span>
                  <span className="text-[13px]">{nroDec(cierre.unidadesPendientes)}</span>
                </p>
                <p>
                  <span className="block text-[11px] text-[var(--color-warning)]">Kg pendientes</span>
                  <span className="text-[13px]">{nroDec(cierre.kgPendientes)} kg</span>
                </p>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function aParadas(filas: FilaParada[]): ParadaCarga[] {
  return filas
    .map((fila) => ({ idCausa: Number(fila.idCausa) || 0, tiempo: numero(fila.tiempo), descripcion: fila.descripcion }))
    .filter((fila) => fila.idCausa > 0 || fila.tiempo > 0 || fila.descripcion);
}

function EtiquetaJornada({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <span className="inline-flex items-baseline gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-primary-soft)] px-3 py-1.5 text-[12px]">
      <span className="text-[var(--color-text-muted)]">{titulo}</span>
      <span className="font-semibold tabular-nums text-[var(--color-text)]">{valor}</span>
    </span>
  );
}

function Tarjeta({
  tono,
  icono,
  titulo,
  valor,
  pie,
}: {
  tono: "mint" | "blue" | "violet" | "sage";
  icono: ReactNode;
  titulo: string;
  valor: string;
  pie: string;
}) {
  const tinta =
    tono === "blue" ? "#2f6fed" : tono === "violet" ? "#7a4ea3" : "var(--color-primary)";
  return (
    <div className={`g-kpi g-kpi-rich g-kpi-${tono}`}>
      <span className="g-kpi-badge" style={{ color: tinta }}>
        {icono}
      </span>
      <span className="min-w-0 flex-1">
        <p className="g-kpi-title">{titulo}</p>
        <p className="g-kpi-value">{valor}</p>
        <p className="text-[12px] text-[var(--color-text-muted)]">{pie}</p>
      </span>
      <IconChevron className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
    </div>
  );
}

function Dato({ etiqueta, valor, fuerte = false }: { etiqueta: string; valor: string; fuerte?: boolean }) {
  return (
    <p>
      <span className="block text-[11px] text-[var(--color-text-muted)]">{etiqueta}</span>
      <span className={fuerte ? "font-semibold" : undefined}>{valor || "—"}</span>
    </p>
  );
}

function CajaPrevia({
  titulo,
  accion,
  children,
}: {
  titulo: string;
  accion?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[13px] font-semibold">{titulo}</p>
        {accion}
      </div>
      {children}
    </div>
  );
}

function BloqueParadas({
  titulo,
  filas,
  causas,
  onChange,
}: {
  titulo: string;
  filas: FilaParada[];
  causas: DatosProduccion["causas"];
  onChange: (filas: FilaParada[]) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold">{titulo}</p>
        <button type="button" className="g-btn g-btn-secondary h-8" onClick={() => onChange([...filas, { idCausa: "", tiempo: "", descripcion: "" }])}>
          <IconPlus className="h-4 w-4" /> Parada
        </button>
      </div>
      {filas.map((fila, indice) => (
        <div key={indice} className="grid items-center gap-2 sm:grid-cols-[1fr_100px_1fr_auto]">
          <select
            className="g-input"
            value={fila.idCausa}
            onChange={(e) => onChange(filas.map((item, i) => (i === indice ? { ...item, idCausa: e.target.value } : item)))}
          >
            <option value="">Elegí la causa</option>
            {causas.map((causa) => (
              <option key={causa.id} value={causa.id}>
                {causa.causa}
              </option>
            ))}
            {fila.idCausa && !causas.some((causa) => String(causa.id) === fila.idCausa) && (
              <option value={fila.idCausa}>Causa {fila.idCausa}</option>
            )}
          </select>
          <input
            className="g-input"
            placeholder="Horas"
            value={fila.tiempo}
            onChange={(e) => onChange(filas.map((item, i) => (i === indice ? { ...item, tiempo: e.target.value } : item)))}
          />
          <input
            className="g-input"
            placeholder="Descripción"
            value={fila.descripcion}
            onChange={(e) => onChange(filas.map((item, i) => (i === indice ? { ...item, descripcion: e.target.value } : item)))}
          />
          <button
            type="button"
            className="g-btn g-btn-icon g-btn-icon-danger h-8 w-8"
            aria-label="Quitar parada"
            onClick={() => onChange(filas.filter((_, i) => i !== indice))}
          >
            <IconTrash className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
