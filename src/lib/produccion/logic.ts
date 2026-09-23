import { CATALOGOS, calcularLotes, calcularStock } from "@/lib/catalogos/logic";
import {
  ESTADO_COMPLETADA,
  ESTADO_PENDIENTE,
  ESTADO_PRODUCCION,
  SolicitudVista,
  aFecha,
  clave,
  enriquecerSolicitud,
  idEntero,
  numero,
  ordenarSolicitudes,
  texto,
} from "@/lib/solicitudes/logic";

export const RESP_OPERARIO = "Operario de producción";
export const RESP_ENCARGADO = "Encargado de producción";
export const CODIGO_CORRUGADO = "INS-403";
export const CODIGO_DURO = "INS-404";
export const CODIGO_PALLETS_EXP = "INS-405";
export const PREFIJO_CIERRE = "Cierre de producción #";
export const PLACEHOLDER_SOLICITUD = "Elegí una solicitud pendiente";
export const ETIQUETA_PARADAS = "Registrar horas paradas sin producción";
export const HS_LUN_JUE = 9;
export const HS_VIERNES = 8;
export const PARADAS_LUN_JUE: [number, number][] = [
  [1, 0.5],
  [2, 0.8],
  [3, 0.5],
];
export const PARADAS_VIERNES: [number, number][] = [
  [1, 0.5],
  [2, 0.8],
  [3, 2],
];

export type UsuarioOpcion = {
  id: number;
  nombre: string;
  apellido: string;
  rol: string;
  rolNombre: string;
  estado: string;
  etiqueta: string;
};
export type EquipoOpcion = { id: number; nombre: string; estado: string };

export function catalogoActivo(estado: string) {
  const marca = clave(estado);
  return marca === "" || marca === "activo";
}

export function esRolProduccion(usuario: UsuarioOpcion, marca: "operario" | "encargado") {
  return clave(`${usuario.rolNombre} ${usuario.rol}`).includes(marca);
}
export type IngredienteOpcion = { id: number; codigo: string; nombre: string; etiqueta: string };
export type CausaParada = { id: number; causa: string };
export type InsumoConsumible = { codigo: string; nombre: string; aplica: boolean };
export type LoteStock = { lote: string; stock: number };
export type LineaFormula = {
  idVersion: number;
  tipo: string;
  puesto: number;
  idIngrediente: number;
  codigo: string;
  nombre: string;
  participacion: number;
  etiqueta: string;
};
export type ParadaCarga = { idCausa: number; tiempo: number; descripcion: string };
export type LoteConsumo = {
  idIngrediente: number;
  articulo: string;
  lote: string;
  cantidad: number;
  palletInicio: number | null;
  palletFin: number | null;
};
export type ExtraEmpaque = { envase: number; etiqueta: number; insumos: { codigo: string; cantidad: number }[] };
export type DetalleJornada = {
  id: number;
  idSolicitud: number | null;
  fecha: string | null;
  pallets: number;
  unidades: number;
  kg: number;
  hsDisponibles: number;
  hsProductivas: number;
  hsParadasProg: number;
  hsParadasNo: number;
  rendimientoKgH: number;
  paradasProg: ParadaCarga[];
  paradasNo: ParadaCarga[];
  lotes: LoteConsumo[];
  aplicaCorrugado: boolean;
  aplicaDuro: boolean;
  aplicaExportacion: boolean;
  palletInicial: number;
  extra: ExtraEmpaque;
};
export type CierreVista = {
  id: number;
  fecha: string | null;
  pallets: number;
  unidades: number;
  kg: number;
  consumos: { ingrediente: string; lote: string; cantidad: number; palletInicio: number | null; palletFin: number | null }[];
  palletsPendientes: number;
  unidadesPendientes: number;
  kgPendientes: number;
  hsDisponibles: number;
  hsProductivas: number;
  hsParadasProg: number;
  hsParadasNo: number;
  rendimientoKgH: number;
  paradas: { causa: string; tiempo: number; descripcion: string }[];
};
export type JornadaLista = {
  id: number;
  fecha: string | null;
  idSolicitud: number | null;
  ordenCompra: string;
  ordenProduccion: string;
  codigoProducto: string;
  producto: string;
  kgSolicitados: number;
  pesoUnitario: number;
  envase: string;
  lote: string;
  pallets: number;
  unidades: number;
  kg: number;
  palletsSolicitados: number;
  unidadesSolicitadas: number;
};
export type PrevioSolicitud = {
  operarios: number[];
  encargado: number | null;
  limpieza: number[];
  barridos: { id: number; idIngrediente: number; pesaje: number }[];
};
export type ResumenConsumo = {
  envases: number;
  etiquetas: number;
  corrugado: number;
  duro: number;
  exportacion: number;
};
export type StockArt = { tipo: string; id: number; codigo: string; nombre: string; stock: number };
export type FilaInforme = {
  grupo: string;
  etiqueta: string;
  unidad: string;
  cantidades: number[];
  total: number;
  stock: number;
  faltante: number;
  sobrante: number;
};
export type InformeStock = {
  columnas: { id: number; titulo: string }[];
  ordenes: {
    codigo: string;
    producto: string;
    cantidad: number;
    ordenCompra: string;
    version: string;
    lote: string;
  }[];
  filas: FilaInforme[];
  resumen: { ordenes: number; consumoTotal: number; itemsFaltante: number; estado: string; alertas: { tipo: string; texto: string }[] };
};

export type DatosProduccion = {
  solicitudes: SolicitudVista[];
  usuarios: UsuarioOpcion[];
  equipos: EquipoOpcion[];
  ingredientes: IngredienteOpcion[];
  causas: CausaParada[];
  consumibles: InsumoConsumible[];
  jornadas: JornadaLista[];
  formulas: Record<string, LineaFormula[]>;
  lotes: Record<string, LoteStock[]>;
  stock: StockArt[];
  detalles: Record<string, DetalleJornada>;
  previos: Record<string, PrevioSolicitud>;
  limpiezaLibre: { fecha: string; idEquipo: number; id: number }[];
  resumenes: Record<string, ResumenConsumo>;
  articulos: { id: number; tipo: string; idOrigen: number | null; codigo: string }[];
  consumosRef: { id: number; idSolicitud: number | null; fecha: string | null }[];
  cierresProducto: { id: number; idProduccion: number }[];
  limpiezasRef: { id: number; idSolicitud: number | null; fecha: string | null }[];
  error: string | null;
};

export type PayloadRegistro = {
  idProduccion: number | null;
  idSolicitud: number | null;
  fecha: string;
  pallets: number;
  hsDisponibles: number;
  paradasProg: ParadaCarga[];
  paradasNo: ParadaCarga[];
  idsOperarios: number[];
  idEncargado: number | null;
  idsLimpieza: number[];
  lotes: LoteConsumo[];
  consumibles: { codigo: string; aplica: boolean }[];
  barrido: { idIngrediente: number; pesaje: number } | null;
};

function r2(valor: number) {
  return Math.round((Number(valor) || 0) * 100) / 100;
}
function r3(valor: number) {
  return Math.round((Number(valor) || 0) * 1000) / 1000;
}

export function nroDec(valor: number, decimales = 2) {
  return (Number(valor) || 0).toLocaleString("es-AR", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

export function etiquetaUsuario(nombre: string, apellido: string, id: number) {
  const partes = [texto(nombre), texto(apellido)].filter(Boolean);
  return partes.join(" ") || `Usuario ${id}`;
}

export function etiquetaIng(codigo: string, nombre: string, id?: number) {
  if (codigo && nombre) return `${codigo}  —  ${nombre}`;
  return nombre || codigo || (id != null ? `Ingrediente ${id}` : "artículo");
}

export function etiquetaSolicitud(item: SolicitudVista) {
  return `${item.lote}  —  ${item.producto}  —  ${item.orden_compra}`;
}

export function unidadesElaboradas(solicitud: SolicitudVista, pallets: number) {
  return Math.max(0, pallets * solicitud.unidades_por_pallets);
}

export function kgElaborados(solicitud: SolicitudVista, pallets: number) {
  return Math.max(0, pallets * solicitud.unidades_por_pallets * solicitud.peso_unitario);
}

export function calcularHoras(hsDisponibles: number, prog: ParadaCarga[], noProg: ParadaCarga[]) {
  const hsPp = r2(prog.reduce((s, p) => s + Math.max(0, p.tiempo), 0));
  const hsNp = r2(noProg.reduce((s, p) => s + Math.max(0, p.tiempo), 0));
  const hsProd = r2(Math.max(0, hsDisponibles - hsPp - hsNp));
  return { hsPp, hsNp, hsProd };
}

export function rendimiento(pesoKg: number, hsProductivas: number) {
  if (hsProductivas <= 0.0005) return 0;
  return r2(pesoKg / hsProductivas);
}

/** weekday de Python: 0 = lunes … 6 = domingo. */
export function diaSemana(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return -1;
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return (js + 6) % 7;
}

export function precargaJornada(iso: string): { horas: number; paradas: ParadaCarga[] } | null {
  const dia = diaSemana(iso);
  if (dia < 0 || dia > 4) return null;
  const tabla = dia <= 3 ? PARADAS_LUN_JUE : PARADAS_VIERNES;
  return {
    horas: dia <= 3 ? HS_LUN_JUE : HS_VIERNES,
    paradas: tabla.map(([idCausa, tiempo]) => ({ idCausa, tiempo, descripcion: "" })),
  };
}

export function kgNecesarios(linea: LineaFormula, kgTotales: number) {
  return Math.max(0, linea.participacion * kgTotales);
}

/** Si los kg cargados no cubren la jornada, el tope es lo cubierto (calcular_pallets de la UI anterior). */
export function palletsParaRango(cantidades: number[], kgPorPallet: number, palletsElaborados: number) {
  if (kgPorPallet <= 0.0005) return palletsElaborados;
  const cubiertos = cantidades.reduce((suma, valor) => suma + Math.max(0, valor), 0) / kgPorPallet;
  if (cubiertos + 0.01 < palletsElaborados) {
    if (cantidades.some((valor) => valor > 0.0005) && Math.round(cubiertos) < 1) return 1;
    return cubiertos;
  }
  return palletsElaborados;
}

export function rangosDeLotes(cantidades: number[], kgPorPallet: number, palletsElaborados: number, palletInicial = 1) {
  return rangosPallet(cantidades, kgPorPallet, palletsParaRango(cantidades, kgPorPallet, palletsElaborados), palletInicial);
}

export function rangosPallet(cantidades: number[], kgPorPallet: number, palletsElaborados: number, palletInicial = 1) {
  const cantidadPallets = Math.round(Math.max(0, palletsElaborados));
  const inicioBase = Math.max(1, Math.trunc(palletInicial || 1));
  const tope = inicioBase + cantidadPallets - 1;
  if (kgPorPallet <= 0.0005 || cantidadPallets <= 0) {
    return cantidades.map(() => ({ inicio: null as number | null, fin: null as number | null }));
  }
  let ultimo = -1;
  cantidades.forEach((cantidad, indice) => {
    if (cantidad > 0.0005) ultimo = indice;
  });
  let siguiente = inicioBase;
  return cantidades.map((cantidad, indice) => {
    if (cantidad <= 0.0005) return { inicio: null, fin: null };
    const inicio = Math.min(siguiente, tope);
    const cubiertos = cantidad / kgPorPallet;
    const crudo = inicio + cubiertos - 1;
    const fin = indice === ultimo ? tope : Math.min(tope, Math.max(inicio, Math.floor(crudo)));
    siguiente = fin + 1;
    return { inicio, fin };
  });
}

export function activas(solicitudes: SolicitudVista[]) {
  return solicitudes.filter((item) => item.estado === ESTADO_PENDIENTE || item.estado === ESTADO_PRODUCCION);
}

function mapaId(filas: Record<string, unknown>[]) {
  const m = new Map<number, Record<string, unknown>>();
  for (const f of filas) {
    const id = idEntero(f.id);
    if (id != null) m.set(id, f);
  }
  return m;
}

type Art = { id: number; tipo: string; idOrigen: number | null; codigo: string; nombre: string };

function articulosDe(filas: Record<string, unknown>[]): Art[] {
  const lista: Art[] = [];
  for (const fila of filas) {
    const id = idEntero(fila.id);
    if (id == null) continue;
    lista.push({
      id,
      tipo: clave(fila.tipo_articulo),
      idOrigen: idEntero(fila.id_origen),
      codigo: texto(fila.codigo),
      nombre: texto(fila.articulo),
    });
  }
  return lista;
}

function stockDe(stock: StockArt[], tipo: string, codigo: string, nombre: string) {
  const tipoN = clave(tipo);
  const codigoK = clave(codigo);
  const nombreK = clave(nombre);
  let porNombre: number | null = null;
  for (const item of stock) {
    if (item.tipo !== tipoN) continue;
    if (codigoK && clave(item.codigo) === codigoK) return item.stock;
    if (porNombre == null && nombreK && clave(item.nombre) === nombreK) porNombre = item.stock;
  }
  return porNombre ?? 0;
}

export function lotesEditables(datos: DatosProduccion, detalle: DetalleJornada | null) {
  return lotesConDevolucion(datos.lotes, detalle);
}

export function cierresDeSolicitud(datos: DatosProduccion, solicitud: SolicitudVista): CierreVista[] {
  const formula = datos.formulas[String(solicitud.id_version ?? "")] ?? [];
  const causas = new Map(datos.causas.map((item) => [item.id, item.causa]));
  const jornadas = datos.jornadas
    .filter((jornada) => jornada.idSolicitud === solicitud.id)
    .slice()
    .sort((a, b) => (a.fecha ?? "").localeCompare(b.fecha ?? "") || a.id - b.id);
  let acumuladoP = 0;
  let acumuladoU = 0;
  let acumuladoK = 0;
  return jornadas.map((jornada) => {
    const detalle = datos.detalles[String(jornada.id)];
    const consumos = (detalle?.lotes ?? [])
      .map((lote, indice) => ({ lote, indice }))
      .sort((a, b) => {
        const ia = formula.findIndex((linea) => linea.idIngrediente === a.lote.idIngrediente);
        const ib = formula.findIndex((linea) => linea.idIngrediente === b.lote.idIngrediente);
        return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || a.indice - b.indice;
      })
      .map(({ lote }) => {
        const linea = formula.find((item) => item.idIngrediente === lote.idIngrediente);
        return {
          ingrediente: linea?.etiqueta || lote.articulo,
          lote: lote.lote,
          cantidad: lote.cantidad,
          palletInicio: lote.palletInicio,
          palletFin: lote.palletFin,
        };
      });
    acumuladoP += jornada.pallets;
    acumuladoU += jornada.unidades;
    acumuladoK += jornada.kg;
    const paradas = [...(detalle?.paradasProg ?? []), ...(detalle?.paradasNo ?? [])].map((parada) => ({
      causa: causas.get(parada.idCausa) || `Causa ${parada.idCausa}`,
      tiempo: parada.tiempo,
      descripcion: parada.descripcion,
    }));
    return {
      id: jornada.id,
      fecha: jornada.fecha,
      pallets: jornada.pallets,
      unidades: jornada.unidades,
      kg: jornada.kg,
      consumos,
      palletsPendientes: Math.max(0, solicitud.pallets_solicitados - acumuladoP),
      unidadesPendientes: Math.max(0, solicitud.unidades_solicitadas - acumuladoU),
      kgPendientes: Math.max(0, solicitud.kg_solicitados - acumuladoK),
      hsDisponibles: detalle?.hsDisponibles ?? 0,
      hsProductivas: detalle?.hsProductivas ?? 0,
      hsParadasProg: detalle?.hsParadasProg ?? 0,
      hsParadasNo: detalle?.hsParadasNo ?? 0,
      rendimientoKgH: detalle?.rendimientoKgH ?? 0,
      paradas,
    };
  });
}

function lotesConDevolucion(lotes: Record<string, LoteStock[]>, detalle: DetalleJornada | null) {
  if (!detalle) return lotes;
  const copia: Record<string, LoteStock[]> = {};
  for (const [id, lista] of Object.entries(lotes)) {
    copia[id] = lista.map((item) => ({ ...item }));
  }
  for (const lote of detalle.lotes) {
    const claveId = String(lote.idIngrediente);
    const lista = (copia[claveId] ??= []);
    const hallado = lista.find((item) => clave(item.lote) === clave(lote.lote));
    if (hallado) hallado.stock = r3(hallado.stock + lote.cantidad);
    else if (lote.lote) {
      lista.push({ lote: lote.lote, stock: r3(lote.cantidad) });
      lista.sort((a, b) => clave(a.lote).localeCompare(clave(b.lote), "es"));
    }
  }
  return copia;
}

export function validarRegistro(datos: DatosProduccion, payload: PayloadRegistro): string[] {
  const errores: string[] = [];
  const sinSolicitud = payload.idSolicitud == null;
  const solicitud = sinSolicitud
    ? null
    : datos.solicitudes.find((item) => item.id === payload.idSolicitud) ?? null;
  if (!sinSolicitud && (solicitud == null || solicitud.id == null)) {
    return ["Seleccioná una solicitud pendiente."];
  }
  const { hsPp, hsNp } = calcularHoras(payload.hsDisponibles, payload.paradasProg, payload.paradasNo);
  if (sinSolicitud) {
    if (payload.hsDisponibles <= 0.0005) errores.push("Indicá las horas disponibles de la jornada.");
    if (!payload.paradasProg.length && !payload.paradasNo.length) {
      errores.push("Cargá al menos una parada programada o no programada.");
    }
  } else {
    const hay = payload.pallets > 0.0005 || payload.hsDisponibles > 0.0005 || hsPp > 0 || hsNp > 0;
    if (!hay) errores.push("Indicá pallets elaborados o las horas de la jornada.");
  }
  if (hsPp + hsNp > payload.hsDisponibles + 0.01 && (hsPp > 0 || hsNp > 0)) {
    errores.push("Las horas paradas no pueden superar las horas disponibles.");
  }
  for (const parada of [...payload.paradasProg, ...payload.paradasNo]) {
    if (parada.tiempo <= 0) {
      errores.push("Cada parada tiene que tener un tiempo mayor a 0.");
      break;
    }
    if (parada.idCausa <= 0) {
      errores.push("Elegí la causa de cada parada.");
      break;
    }
  }
  if (!payload.idsLimpieza.length) errores.push("Completá la limpieza previa de equipos.");
  if (sinSolicitud) return errores;
  if (!payload.idsOperarios.length) errores.push("Cargá al menos un operario de producción.");
  if (payload.idEncargado == null) errores.push("Cargá el encargado de producción.");
  if (payload.pallets <= 0.0005 || !solicitud) return errores;

  const detalle = payload.idProduccion != null ? datos.detalles[String(payload.idProduccion)] ?? null : null;
  const formula = datos.formulas[String(solicitud.id_version ?? "")] ?? [];
  const kg = kgElaborados(solicitud, payload.pallets);
  const lotesStock = lotesConDevolucion(datos.lotes, detalle);
  if (formula.length) {
    const porIng = new Map<number, LoteConsumo[]>();
    for (const lote of payload.lotes) {
      if (lote.cantidad <= 0.0005) continue;
      const lista = porIng.get(lote.idIngrediente) ?? [];
      lista.push(lote);
      porIng.set(lote.idIngrediente, lista);
    }
    for (const linea of formula) {
      const necesario = kgNecesarios(linea, kg);
      if (necesario <= 0.0005) continue;
      const asignados = porIng.get(linea.idIngrediente) ?? [];
      const cargado = asignados.reduce((s, item) => s + item.cantidad, 0);
      const lotesArt = lotesStock[String(linea.idIngrediente)] ?? [];
      const stockTotal = lotesArt.reduce((s, item) => s + Math.max(0, item.stock), 0);
      for (const item of asignados) {
        const stockLote = lotesArt.find((lote) => clave(lote.lote) === clave(item.lote))?.stock ?? 0;
        if (item.cantidad > stockLote + 0.01) {
          errores.push(
            `${linea.etiqueta} · lote ${item.lote}: el stock disponible es ${nroDec(stockLote)} kg.`,
          );
        }
      }
      if (stockTotal + 0.01 < necesario) {
        errores.push(
          `${linea.etiqueta}: stock insuficiente. Se necesitan ${nroDec(necesario)} kg y el stock disponible es ${nroDec(stockTotal)} kg.`,
        );
        continue;
      }
      if (Math.abs(cargado - necesario) > 0.01) {
        errores.push(
          `${linea.etiqueta}: se necesitan ${nroDec(necesario)} kg y hay cargados ${nroDec(cargado)} kg.`,
        );
      }
    }
  } else if (!payload.lotes.some((item) => item.cantidad > 0)) {
    errores.push("Cargá al menos un consumo de ingrediente.");
  }

  const extra = detalle?.extra ?? { envase: 0, etiqueta: 0, insumos: [] };
  const unidades = unidadesElaboradas(solicitud, payload.pallets);
  if (unidades > 0.0005 && solicitud.id_envase != null) {
    const stock = stockDe(datos.stock, "envase", solicitud.codigo_envase, solicitud.envase) + extra.envase;
    if (stock + 0.01 < unidades) {
      errores.push(
        `Envase ${etiquetaIng(solicitud.codigo_envase, solicitud.envase)}: stock insuficiente. Se necesitan ${nroDec(unidades)} un. y el stock disponible es ${nroDec(stock)} un.`,
      );
    }
  }
  if (unidades > 0.0005 && solicitud.id_etiqueta != null) {
    const stock =
      stockDe(datos.stock, "etiqueta", solicitud.codigo_etiqueta, solicitud.nombre_etiqueta) + extra.etiqueta;
    if (stock + 0.01 < unidades) {
      errores.push(
        `Etiqueta ${etiquetaIng(solicitud.codigo_etiqueta, solicitud.nombre_etiqueta)}: stock insuficiente. Se necesitan ${nroDec(unidades)} un. y el stock disponible es ${nroDec(stock)} un.`,
      );
    }
  }
  for (const insumo of payload.consumibles) {
    if (!insumo.aplica) continue;
    const cat = datos.consumibles.find((item) => clave(item.codigo) === clave(insumo.codigo));
    const devuelto = extra.insumos.find((item) => clave(item.codigo) === clave(insumo.codigo))?.cantidad ?? 0;
    const stock = stockDe(datos.stock, "insumo", insumo.codigo, cat?.nombre ?? "") + devuelto;
    if (stock + 0.01 < payload.pallets) {
      errores.push(
        `Insumo ${etiquetaIng(insumo.codigo, cat?.nombre ?? insumo.codigo)}: stock insuficiente. Se necesitan ${nroDec(payload.pallets)} un. y el stock disponible es ${nroDec(stock)} un.`,
      );
    }
  }
  return errores;
}

export function pendientesInforme(todas: JornadaLista[], visibles: JornadaLista[]) {
  const grupos = new Map<string, JornadaLista[]>();
  for (const jornada of todas) {
    const lote = jornada.lote.trim().toUpperCase();
    const claveGrupo = lote ? `l:${lote}` : jornada.idSolicitud != null ? `s:${jornada.idSolicitud}` : `id:${jornada.id}`;
    const lista = grupos.get(claveGrupo) ?? [];
    lista.push(jornada);
    grupos.set(claveGrupo, lista);
  }
  const ids = new Set(visibles.map((item) => item.id));
  const resultado = new Map<number, { pal: number; un: number; kg: number; ultima: boolean }>();
  for (const items of grupos.values()) {
    const ultima = items.reduce((mejor, item) => {
      const fa = item.fecha ?? "";
      const fb = mejor.fecha ?? "";
      if (fa > fb || (fa === fb && item.id > mejor.id)) return item;
      return mejor;
    });
    const pal = Math.max(0, ultima.palletsSolicitados - items.reduce((s, item) => s + item.pallets, 0));
    const un = Math.max(0, ultima.unidadesSolicitadas - items.reduce((s, item) => s + item.unidades, 0));
    const kg = Math.max(0, ultima.kgSolicitados - items.reduce((s, item) => s + item.kg, 0));
    for (const jornada of items) {
      if (!ids.has(jornada.id)) continue;
      resultado.set(jornada.id, { pal, un, kg, ultima: jornada.id === ultima.id });
    }
  }
  return resultado;
}

export function informeStock(datos: DatosProduccion): InformeStock {
  const activasPend = datos.solicitudes
    .filter(
      (item) =>
        item.id != null &&
        (item.kg_pendientes > 0.0005 || item.unidades_pendientes > 0.0005 || item.pallets_pendientes > 0.0005),
    )
    .sort((a, b) => clave(a.orden_compra).localeCompare(clave(b.orden_compra), "es") || clave(a.lote).localeCompare(clave(b.lote), "es"));
  const columnas = activasPend.map((item) => ({
    id: item.id as number,
    titulo: item.orden_compra || item.lote || `Solicitud ${item.id}`,
  }));
  const ordenes = activasPend.map((item) => ({
    codigo: item.codigo_producto,
    producto: item.producto,
    cantidad: item.kg_pendientes,
    ordenCompra: item.orden_compra,
    version: item.version,
    lote: item.lote,
  }));
  if (!activasPend.length) {
    return {
      columnas: [],
      ordenes: [],
      filas: [],
      resumen: { ordenes: 0, consumoTotal: 0, itemsFaltante: 0, estado: "Sin producción pendiente", alertas: [] },
    };
  }
  const indices = new Map(activasPend.map((item, indice) => [item.id as number, indice]));
  const n = activasPend.length;
  const usados = new Map<number, Set<string>>();
  for (const detalle of Object.values(datos.detalles)) {
    if (detalle.idSolicitud == null || !indices.has(detalle.idSolicitud)) continue;
    const set = usados.get(detalle.idSolicitud) ?? new Set<string>();
    for (const insumo of detalle.extra.insumos) {
      if (insumo.cantidad > 0.0005) set.add(clave(insumo.codigo));
    }
    usados.set(detalle.idSolicitud, set);
  }
  type Acum = { grupo: string; etiqueta: string; unidad: string; stock: number; cantidades: number[]; orden: number };
  const acumulado = new Map<string, Acum>();
  const ordenGrupo: Record<string, number> = { Ingredientes: 0, Envases: 1, Insumos: 2, Etiquetas: 3 };
  function sumar(grupo: string, claveItem: string, etiqueta: string, unidad: string, stock: number, idSolicitud: number, cantidad: number) {
    if (cantidad <= 0.0005) return;
    const claveFila = `${grupo}|${claveItem}`;
    let fila = acumulado.get(claveFila);
    if (!fila) {
      fila = { grupo, etiqueta, unidad, stock: Math.max(0, stock), cantidades: Array(n).fill(0), orden: ordenGrupo[grupo] ?? 9 };
      acumulado.set(claveFila, fila);
    }
    const indice = indices.get(idSolicitud);
    if (indice != null) fila.cantidades[indice] += cantidad;
  }
  for (const solicitud of activasPend) {
    const id = solicitud.id as number;
    for (const linea of datos.formulas[String(solicitud.id_version ?? "")] ?? []) {
      const porId = (datos.lotes[String(linea.idIngrediente)] ?? []).reduce((s, lote) => s + Math.max(0, lote.stock), 0);
      const stock = datos.lotes[String(linea.idIngrediente)]
        ? porId
        : stockDe(datos.stock, "ingrediente", linea.codigo, linea.nombre);
      sumar("Ingredientes", `ing-${linea.idIngrediente}`, linea.etiqueta, "Kg", stock, id, kgNecesarios(linea, solicitud.kg_pendientes));
    }
    if (solicitud.unidades_pendientes > 0.0005 && (solicitud.id_envase != null || solicitud.envase || solicitud.codigo_envase)) {
      sumar(
        "Envases",
        `env-${solicitud.id_envase ?? (clave(solicitud.codigo_envase) || clave(solicitud.envase))}`,
        etiquetaIng(solicitud.codigo_envase, solicitud.envase),
        "Unidades",
        stockDe(datos.stock, "envase", solicitud.codigo_envase, solicitud.envase),
        id,
        solicitud.unidades_pendientes,
      );
    }
    if (
      solicitud.unidades_pendientes > 0.0005 &&
      (solicitud.id_etiqueta != null || solicitud.nombre_etiqueta || solicitud.codigo_etiqueta)
    ) {
      sumar(
        "Etiquetas",
        `eti-${solicitud.id_etiqueta ?? (clave(solicitud.codigo_etiqueta) || clave(solicitud.nombre_etiqueta))}`,
        etiquetaIng(solicitud.codigo_etiqueta, solicitud.nombre_etiqueta),
        "Unidades",
        stockDe(datos.stock, "etiqueta", solicitud.codigo_etiqueta, solicitud.nombre_etiqueta),
        id,
        solicitud.unidades_pendientes,
      );
    }
    if (solicitud.pallets_pendientes > 0.0005) {
      const usadosSol = usados.get(id) ?? new Set<string>();
      for (const insumo of datos.consumibles) {
        if (!insumo.aplica && !usadosSol.has(clave(insumo.codigo))) continue;
        sumar(
          "Insumos",
          `ins-${clave(insumo.codigo)}`,
          etiquetaIng(insumo.codigo, insumo.nombre),
          "Unidades",
          stockDe(datos.stock, "insumo", insumo.codigo, insumo.nombre),
          id,
          solicitud.pallets_pendientes,
        );
      }
    }
  }
  const filas: FilaInforme[] = [...acumulado.values()]
    .sort((a, b) => a.orden - b.orden || clave(a.etiqueta).localeCompare(clave(b.etiqueta), "es"))
    .map((item) => {
      const total = item.cantidades.reduce((s, n) => s + n, 0);
      return {
        grupo: item.grupo,
        etiqueta: item.etiqueta,
        unidad: item.unidad,
        cantidades: item.cantidades,
        total,
        stock: item.stock,
        faltante: Math.max(0, total - item.stock),
        sobrante: Math.max(0, item.stock - total),
      };
    })
    .filter((item) => item.total > 0.0005);
  const faltantes = filas.filter((fila) => fila.faltante > 0.0005);
  const grupos = new Set(faltantes.map((fila) => fila.grupo));
  let estado = "Atención: hay faltantes";
  if (!faltantes.length) estado = "Stock suficiente";
  else if (grupos.size === 1 && grupos.has("Etiquetas")) estado = "Atención: faltante de etiquetas";
  else if (grupos.size === 1 && grupos.has("Ingredientes")) estado = "Atención: faltante de ingredientes";
  else if ([...grupos].every((grupo) => grupo === "Envases" || grupo === "Insumos")) {
    estado = "Atención: faltante de envases/insumos";
  }
  function detalleGrupo(grupo: string) {
    return faltantes
      .filter((fila) => fila.grupo === grupo)
      .map((fila) => {
        const codigo = fila.etiqueta.split("—")[0]?.trim() || fila.etiqueta;
        return `${nroDec(fila.faltante)} ${fila.unidad.toLowerCase()} ${codigo}`;
      })
      .join("; ");
  }
  const alertas: { tipo: string; texto: string }[] = [];
  const ing = detalleGrupo("Ingredientes");
  alertas.push(
    ing
      ? { tipo: "alerta", texto: `Faltante detectado: ${ing}. Se requiere gestionar la compra de ingredientes.` }
      : { tipo: "ok", texto: "Sin faltantes en ingredientes. Todos los ingredientes tienen stock suficiente." },
  );
  const env = faltantes.filter((fila) => fila.grupo === "Envases" || fila.grupo === "Insumos");
  alertas.push(
    env.length
      ? {
          tipo: "alerta",
          texto: `Faltante detectado: ${env.map((fila) => `${nroDec(fila.faltante)} ${fila.unidad.toLowerCase()} ${(fila.etiqueta.split("—")[0] || fila.etiqueta).trim()}`).join("; ")}. Se requiere gestionar la compra de envases o insumos.`,
        }
      : { tipo: "ok", texto: "Sin faltantes en envases e insumos. Todos los envases e insumos tienen stock suficiente." },
  );
  const eti = detalleGrupo("Etiquetas");
  alertas.push(
    eti
      ? { tipo: "alerta", texto: `Faltante detectado: ${eti}. Se requiere gestionar la compra o la producción de etiquetas.` }
      : { tipo: "ok", texto: "Sin faltantes en etiquetas. Todas las etiquetas tienen stock suficiente." },
  );
  return {
    columnas,
    ordenes,
    filas,
    resumen: {
      ordenes: ordenes.length,
      consumoTotal: filas.reduce((s, fila) => s + fila.total, 0),
      itemsFaltante: faltantes.length,
      estado,
      alertas,
    },
  };
}

export type PlanDosificacion = {
  pallets: number;
  unidadesPorPallet: number;
  pesoUnitario: number;
  kgPorPallet: number;
  kgTotales: number;
  batchsPorPallet: number;
  batchsTotales: number;
  kgPorBatch: number;
  lineas: { etiqueta: string; participacion: number; kgPorBatch: number; kgTotales: number }[];
};

export function planDosificacion(
  formula: LineaFormula[],
  pallets: number,
  unidadesPorPallet: number,
  pesoUnitario: number,
  batchsPorPallet: number,
): PlanDosificacion {
  const pal = Math.max(0, pallets);
  const upp = Math.max(0, unidadesPorPallet);
  const peso = Math.max(0, pesoUnitario);
  const batchs = Math.max(0, Math.round(batchsPorPallet * 10) / 10);
  const kgPorPallet = upp * peso;
  const kgTotales = pal * kgPorPallet;
  const kgPorBatch = batchs > 0 ? kgPorPallet / batchs : 0;
  return {
    pallets: pal,
    unidadesPorPallet: upp,
    pesoUnitario: peso,
    kgPorPallet,
    kgTotales,
    batchsPorPallet: batchs,
    batchsTotales: batchs > 0 ? pal * batchs : 0,
    kgPorBatch,
    lineas: formula.map((linea) => ({
      etiqueta: linea.etiqueta,
      participacion: linea.participacion,
      kgPorBatch: linea.participacion * kgPorBatch,
      kgTotales: Math.max(0, linea.participacion * kgTotales),
    })),
  };
}

export function armarProduccion(crudo: {
  solicitudes: Record<string, unknown>[];
  producciones: Record<string, unknown>[];
  productos: Record<string, unknown>[];
  versiones: Record<string, unknown>[];
  envases: Record<string, unknown>[];
  etiquetas: Record<string, unknown>[];
  ingredientes: Record<string, unknown>[];
  insumos: Record<string, unknown>[];
  equipos: Record<string, unknown>[];
  usuarios: Record<string, unknown>[];
  roles: Record<string, unknown>[];
  causas: Record<string, unknown>[];
  recetas: Record<string, unknown>[];
  articulos: Record<string, unknown>[];
  consumos: Record<string, unknown>[];
  movIng: Record<string, unknown>[];
  movEnv: Record<string, unknown>[];
  movIns: Record<string, unknown>[];
  movEti: Record<string, unknown>[];
  movProd: Record<string, unknown>[];
  paradasProg: Record<string, unknown>[];
  paradasNo: Record<string, unknown>[];
  responsables: Record<string, unknown>[];
  limpiezas: Record<string, unknown>[];
  barridos: Record<string, unknown>[];
}): DatosProduccion {
  const porSolicitud = new Map<number, { pallets: number; unidades: number; kg: number }>();
  for (const fila of crudo.producciones) {
    const idSol = idEntero(fila.id_solicitud);
    if (idSol == null) continue;
    const b = porSolicitud.get(idSol) || { pallets: 0, unidades: 0, kg: 0 };
    b.pallets += numero(fila.pallets);
    b.unidades += numero(fila.unidades);
    b.kg += numero(fila.peso_kg);
    porSolicitud.set(idSol, b);
  }
  const mapaProductos = mapaId(crudo.productos);
  const mapaVersiones = mapaId(crudo.versiones);
  const mapaEnvases = mapaId(crudo.envases);
  const mapaEtiquetas = mapaId(crudo.etiquetas);
  const solicitudes = ordenarSolicitudes(
    crudo.solicitudes
      .filter((fila) => idEntero(fila.id) != null || texto(fila.lote) !== "")
      .map((fila) =>
        enriquecerSolicitud(fila, porSolicitud, mapaProductos, mapaVersiones, mapaEnvases, mapaEtiquetas),
      ),
  );
  const porIdSol = new Map(solicitudes.filter((item) => item.id != null).map((item) => [item.id as number, item]));

  const mapaRoles = new Map<number, string>();
  for (const fila of crudo.roles) {
    const id = idEntero(fila.id);
    if (id != null) mapaRoles.set(id, texto(fila.nombre));
  }
  const usuarios: UsuarioOpcion[] = [];
  for (const fila of crudo.usuarios) {
    const id = idEntero(fila.id);
    if (id == null) continue;
    const nombre = texto(fila.nombre);
    const apellido = texto(fila.apellido);
    const idRol = idEntero(fila.id_rol);
    usuarios.push({
      id,
      nombre,
      apellido,
      rol: texto(fila.rol),
      rolNombre: (idRol != null ? mapaRoles.get(idRol) : "") || texto(fila.rol),
      estado: texto(fila.estado),
      etiqueta: etiquetaUsuario(nombre, apellido, id),
    });
  }
  usuarios.sort((a, b) => clave(a.etiqueta).localeCompare(clave(b.etiqueta), "es"));

  const equipos: EquipoOpcion[] = [];
  for (const fila of crudo.equipos) {
    const id = idEntero(fila.id);
    const nombre = texto(fila.equipo);
    if (id == null || !nombre) continue;
    equipos.push({ id, nombre, estado: texto(fila.estado) });
  }
  equipos.sort((a, b) => a.id - b.id);

  const ingredientes: IngredienteOpcion[] = [];
  for (const fila of crudo.ingredientes) {
    const id = idEntero(fila.id);
    if (id == null) continue;
    const codigo = texto(fila.codigo);
    const nombre = texto(fila.ingrediente);
    if (!codigo && !nombre) continue;
    ingredientes.push({ id, codigo, nombre, etiqueta: etiquetaIng(codigo, nombre, id) });
  }
  const porIng = new Map(ingredientes.map((item) => [item.id, item]));

  const causas: CausaParada[] = [];
  for (const fila of crudo.causas) {
    const id = idEntero(fila.id);
    const causa = texto(fila.causa);
    if (id == null || !causa) continue;
    causas.push({ id, causa });
  }
  causas.sort((a, b) => a.id - b.id);

  const porCodigoIns = new Map<string, string>();
  for (const fila of crudo.insumos) {
    const codigo = texto(fila.codigo);
    if (codigo) porCodigoIns.set(clave(codigo), texto(fila.insumo));
  }
  const consumibles: InsumoConsumible[] = [
    [CODIGO_CORRUGADO, true],
    [CODIGO_DURO, false],
    [CODIGO_PALLETS_EXP, false],
  ].map(([codigo, aplica]) => ({
    codigo: String(codigo),
    nombre: porCodigoIns.get(clave(String(codigo))) || String(codigo),
    aplica: Boolean(aplica),
  }));

  const formulas: Record<string, LineaFormula[]> = {};
  for (const fila of crudo.recetas) {
    const idVersion = idEntero(fila.id_version);
    const idIng = idEntero(fila.id_ingrediente);
    if (idVersion == null || idIng == null) continue;
    const item = porIng.get(idIng);
    const linea: LineaFormula = {
      idVersion,
      tipo: texto(fila.tipo_ingrediente),
      puesto: idEntero(fila.puesto) ?? 0,
      idIngrediente: idIng,
      codigo: item?.codigo ?? "",
      nombre: item?.nombre ?? `Ingrediente ${idIng}`,
      participacion: numero(fila.participacion),
      etiqueta: item?.etiqueta ?? etiquetaIng("", "", idIng),
    };
    (formulas[String(idVersion)] ??= []).push(linea);
  }
  for (const lista of Object.values(formulas)) {
    lista.sort(
      (a, b) =>
        Number(clave(a.tipo) !== "macro") - Number(clave(b.tipo) !== "macro") ||
        a.puesto - b.puesto ||
        a.nombre.localeCompare(b.nombre, "es"),
    );
  }

  const arts = articulosDe(crudo.articulos);
  const porArt = new Map(arts.map((item) => [item.id, item]));
  const lotesMapa = calcularLotes(CATALOGOS.ingredientes, crudo.ingredientes, crudo.movIng, crudo.articulos, crudo.consumos);
  const lotes: Record<string, LoteStock[]> = {};
  for (const [id, lista] of lotesMapa) {
    const visibles = lista
      .filter((item) => item.stock >= 0.005)
      .map((item) => ({ lote: item.lote, stock: r3(item.stock) }))
      .sort((a, b) => clave(a.lote).localeCompare(clave(b.lote), "es"));
    if (visibles.length) lotes[String(id)] = visibles;
  }

  function stockTipo(
    tipo: "ingredientes" | "envases" | "insumos" | "etiquetas",
    catalogo: Record<string, unknown>[],
    movimientos: Record<string, unknown>[],
    campoNombre: string,
  ) {
    const mapa = calcularStock(CATALOGOS[tipo], catalogo, movimientos, crudo.articulos, crudo.consumos);
    const salida: StockArt[] = [];
    for (const fila of catalogo) {
      const id = idEntero(fila.id);
      if (id == null) continue;
      salida.push({
        tipo: CATALOGOS[tipo].tipoArticulo,
        id,
        codigo: texto(fila.codigo),
        nombre: texto(fila[campoNombre]),
        stock: r3(Math.max(0, mapa.get(id)?.stock ?? 0)),
      });
    }
    return salida;
  }
  const stock = [
    ...stockTipo("ingredientes", crudo.ingredientes, crudo.movIng, "ingrediente"),
    ...stockTipo("envases", crudo.envases, crudo.movEnv, "envase"),
    ...stockTipo("insumos", crudo.insumos, crudo.movIns, "insumo"),
    ...stockTipo("etiquetas", crudo.etiquetas, crudo.movEti, "etiqueta"),
  ];

  function paradasDe(filas: Record<string, unknown>[], idProduccion: number): ParadaCarga[] {
    return filas
      .filter((fila) => idEntero(fila.id_produccion) === idProduccion)
      .map((fila) => ({
        idCausa: idEntero(fila.id_causas) ?? 0,
        tiempo: numero(fila.tiempo_en_hs),
        descripcion: texto(fila.descripcion),
      }))
      .filter((parada) => parada.tiempo > 0 && parada.idCausa > 0);
  }

  const jornadas: JornadaLista[] = [];
  for (const fila of crudo.producciones) {
    const id = idEntero(fila.id);
    if (id == null) continue;
    const idSol = idEntero(fila.id_solicitud);
    const solicitud = idSol != null ? porIdSol.get(idSol) : undefined;
    jornadas.push({
      id,
      fecha: aFecha(fila.fecha_registro),
      idSolicitud: idSol,
      ordenCompra: solicitud?.orden_compra ?? "",
      ordenProduccion: solicitud?.orden_produccion ?? "",
      codigoProducto: solicitud?.codigo_producto ?? "",
      producto: solicitud?.producto ?? "",
      kgSolicitados: solicitud?.kg_solicitados ?? 0,
      pesoUnitario: solicitud?.peso_unitario ?? 0,
      envase: solicitud?.envase ?? "",
      lote: solicitud?.lote ?? "",
      pallets: numero(fila.pallets),
      unidades: numero(fila.unidades),
      kg: numero(fila.peso_kg),
      palletsSolicitados: solicitud?.pallets_solicitados ?? 0,
      unidadesSolicitadas: solicitud?.unidades_solicitadas ?? 0,
    });
  }
  jornadas.sort((a, b) => (b.fecha ?? "").localeCompare(a.fecha ?? "") || b.id - a.id);

  const detalles: Record<string, DetalleJornada> = {};
  const resumenes: Record<string, ResumenConsumo> = {};
  const produccionesPorSol = new Map<number, Record<string, unknown>[]>();
  for (const fila of crudo.producciones) {
    const idSol = idEntero(fila.id_solicitud);
    if (idSol == null) continue;
    const lista = produccionesPorSol.get(idSol) ?? [];
    lista.push(fila);
    produccionesPorSol.set(idSol, lista);
  }
  for (const lista of produccionesPorSol.values()) {
    lista.sort((a, b) => (aFecha(a.fecha_registro) ?? "").localeCompare(aFecha(b.fecha_registro) ?? "") || (idEntero(a.id) ?? 0) - (idEntero(b.id) ?? 0));
  }

  for (const fila of crudo.producciones) {
    const id = idEntero(fila.id);
    if (id == null) continue;
    const idSol = idEntero(fila.id_solicitud);
    const fecha = aFecha(fila.fecha_registro);
    if (idSol == null) {
      detalles[String(id)] = {
        id,
        idSolicitud: null,
        fecha,
        pallets: 0,
        unidades: 0,
        kg: 0,
        hsDisponibles: numero(fila.hs_disponibles),
        hsProductivas: numero(fila.hs_productivas),
        hsParadasProg: numero(fila.hs_paradas_programadas),
        hsParadasNo: numero(fila.hs_paradas_no_p),
        rendimientoKgH: numero(fila.rendimiento_kg_h),
        paradasProg: paradasDe(crudo.paradasProg, id),
        paradasNo: paradasDe(crudo.paradasNo, id),
        lotes: [],
        aplicaCorrugado: false,
        aplicaDuro: false,
        aplicaExportacion: false,
        palletInicial: 1,
        extra: { envase: 0, etiqueta: 0, insumos: [] },
      };
      continue;
    }
    let acumulado = 0;
    for (const item of produccionesPorSol.get(idSol) ?? []) {
      if (idEntero(item.id) === id) break;
      acumulado += numero(item.pallets);
    }
    const lotesDia: LoteConsumo[] = [];
    const extra: ExtraEmpaque = { envase: 0, etiqueta: 0, insumos: [] };
    let corrugado = 0;
    let duro = 0;
    let exportacion = 0;
    const resumen = (resumenes[String(idSol)] ??= { envases: 0, etiquetas: 0, corrugado: 0, duro: 0, exportacion: 0 });
    for (const consumo of crudo.consumos) {
      if (idEntero(consumo.id_solicitud) !== idSol || aFecha(consumo.fecha_registro) !== fecha) continue;
      const art = porArt.get(idEntero(consumo.id_articulo) ?? -1);
      if (!art) continue;
      const cantidad = numero(consumo.cantidad);
      if (art.tipo === "ingrediente" && art.idOrigen != null) {
        lotesDia.push({
          idIngrediente: art.idOrigen,
          articulo: etiquetaIng(art.codigo, art.nombre),
          lote: texto(consumo.lote_articulo),
          cantidad,
          palletInicio: idEntero(consumo.pallet_inicio),
          palletFin: idEntero(consumo.pallet_fin),
        });
      } else if (art.tipo === "envase") {
        extra.envase += cantidad;
        resumen.envases += cantidad;
      } else if (art.tipo === "etiqueta") {
        extra.etiqueta += cantidad;
        resumen.etiquetas += cantidad;
      } else if (art.tipo === "insumo") {
        extra.insumos.push({ codigo: art.codigo, cantidad });
        const codigo = clave(art.codigo);
        if (codigo === clave(CODIGO_CORRUGADO)) {
          corrugado += cantidad;
          resumen.corrugado += cantidad;
        } else if (codigo === clave(CODIGO_DURO)) {
          duro += cantidad;
          resumen.duro += cantidad;
        } else if (codigo === clave(CODIGO_PALLETS_EXP)) {
          exportacion += cantidad;
          resumen.exportacion += cantidad;
        }
      }
    }
    detalles[String(id)] = {
      id,
      idSolicitud: idSol,
      fecha,
      pallets: numero(fila.pallets),
      unidades: numero(fila.unidades),
      kg: numero(fila.peso_kg),
      hsDisponibles: numero(fila.hs_disponibles),
      hsProductivas: numero(fila.hs_productivas),
      hsParadasProg: numero(fila.hs_paradas_programadas),
      hsParadasNo: numero(fila.hs_paradas_no_p),
      rendimientoKgH: numero(fila.rendimiento_kg_h),
      paradasProg: paradasDe(crudo.paradasProg, id),
      paradasNo: paradasDe(crudo.paradasNo, id),
      lotes: lotesDia,
      aplicaCorrugado: corrugado > 0.0005,
      aplicaDuro: duro > 0.0005,
      aplicaExportacion: exportacion > 0.0005,
      palletInicial: Math.round(acumulado) + 1,
      extra,
    };
  }

  const previos: Record<string, PrevioSolicitud> = {};
  function previo(idSol: number) {
    return (previos[String(idSol)] ??= { operarios: [], encargado: null, limpieza: [], barridos: [] });
  }
  for (const fila of crudo.responsables) {
    const idSol = idEntero(fila.id_solicitud);
    const idUsuario = idEntero(fila.id_usuario);
    if (idSol == null || idUsuario == null) continue;
    const resp = texto(fila.responsabilidad);
    const item = previo(idSol);
    if (resp === RESP_OPERARIO) item.operarios.push(idUsuario);
    if (resp === RESP_ENCARGADO) item.encargado = idUsuario;
  }
  for (const fila of crudo.limpiezas) {
    const idSol = idEntero(fila.id_solicitud);
    const idEquipo = idEntero(fila.id_equipo);
    if (idSol == null || idEquipo == null) continue;
    previo(idSol).limpieza.push(idEquipo);
  }
  for (const fila of crudo.barridos) {
    const idSol = idEntero(fila.id_solicitud);
    const idIng = idEntero(fila.id_ingrediente);
    const id = idEntero(fila.id);
    if (idSol == null || idIng == null || id == null) continue;
    previo(idSol).barridos.push({ id, idIngrediente: idIng, pesaje: numero(fila.pesaje_total) });
  }
  const limpiezaLibre = crudo.limpiezas
    .filter((fila) => idEntero(fila.id_solicitud) == null && idEntero(fila.id_equipo) != null && aFecha(fila.fecha_registro))
    .map((fila) => ({
      fecha: aFecha(fila.fecha_registro) as string,
      idEquipo: idEntero(fila.id_equipo) as number,
      id: idEntero(fila.id) ?? 0,
    }));
  const articulos = arts.map((art) => ({
    id: art.id,
    tipo: art.tipo,
    idOrigen: art.idOrigen,
    codigo: art.codigo,
  }));
  const consumosRef = crudo.consumos
    .map((fila) => ({
      id: idEntero(fila.id),
      idSolicitud: idEntero(fila.id_solicitud),
      fecha: aFecha(fila.fecha_registro),
    }))
    .filter((fila): fila is { id: number; idSolicitud: number | null; fecha: string | null } => fila.id != null);
  const cierresProducto: { id: number; idProduccion: number }[] = [];
  for (const fila of crudo.movProd) {
    const id = idEntero(fila.id);
    const obs = texto(fila.observaciones);
    if (id == null || !obs.startsWith(PREFIJO_CIERRE)) continue;
    const idProduccion = idEntero(obs.slice(PREFIJO_CIERRE.length));
    if (idProduccion == null) continue;
    cierresProducto.push({ id, idProduccion });
  }
  const limpiezasRef = crudo.limpiezas
    .map((fila) => ({
      id: idEntero(fila.id),
      idSolicitud: idEntero(fila.id_solicitud),
      fecha: aFecha(fila.fecha_registro),
    }))
    .filter((fila): fila is { id: number; idSolicitud: number | null; fecha: string | null } => fila.id != null);

  return {
    solicitudes,
    usuarios,
    equipos,
    ingredientes,
    causas,
    consumibles,
    jornadas,
    formulas,
    lotes,
    stock,
    detalles,
    previos,
    limpiezaLibre,
    resumenes,
    articulos,
    consumosRef,
    cierresProducto,
    limpiezasRef,
    error: null,
  };
}

export function vacio(): DatosProduccion {
  return {
    solicitudes: [],
    usuarios: [],
    equipos: [],
    ingredientes: [],
    causas: [],
    consumibles: [],
    jornadas: [],
    formulas: {},
    lotes: {},
    stock: [],
    detalles: {},
    previos: {},
    limpiezaLibre: [],
    resumenes: {},
    articulos: [],
    consumosRef: [],
    cierresProducto: [],
    limpiezasRef: [],
    error: null,
  };
}

export function estadoCompletada(estado: string) {
  return estado === ESTADO_COMPLETADA;
}
