import {
  DatosProduccion,
  RESP_ENCARGADO,
  RESP_OPERARIO,
  cierresDeSolicitud,
  etiquetaSolicitud,
  kgNecesarios,
  type CierreVista,
} from "@/lib/produccion/logic";
import {
  SolicitudVista,
  filtrarSolicitudes,
  texto,
} from "@/lib/solicitudes/logic";

export type OpcionLote = {
  id: number;
  etiqueta: string;
};

export type ParadaHoja = {
  fecha: string | null;
  causa: string;
  hsProg: number;
  hsNo: number;
  descripcion: string;
};

export type HojaLote = {
  solicitud: SolicitudVista;
  jornadas: CierreVista[];
  paradas: ParadaHoja[];
  responsables: { rol: string; nombre: string }[];
  barridos: { ingrediente: string; pesaje: number }[];
  limpieza: { equipo: string }[];
  kgProducidos: number;
  hsParadas: number;
};

export type LineaConsumoReceta = {
  idIngrediente: number;
  codigo: string;
  nombre: string;
  tipo: string;
  participacion: number;
  teorico: number;
  real: number;
  diferencia: number;
  enReceta: boolean;
};

export type ConsumoVsReceta = {
  solicitud: SolicitudVista;
  kgProducidos: number;
  lineas: LineaConsumoReceta[];
  teoricoTotal: number;
  realTotal: number;
};

export type FilaSolicitudVsProd = {
  id: number;
  lote: string;
  producto: string;
  ordenCompra: string;
  ordenProduccion: string;
  fecha: string | null;
  kgSolicitados: number;
  kgProducidos: number;
  diferencia: number;
  cumplimiento: number | null;
  estado: string;
  estadoEtiqueta: string;
  fuente: string;
};

export type SolicitudesVsProducido = {
  filas: FilaSolicitudVsProd[];
  kgSolicitados: number;
  kgProducidos: number;
  conProduccion: number;
  sinProduccion: number;
};

export function opcionesLote(solicitudes: SolicitudVista[]): OpcionLote[] {
  return solicitudes
    .filter((item) => item.id != null)
    .map((item) => ({
      id: item.id as number,
      etiqueta: etiquetaSolicitud(item) || `Solicitud ${item.id}`,
    }));
}

export function armarHojaLote(datos: DatosProduccion, idSolicitud: number): HojaLote | null {
  const solicitud = datos.solicitudes.find((item) => item.id === idSolicitud);
  if (!solicitud) return null;
  const jornadas = cierresDeSolicitud(datos, solicitud);
  const previo = datos.previos[String(idSolicitud)] ?? {
    operarios: [],
    encargado: null,
    limpieza: [],
    barridos: [],
  };
  const usuarios = new Map(datos.usuarios.map((item) => [item.id, item.etiqueta]));
  const ingredientes = new Map(datos.ingredientes.map((item) => [item.id, item.etiqueta]));
  const equipos = new Map(datos.equipos.map((item) => [item.id, item.nombre]));
  const responsables: { rol: string; nombre: string }[] = [];
  const vistos = new Set<string>();
  for (const id of previo.operarios) {
    const clave = `op-${id}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    responsables.push({
      rol: RESP_OPERARIO,
      nombre: usuarios.get(id) ?? `Usuario ${id}`,
    });
  }
  if (previo.encargado != null) {
    responsables.push({
      rol: RESP_ENCARGADO,
      nombre: usuarios.get(previo.encargado) ?? `Usuario ${previo.encargado}`,
    });
  }
  const barridos = previo.barridos.map((item) => ({
    ingrediente: ingredientes.get(item.idIngrediente) ?? `Ingrediente ${item.idIngrediente}`,
    pesaje: item.pesaje,
  }));
  const limpieza = previo.limpieza.map((id) => ({
    equipo: equipos.get(id) ?? `Equipo ${id}`,
  }));
  const causas = new Map(datos.causas.map((item) => [item.id, item.causa]));
  const paradas: ParadaHoja[] = [];
  for (const jornada of jornadas) {
    const detalle = datos.detalles[String(jornada.id)];
    for (const parada of detalle?.paradasProg ?? []) {
      paradas.push({
        fecha: jornada.fecha,
        causa: causas.get(parada.idCausa) || `Causa ${parada.idCausa}`,
        hsProg: parada.tiempo,
        hsNo: 0,
        descripcion: parada.descripcion,
      });
    }
    for (const parada of detalle?.paradasNo ?? []) {
      paradas.push({
        fecha: jornada.fecha,
        causa: causas.get(parada.idCausa) || `Causa ${parada.idCausa}`,
        hsProg: 0,
        hsNo: parada.tiempo,
        descripcion: parada.descripcion,
      });
    }
  }
  return {
    solicitud,
    jornadas,
    paradas,
    responsables,
    barridos,
    limpieza,
    kgProducidos: solicitud.tiene_produccion ? solicitud.kg_cargados : 0,
    hsParadas: jornadas.reduce((acc, item) => acc + item.hsParadasProg + item.hsParadasNo, 0),
  };
}

export function armarConsumoVsReceta(
  datos: DatosProduccion,
  idSolicitud: number,
): ConsumoVsReceta | null {
  const solicitud = datos.solicitudes.find((item) => item.id === idSolicitud);
  if (!solicitud) return null;
  const formula = datos.formulas[String(solicitud.id_version ?? "")] ?? [];
  const kgProducidos = solicitud.tiene_produccion ? solicitud.kg_cargados : 0;
  const realPorIng = new Map<number, number>();
  for (const jornada of datos.jornadas.filter((item) => item.idSolicitud === idSolicitud)) {
    const detalle = datos.detalles[String(jornada.id)];
    for (const lote of detalle?.lotes ?? []) {
      realPorIng.set(lote.idIngrediente, (realPorIng.get(lote.idIngrediente) ?? 0) + lote.cantidad);
    }
  }
  const lineas: LineaConsumoReceta[] = formula.map((linea) => {
    const teorico = kgNecesarios(linea, kgProducidos);
    const real = realPorIng.get(linea.idIngrediente) ?? 0;
    return {
      idIngrediente: linea.idIngrediente,
      codigo: linea.codigo,
      nombre: linea.nombre,
      tipo: linea.tipo,
      participacion: linea.participacion,
      teorico,
      real,
      diferencia: real - teorico,
      enReceta: true,
    };
  });
  for (const [idIngrediente, real] of realPorIng) {
    if (formula.some((linea) => linea.idIngrediente === idIngrediente)) continue;
    const ing = datos.ingredientes.find((item) => item.id === idIngrediente);
    lineas.push({
      idIngrediente,
      codigo: ing?.codigo ?? "",
      nombre: ing?.nombre ?? `Ingrediente ${idIngrediente}`,
      tipo: "",
      participacion: 0,
      teorico: 0,
      real,
      diferencia: real,
      enReceta: false,
    });
  }
  return {
    solicitud,
    kgProducidos,
    lineas,
    teoricoTotal: lineas.reduce((acc, item) => acc + item.teorico, 0),
    realTotal: lineas.reduce((acc, item) => acc + item.real, 0),
  };
}

export function armarSolicitudesVsProducido(
  solicitudes: SolicitudVista[],
  desde: string,
  hasta: string,
): SolicitudesVsProducido {
  const filtradas = filtrarSolicitudes(solicitudes, {
    fechaDesde: desde || null,
    fechaHasta: hasta || null,
  });
  const filas: FilaSolicitudVsProd[] = filtradas.map((item) => {
    const kgProducidos = item.tiene_produccion ? item.kg_cargados : 0;
    const kgSolicitados = item.kg_solicitados;
    return {
      id: item.id ?? 0,
      lote: item.lote,
      producto: item.producto,
      ordenCompra: item.orden_compra,
      ordenProduccion: item.orden_produccion,
      fecha: item.fecha_registro,
      kgSolicitados,
      kgProducidos,
      diferencia: kgProducidos - kgSolicitados,
      cumplimiento: kgSolicitados > 0.01 ? (kgProducidos / kgSolicitados) * 100 : null,
      estado: item.estado,
      estadoEtiqueta: item.estado_etiqueta,
      fuente: item.fuente_cargado,
    };
  });
  return {
    filas,
    kgSolicitados: filas.reduce((acc, item) => acc + item.kgSolicitados, 0),
    kgProducidos: filas.reduce((acc, item) => acc + item.kgProducidos, 0),
    conProduccion: filas.filter((item) => item.fuente === "produccion").length,
    sinProduccion: filas.filter((item) => item.fuente !== "produccion").length,
  };
}

export function nombreArchivoLote(prefijo: string, lote: string) {
  const limpio = texto(lote).replace(/[<>:"/\\|?*]/g, "_").trim() || "lote";
  return `${prefijo}_${limpio}`;
}
