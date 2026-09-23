import {
  CATALOGOS,
  ESTADO_ACTIVO,
  armarArticulos,
  calcularLotes,
  calcularStock,
  type ArticuloVista,
  type KindCatalogo,
} from "@/lib/catalogos/logic";
import { tipoClave } from "@/lib/movimientos/logic";
import {
  aFecha,
  clave,
  idEntero,
  numero,
  texto,
} from "@/lib/solicitudes/logic";
import { hoyIso } from "@/lib/planificacion/logic";
import { sumarDias, type ParteIndicador } from "@/lib/analytics/logic";

export const DIAS_VENCIMIENTO = 30;
export const FAMILIAS_STOCK: { id: KindCatalogo | "Todas"; label: string }[] = [
  { id: "Todas", label: "Todas" },
  { id: "ingredientes", label: "Ingredientes" },
  { id: "insumos", label: "Insumos" },
  { id: "envases", label: "Envases" },
  { id: "etiquetas", label: "Etiquetas" },
];

export type FamiliaStock = KindCatalogo | "Todas";

export type MovimientoStock = {
  familia: KindCatalogo;
  fecha: string | null;
  tipo: "ingreso" | "egreso";
  articulo: string;
  lote: string;
  cantidad: number;
};

export type ConsumoStock = {
  fecha: string | null;
  idSolicitud: number | null;
  familia: KindCatalogo;
  articulo: string;
  lote: string;
  cantidad: number;
  producto: string;
  categoria: string;
  loteProducto: string;
};

export type BarridoStock = {
  idSolicitud: number | null;
  ingrediente: string;
  kg: number;
  producto: string;
  categoria: string;
  loteProducto: string;
  fechas: string[];
  fechaSolicitud: string | null;
};

export type LoteAlerta = {
  familia: KindCatalogo;
  articulo: string;
  lote: string;
  stock: number;
  vencimiento: string;
  estado: "vencido" | "proximo";
};

export type DatosStockAnalytics = {
  articulos: { familia: KindCatalogo; items: ArticuloVista[] }[];
  movimientos: MovimientoStock[];
  consumos: ConsumoStock[];
  barridos: BarridoStock[];
};

export type ResumenStock = {
  stockTotal: number;
  unidad: string;
  bajos: number;
  vencidos: number;
  proximos: number;
  ingresos: number;
  egresos: number;
  consumo: number;
  barridosKg: number;
  porFamiliaMov: ParteIndicador[];
  topConsumo: ParteIndicador[];
  topBarridos: ParteIndicador[];
  detalleVencimientos: LoteAlerta[];
  detalleConsumo: ConsumoStock[];
  detalleBarridos: BarridoStock[];
};

type CrudoStock = {
  ingredientes: Record<string, unknown>[];
  insumos: Record<string, unknown>[];
  envases: Record<string, unknown>[];
  etiquetas: Record<string, unknown>[];
  articulos: Record<string, unknown>[];
  movIng: Record<string, unknown>[];
  movIns: Record<string, unknown>[];
  movEnv: Record<string, unknown>[];
  movEti: Record<string, unknown>[];
  consumos: Record<string, unknown>[];
  barridos: Record<string, unknown>[];
  solicitudes: Record<string, unknown>[];
  productos: Record<string, unknown>[];
  producciones: Record<string, unknown>[];
};

function mapa<T extends Record<string, unknown>>(filas: T[]) {
  const out = new Map<number, T>();
  for (const fila of filas) {
    const ident = idEntero(fila.id);
    if (ident != null) out.set(ident, fila);
  }
  return out;
}

function nombreCatalogo(
  filas: Record<string, unknown>[],
  ident: number | null,
  campo: string,
  extra?: string,
) {
  if (ident == null) return extra || "—";
  const fila = filas.find((item) => idEntero(item.id) === ident);
  return texto(fila?.[campo]) || extra || "—";
}

export function armarDatosStock(crudo: CrudoStock): DatosStockAnalytics {
  const kinds: KindCatalogo[] = ["ingredientes", "insumos", "envases", "etiquetas"];
  const catalogos: Record<KindCatalogo, Record<string, unknown>[]> = {
    ingredientes: crudo.ingredientes,
    insumos: crudo.insumos,
    envases: crudo.envases,
    etiquetas: crudo.etiquetas,
  };
  const movimientos: Record<KindCatalogo, Record<string, unknown>[]> = {
    ingredientes: crudo.movIng,
    insumos: crudo.movIns,
    envases: crudo.movEnv,
    etiquetas: crudo.movEti,
  };

  const articulos = kinds.map((familia) => {
    const cfg = CATALOGOS[familia];
    const stocks = calcularStock(
      cfg,
      catalogos[familia],
      movimientos[familia],
      crudo.articulos,
      crudo.consumos,
    );
    const lotes = calcularLotes(
      cfg,
      catalogos[familia],
      movimientos[familia],
      crudo.articulos,
      crudo.consumos,
    );
    return {
      familia,
      items: armarArticulos(cfg, catalogos[familia], stocks, lotes),
    };
  });

  const movs: MovimientoStock[] = [];
  for (const familia of kinds) {
    const cfg = CATALOGOS[familia];
    for (const fila of movimientos[familia]) {
      const tipo = tipoClave(fila.tipo);
      if (tipo !== "ingreso" && tipo !== "egreso") continue;
      const ident = idEntero(fila[cfg.campoIdMov]);
      movs.push({
        familia,
        fecha: aFecha(fila.fecha_registro),
        tipo,
        articulo: nombreCatalogo(
          catalogos[familia],
          ident,
          cfg.campoNombre,
          texto(fila[cfg.campoNombre]),
        ),
        lote: texto(fila.lote),
        cantidad: numero(fila[cfg.campoCantidadMov]),
      });
    }
  }

  const productos = mapa(crudo.productos);
  const solicitudes = mapa(crudo.solicitudes);
  const fechasPorSol = new Map<number, string[]>();
  for (const fila of crudo.producciones) {
    const idSol = idEntero(fila.id_solicitud);
    const fecha = aFecha(fila.fecha_registro);
    if (idSol == null || !fecha) continue;
    const lista = fechasPorSol.get(idSol) ?? [];
    lista.push(fecha);
    fechasPorSol.set(idSol, lista);
  }

  function datosSolicitud(idSol: number | null) {
    const sol = idSol != null ? solicitudes.get(idSol) : undefined;
    const producto = sol ? productos.get(idEntero(sol.id_producto) ?? -1) : undefined;
    return {
      producto: texto(producto?.producto) || "Sin producto",
      categoria: texto(producto?.categoria) || "Sin categoría",
      loteProducto: texto(sol?.lote),
      fechaSolicitud: aFecha(sol?.fecha_registro) ?? null,
    };
  }

  const artPorId = new Map<number, { familia: KindCatalogo; idOrigen: number; nombre: string }>();
  for (const art of crudo.articulos) {
    const ident = idEntero(art.id);
    const origen = idEntero(art.id_origen);
    const tipo = clave(art.tipo_articulo);
    const familia = kinds.find((k) => CATALOGOS[k].tipoArticulo === tipo);
    if (ident == null || origen == null || !familia) continue;
    artPorId.set(ident, {
      familia,
      idOrigen: origen,
      nombre:
        nombreCatalogo(catalogos[familia], origen, CATALOGOS[familia].campoNombre, texto(art.articulo)),
    });
  }

  const consumos: ConsumoStock[] = [];
  for (const fila of crudo.consumos) {
    const art = artPorId.get(idEntero(fila.id_articulo) ?? -1);
    if (!art) continue;
    const idSol = idEntero(fila.id_solicitud);
    const sol = datosSolicitud(idSol);
    consumos.push({
      fecha: aFecha(fila.fecha_registro),
      idSolicitud: idSol,
      familia: art.familia,
      articulo: art.nombre,
      lote: texto(fila.lote_articulo),
      cantidad: numero(fila.cantidad),
      producto: sol.producto,
      categoria: sol.categoria,
      loteProducto: sol.loteProducto,
    });
  }

  const barridos: BarridoStock[] = [];
  for (const fila of crudo.barridos) {
    const idSol = idEntero(fila.id_solicitud);
    const idIng = idEntero(fila.id_ingrediente);
    const sol = datosSolicitud(idSol);
    barridos.push({
      idSolicitud: idSol,
      ingrediente: nombreCatalogo(crudo.ingredientes, idIng, "ingrediente"),
      kg: numero(fila.pesaje_total),
      producto: sol.producto,
      categoria: sol.categoria,
      loteProducto: sol.loteProducto,
      fechas: idSol != null ? (fechasPorSol.get(idSol) ?? []) : [],
      fechaSolicitud: sol.fechaSolicitud,
    });
  }

  return { articulos, movimientos: movs, consumos, barridos };
}

function partesDe(mapa: Map<string, number>, total: number): ParteIndicador[] {
  const items: ParteIndicador[] = [];
  for (const [nombre, valor] of mapa.entries()) {
    if (valor <= 0.0005) continue;
    items.push({
      nombre,
      valor,
      porcentaje: total > 0.0005 ? (valor / total) * 100 : 0,
      extra: 0,
    });
  }
  items.sort((a, b) => b.valor - a.valor || clave(a.nombre).localeCompare(clave(b.nombre)));
  return items.slice(0, 10);
}

function enPeriodo(fecha: string | null, desde: string, hasta: string) {
  return fecha != null && fecha >= desde && fecha <= hasta;
}

function coincideSolicitud(item: { producto: string; categoria: string }, categoria: string, producto: string) {
  if (categoria !== "Todos" && item.categoria !== categoria) return false;
  if (producto !== "Todos" && item.producto !== producto) return false;
  return true;
}

export function resumenStock(
  datos: DatosStockAnalytics,
  opts: {
    desde: string;
    hasta: string;
    familia: FamiliaStock;
    categoria: string;
    producto: string;
    hoy?: string;
  },
): ResumenStock {
  const hoy = opts.hoy ?? hoyIso();
  const limite = sumarDias(hoy, DIAS_VENCIMIENTO);
  const familiaKpi: KindCatalogo = opts.familia === "Todas" ? "ingredientes" : opts.familia;
  const cfg = CATALOGOS[familiaKpi];
  const grupo = datos.articulos.find((g) => g.familia === familiaKpi);
  const activos = (grupo?.items ?? []).filter((item) => item.estado === ESTADO_ACTIVO);

  const vencimientos: LoteAlerta[] = [];
  const origenLotes =
    opts.familia === "Todas" ? datos.articulos : datos.articulos.filter((g) => g.familia === opts.familia);
  for (const grupoArt of origenLotes) {
    for (const item of grupoArt.items) {
      if (item.estado !== ESTADO_ACTIVO) continue;
      for (const lote of item.lotes) {
        const vence = aFecha(lote.vencimiento);
        if (!vence) continue;
        if (vence < hoy) {
          vencimientos.push({
            familia: grupoArt.familia,
            articulo: item.nombre || item.codigo,
            lote: lote.lote,
            stock: lote.stock,
            vencimiento: vence,
            estado: "vencido",
          });
        } else if (vence <= limite) {
          vencimientos.push({
            familia: grupoArt.familia,
            articulo: item.nombre || item.codigo,
            lote: lote.lote,
            stock: lote.stock,
            vencimiento: vence,
            estado: "proximo",
          });
        }
      }
    }
  }
  vencimientos.sort((a, b) => a.vencimiento.localeCompare(b.vencimiento) || clave(a.articulo).localeCompare(clave(b.articulo)));

  const movs = datos.movimientos.filter((item) => {
    if (!enPeriodo(item.fecha, opts.desde, opts.hasta)) return false;
    if (opts.familia !== "Todas" && item.familia !== opts.familia) return false;
    return true;
  });
  const movKpi = movs.filter((item) => item.familia === familiaKpi);
  const ingresos = movKpi.filter((i) => i.tipo === "ingreso").reduce((s, i) => s + i.cantidad, 0);
  const egresos = movKpi.filter((i) => i.tipo === "egreso").reduce((s, i) => s + i.cantidad, 0);

  const porFamilia = new Map<string, number>();
  const movChart = opts.familia === "Todas" ? movs.filter((item) => item.familia === "ingredientes") : movs;
  for (const item of movChart) {
    const nombre = item.tipo === "ingreso" ? "Ingresos" : "Egresos";
    porFamilia.set(nombre, (porFamilia.get(nombre) ?? 0) + item.cantidad);
  }

  const consumos = datos.consumos.filter((item) => {
    if (!enPeriodo(item.fecha, opts.desde, opts.hasta)) return false;
    if (opts.familia !== "Todas" && item.familia !== opts.familia) return false;
    return coincideSolicitud(item, opts.categoria, opts.producto);
  });
  const consumoKpi = consumos
    .filter((item) => item.familia === familiaKpi)
    .reduce((s, i) => s + i.cantidad, 0);
  const topConsumo = new Map<string, number>();
  for (const item of consumos.filter((i) => i.familia === familiaKpi)) {
    topConsumo.set(item.articulo, (topConsumo.get(item.articulo) ?? 0) + item.cantidad);
  }

  const barridos = datos.barridos.filter((item) => {
    if (!coincideSolicitud(item, opts.categoria, opts.producto)) return false;
    if (item.fechas.some((f) => enPeriodo(f, opts.desde, opts.hasta))) return true;
    if (item.fechas.length === 0) return enPeriodo(item.fechaSolicitud, opts.desde, opts.hasta);
    return false;
  });
  const barridosKg = barridos.reduce((s, i) => s + i.kg, 0);
  const topBarridos = new Map<string, number>();
  for (const item of barridos) {
    topBarridos.set(item.ingrediente, (topBarridos.get(item.ingrediente) ?? 0) + item.kg);
  }

  const vencidosLista = vencimientos.filter((i) => i.estado === "vencido");
  const proximosLista = vencimientos.filter((i) => i.estado === "proximo");

  return {
    stockTotal: activos.reduce((s, i) => s + i.stock, 0),
    unidad: cfg.unidad,
    bajos: activos.filter((i) => i.stock < cfg.stockMinimo).length,
    vencidos: vencidosLista.length,
    proximos: proximosLista.length,
    ingresos,
    egresos,
    consumo: consumoKpi,
    barridosKg,
    porFamiliaMov: partesDe(
      porFamilia,
      [...porFamilia.values()].reduce((s, v) => s + v, 0),
    ),
    topConsumo: partesDe(topConsumo, consumoKpi),
    topBarridos: partesDe(topBarridos, barridosKg),
    detalleVencimientos: vencimientos,
    detalleConsumo: consumos
      .slice()
      .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "") || clave(a.articulo).localeCompare(clave(b.articulo))),
    detalleBarridos: barridos.slice().sort((a, b) => b.kg - a.kg || clave(a.ingrediente).localeCompare(clave(b.ingrediente))),
  };
}
