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
import { idCierreProduccion } from "@/lib/productos/logic";
import { sumarDias, type ParteIndicador } from "@/lib/analytics/logic";

export const DIAS_VENCIMIENTO = 30;
export const FAMILIAS_STOCK: { id: KindCatalogo | "productos" | "Todas"; label: string }[] = [
  { id: "Todas", label: "Todas" },
  { id: "ingredientes", label: "Ingredientes" },
  { id: "insumos", label: "Insumos" },
  { id: "envases", label: "Envases" },
  { id: "etiquetas", label: "Etiquetas" },
  { id: "productos", label: "Productos" },
];

export type FamiliaStock = KindCatalogo | "productos" | "Todas";
export type FamiliaCorte = KindCatalogo | "productos";

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

export type DeltaProducto = {
  articulo: string;
  fecha: string | null;
  ingresos: number;
  egresos: number;
};

export type FilaCorteStock = {
  familia: FamiliaCorte;
  articulo: string;
  unidad: string;
  inicial: number;
  ingresos: number;
  egresos: number;
  consumos: number;
  final: number;
};

export type DatosStockAnalytics = {
  articulos: { familia: KindCatalogo; items: ArticuloVista[] }[];
  movimientos: MovimientoStock[];
  consumos: ConsumoStock[];
  barridos: BarridoStock[];
  nombresProducto: string[];
  deltasProducto: DeltaProducto[];
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
  movProd: Record<string, unknown>[];
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

  const nombresProducto: string[] = [];
  const nombreProdPorId = new Map<number, string>();
  for (const fila of crudo.productos) {
    const ident = idEntero(fila.id);
    const nombre = texto(fila.producto);
    if (!nombre) continue;
    nombresProducto.push(nombre);
    if (ident != null) nombreProdPorId.set(ident, nombre);
  }
  nombresProducto.sort((a, b) => a.localeCompare(b, "es"));

  const cierres = new Set<number>();
  for (const fila of crudo.movProd) {
    const cierre = idCierreProduccion(fila.observaciones);
    if (cierre != null) cierres.add(cierre);
  }

  const deltasProducto: DeltaProducto[] = [];
  for (const fila of crudo.movProd) {
    const ident = idEntero(fila.id_producto);
    const articulo = ident != null ? nombreProdPorId.get(ident) : "";
    if (!articulo) continue;
    const signo = signoTipo(fila.tipo);
    const kg = numero(fila.stk_kg);
    if (signo === 0 || Math.abs(kg) <= 0.0005) continue;
    deltasProducto.push({
      articulo,
      fecha: aFecha(fila.fecha_registro),
      ingresos: signo > 0 ? kg : 0,
      egresos: signo < 0 ? kg : 0,
    });
  }
  for (const fila of crudo.producciones) {
    const idProd = idEntero(fila.id);
    if (idProd != null && cierres.has(idProd)) continue;
    const kg = numero(fila.peso_kg);
    if (Math.abs(kg) <= 0.0005) continue;
    const solicitud = solicitudes.get(idEntero(fila.id_solicitud) ?? -1);
    const ident = idEntero(solicitud?.id_producto);
    const articulo = ident != null ? nombreProdPorId.get(ident) : "";
    if (!articulo) continue;
    deltasProducto.push({
      articulo,
      fecha: aFecha(fila.fecha_registro),
      ingresos: kg,
      egresos: 0,
    });
  }

  return { articulos, movimientos: movs, consumos, barridos, nombresProducto, deltasProducto };
}

function signoTipo(tipo: unknown): number {
  const n = clave(tipo);
  if (n === "ingreso" || n === "entrada") return 1;
  if (n === "egreso" || n === "salida") return -1;
  return 0;
}

const ORDEN_CORTE: FamiliaCorte[] = ["ingredientes", "insumos", "envases", "etiquetas", "productos"];

function unidadCorte(familia: FamiliaCorte) {
  return familia === "productos" ? "kg" : CATALOGOS[familia].unidad;
}

function redondo(valor: number) {
  return Math.round(valor * 1000) / 1000;
}

function tieneMovimiento(fila: FilaCorteStock) {
  return (
    Math.abs(fila.inicial) > 0.0005 ||
    Math.abs(fila.ingresos) > 0.0005 ||
    Math.abs(fila.egresos) > 0.0005 ||
    Math.abs(fila.consumos) > 0.0005 ||
    Math.abs(fila.final) > 0.0005
  );
}

export function corteStockPeriodo(
  datos: DatosStockAnalytics,
  opts: { desde: string; hasta: string; familia: FamiliaStock; articulo?: string },
): FilaCorteStock[] {
  const articulo = opts.articulo || "Todos";
  const acum = new Map<string, { familia: FamiliaCorte; articulo: string; inicial: number; ingresos: number; egresos: number; consumos: number }>();

  function bucket(familia: FamiliaCorte, nombre: string) {
    const claveFila = `${familia}\0${nombre}`;
    let item = acum.get(claveFila);
    if (!item) {
      item = { familia, articulo: nombre, inicial: 0, ingresos: 0, egresos: 0, consumos: 0 };
      acum.set(claveFila, item);
    }
    return item;
  }

  function entra(familia: FamiliaCorte, nombre: string) {
    if (opts.familia !== "Todas" && opts.familia !== familia) return false;
    return coincideArticulo(nombre, articulo);
  }

  function aplicar(
    fecha: string | null,
    familia: FamiliaCorte,
    nombre: string,
    ingresos: number,
    egresos: number,
    consumos: number,
  ) {
    if (!fecha || !entra(familia, nombre)) return;
    const item = bucket(familia, nombre);
    const delta = ingresos - egresos - consumos;
    if (fecha < opts.desde) item.inicial += delta;
    else if (fecha <= opts.hasta) {
      item.ingresos += ingresos;
      item.egresos += egresos;
      item.consumos += consumos;
    }
  }

  for (const mov of datos.movimientos) {
    aplicar(
      mov.fecha,
      mov.familia,
      mov.articulo,
      mov.tipo === "ingreso" ? mov.cantidad : 0,
      mov.tipo === "egreso" ? mov.cantidad : 0,
      0,
    );
  }
  for (const cons of datos.consumos) {
    aplicar(cons.fecha, cons.familia, cons.articulo, 0, 0, cons.cantidad);
  }
  for (const delta of datos.deltasProducto) {
    aplicar(delta.fecha, "productos", delta.articulo, delta.ingresos, delta.egresos, 0);
  }

  const filas: FilaCorteStock[] = [];
  for (const item of acum.values()) {
    const inicial = redondo(item.inicial);
    const ingresos = redondo(item.ingresos);
    const egresos = redondo(item.egresos);
    const consumos = redondo(item.consumos);
    const fila: FilaCorteStock = {
      familia: item.familia,
      articulo: item.articulo,
      unidad: unidadCorte(item.familia),
      inicial,
      ingresos,
      egresos,
      consumos,
      final: redondo(inicial + ingresos - egresos - consumos),
    };
    if (tieneMovimiento(fila)) filas.push(fila);
  }

  if (articulo !== "Todos" && opts.familia !== "Todas" && !filas.some((fila) => fila.articulo === articulo)) {
    filas.push({
      familia: opts.familia,
      articulo,
      unidad: unidadCorte(opts.familia),
      inicial: 0,
      ingresos: 0,
      egresos: 0,
      consumos: 0,
      final: 0,
    });
  }

  const orden = new Map(ORDEN_CORTE.map((familia, indice) => [familia, indice]));
  filas.sort(
    (a, b) =>
      (orden.get(a.familia) ?? 0) - (orden.get(b.familia) ?? 0) ||
      a.articulo.localeCompare(b.articulo, "es"),
  );
  return filas;
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

function coincideArticulo(nombre: string, articulo: string) {
  return articulo === "Todos" || nombre === articulo;
}

export function resumenStock(
  datos: DatosStockAnalytics,
  opts: {
    desde: string;
    hasta: string;
    familia: Exclude<FamiliaStock, "productos">;
    categoria: string;
    producto: string;
    articulo?: string;
    hoy?: string;
  },
): ResumenStock {
  const hoy = opts.hoy ?? hoyIso();
  const articulo = opts.articulo || "Todos";
  const limite = sumarDias(hoy, DIAS_VENCIMIENTO);
  const familiaKpi: KindCatalogo = opts.familia === "Todas" ? "ingredientes" : opts.familia;
  const cfg = CATALOGOS[familiaKpi];
  const grupo = datos.articulos.find((g) => g.familia === familiaKpi);
  const activos = (grupo?.items ?? []).filter(
    (item) => item.estado === ESTADO_ACTIVO && coincideArticulo(item.nombre || item.codigo, articulo),
  );

  const vencimientos: LoteAlerta[] = [];
  const origenLotes =
    opts.familia === "Todas" ? datos.articulos : datos.articulos.filter((g) => g.familia === opts.familia);
  for (const grupoArt of origenLotes) {
    for (const item of grupoArt.items) {
      if (item.estado !== ESTADO_ACTIVO) continue;
      if (!coincideArticulo(item.nombre || item.codigo, articulo)) continue;
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
    return coincideArticulo(item.articulo, articulo);
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
    if (!coincideArticulo(item.articulo, articulo)) return false;
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
    if (opts.familia === "ingredientes" && !coincideArticulo(item.ingrediente, articulo)) return false;
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
