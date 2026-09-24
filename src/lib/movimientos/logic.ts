import { CATALOGOS, calcularLotes, type LoteVista } from "@/lib/catalogos/logic";
import { calcularStockProductos } from "@/lib/productos/logic";
import {
  aFecha,
  clave,
  idEntero,
  numero,
  texto,
} from "@/lib/solicitudes/logic";

export type KindMovimiento =
  | "ingredientes"
  | "envases"
  | "insumos"
  | "etiquetas"
  | "productos";

export const KINDS: KindMovimiento[] = [
  "ingredientes",
  "envases",
  "insumos",
  "etiquetas",
  "productos",
];

export type ConfigMovimiento = {
  kind: KindMovimiento;
  titulo: string;
  tabla: string;
  tablaCatalogo: string;
  campoId: string;
  campoNombre: string;
  campoCantidad: string;
  unidad: string;
  etiquetaItem: string;
  etiquetaCantidad: string;
  proveedor: boolean;
  categoria: boolean;
  gestion: boolean;
  nombreEnFila: boolean;
  esProducto: boolean;
  idTexto: boolean;
};

export const MOVIMIENTOS: Record<KindMovimiento, ConfigMovimiento> = {
  ingredientes: {
    kind: "ingredientes",
    titulo: "Ingredientes",
    tabla: "movimientos_ingredientes",
    tablaCatalogo: "catalogo_ingredientes",
    campoId: "id_ingrediente",
    campoNombre: "ingrediente",
    campoCantidad: "peso_total",
    unidad: "kg",
    etiquetaItem: "Ingrediente",
    etiquetaCantidad: "Peso total (kg)",
    proveedor: true,
    categoria: false,
    gestion: false,
    nombreEnFila: false,
    esProducto: false,
    idTexto: false,
  },
  envases: {
    kind: "envases",
    titulo: "Envases",
    tabla: "movimientos_envases",
    tablaCatalogo: "catalogo_envases",
    campoId: "id_envase",
    campoNombre: "envase",
    campoCantidad: "cantidad",
    unidad: "Un.",
    etiquetaItem: "Envase",
    etiquetaCantidad: "Cantidad",
    proveedor: false,
    categoria: true,
    gestion: true,
    nombreEnFila: false,
    esProducto: false,
    idTexto: false,
  },
  insumos: {
    kind: "insumos",
    titulo: "Insumos",
    tabla: "movimientos_insumos",
    tablaCatalogo: "catalogo_insumos",
    campoId: "id_insumo",
    campoNombre: "insumo",
    campoCantidad: "cantidad",
    unidad: "Un.",
    etiquetaItem: "Insumo",
    etiquetaCantidad: "Cantidad",
    proveedor: false,
    categoria: true,
    gestion: true,
    nombreEnFila: true,
    esProducto: false,
    idTexto: true,
  },
  etiquetas: {
    kind: "etiquetas",
    titulo: "Etiquetas",
    tabla: "movimientos_etiquetas",
    tablaCatalogo: "catalogo_etiquetas",
    campoId: "id_etiqueta",
    campoNombre: "etiqueta",
    campoCantidad: "cantidad",
    unidad: "Un.",
    etiquetaItem: "Etiqueta",
    etiquetaCantidad: "Cantidad",
    proveedor: false,
    categoria: false,
    gestion: false,
    nombreEnFila: false,
    esProducto: false,
    idTexto: false,
  },
  productos: {
    kind: "productos",
    titulo: "Productos",
    tabla: "movimientos_productos",
    tablaCatalogo: "catalogo_productos",
    campoId: "id_producto",
    campoNombre: "producto",
    campoCantidad: "stk_pall",
    unidad: "Pall.",
    etiquetaItem: "Producto",
    etiquetaCantidad: "Pallets",
    proveedor: false,
    categoria: false,
    gestion: false,
    nombreEnFila: false,
    esProducto: true,
    idTexto: false,
  },
};

export type LoteOpcion = {
  lote: string;
  stock: number;
  vencimiento: string;
  unPorPall: number;
  pesoUn: number;
};

export type ArticuloOpcion = {
  id: number;
  codigo: string;
  nombre: string;
  categoria: string;
  gestion: string;
  medida: string;
  estado: string;
  activo: boolean;
  lotes: LoteOpcion[];
};

export type MovimientoVista = {
  id: number;
  tipo: string;
  tipo_etiqueta: string;
  fecha_registro: string;
  fecha_vencimiento: string;
  codigo: string;
  nombre: string;
  categoria: string;
  lote: string;
  cantidad: number;
  remito: string;
  gestion: string;
  proveedor: string;
  unidad: string;
  observaciones: string;
  stk_un: number;
  stk_kg: number;
  id_catalogo: number | null;
};

export type DatosMovimientoForm = {
  tipo: string;
  id_catalogo: string;
  fecha_registro: string;
  fecha_vencimiento: string;
  lote: string;
  cantidad: string;
  remito: string;
  proveedor: string;
  observaciones: string;
};

export function tipoClave(valor: unknown): string {
  const n = clave(valor);
  if (n === "egreso" || n === "salida") return "egreso";
  if (n === "ingreso" || n === "entrada") return "ingreso";
  return n || "ingreso";
}

export function etiquetaTipo(tipo: string) {
  if (tipo === "egreso") return "Egreso";
  if (tipo === "ingreso") return "Ingreso";
  return tipo || "Movimiento";
}

function signo(tipo: string) {
  if (tipo === "ingreso") return 1;
  if (tipo === "egreso") return -1;
  return 0;
}

export function cantidadesPallets(pallets: number, unPorPall: number, pesoUn: number) {
  const pall = Math.round(Math.max(0, pallets) * 100) / 100;
  const unidades = Math.round(pall * Math.max(0, unPorPall) * 100) / 100;
  const kg = Math.round(unidades * Math.max(0, pesoUn) * 1000) / 1000;
  return { pall, unidades, kg };
}

function factoresDe(
  idProducto: number,
  lote: string,
  solicitudes: Record<string, unknown>[],
  movimientos: Record<string, unknown>[],
  capacidad: number,
) {
  const buscado = clave(lote);
  let mejor: { rango: [string, number]; un: number; peso: number } | null = null;
  for (const fila of solicitudes) {
    if (idEntero(fila.id_producto) !== idProducto) continue;
    if (clave(fila.lote) !== buscado) continue;
    const un = numero(fila.unidades_por_pallets);
    if (un <= 0) continue;
    let peso = numero(fila.peso_unitario);
    if (peso <= 0) peso = capacidad;
    const rango: [string, number] = [aFecha(fila.fecha_registro) ?? "", idEntero(fila.id) ?? 0];
    if (
      !mejor ||
      rango[0] > mejor.rango[0] ||
      (rango[0] === mejor.rango[0] && rango[1] >= mejor.rango[1])
    ) {
      mejor = { rango, un, peso };
    }
  }
  if (mejor) return { un: mejor.un, peso: mejor.peso };
  for (const mov of movimientos) {
    if (idEntero(mov.id_producto) !== idProducto) continue;
    if (clave(mov.lote) !== buscado) continue;
    const pall = numero(mov.stk_pall);
    if (pall <= 0.0005) continue;
    const un = numero(mov.stk_un) / pall;
    const kg = numero(mov.stk_kg);
    const peso = numero(mov.stk_un) > 0 ? kg / numero(mov.stk_un) : capacidad;
    if (un > 0) return { un, peso };
  }
  return null;
}

function articulosDe(
  filas: Record<string, unknown>[],
  cfg: ConfigMovimiento,
): ArticuloOpcion[] {
  const items: ArticuloOpcion[] = [];
  for (const fila of filas) {
    const id = idEntero(fila.id);
    const nombre = texto(fila[cfg.campoNombre]);
    const codigo = texto(fila.codigo);
    if (id == null || (!nombre && !codigo)) continue;
    const estado = texto(fila.estado);
    const n = clave(estado);
    items.push({
      id,
      codigo,
      nombre,
      categoria: texto(fila.categoria),
      gestion: texto(fila.gestion),
      medida: texto(fila.medida) || cfg.unidad,
      estado,
      activo: n === "" || n === "activo",
      lotes: [],
    });
  }
  items.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  return items;
}

export function armarKind(input: {
  kind: KindMovimiento;
  movimientos: Record<string, unknown>[];
  catalogo: Record<string, unknown>[];
  articulosUni: Record<string, unknown>[];
  consumos: Record<string, unknown>[];
  producciones: Record<string, unknown>[];
  solicitudes: Record<string, unknown>[];
  envases: Record<string, unknown>[];
}): { movimientos: MovimientoVista[]; articulos: ArticuloOpcion[] } {
  const cfg = MOVIMIENTOS[input.kind];
  const articulos = articulosDe(input.catalogo, cfg);
  const porId = new Map(articulos.map((a) => [a.id, a]));
  const porCodigo = new Map(articulos.filter((a) => a.codigo).map((a) => [clave(a.codigo), a]));
  const porNombre = new Map(articulos.filter((a) => a.nombre).map((a) => [clave(a.nombre), a]));

  let lotes = new Map<number, LoteVista[]>();
  if (cfg.esProducto) {
    const stocks = calcularStockProductos(input.movimientos, input.producciones, input.solicitudes);
    const capEnv = new Map<number, number>();
    for (const fila of input.envases) {
      const id = idEntero(fila.id);
      if (id != null) capEnv.set(id, numero(fila.capacidad_carga_kg));
    }
    const capProd = new Map<number, number>();
    for (const fila of input.catalogo) {
      const id = idEntero(fila.id);
      if (id == null) continue;
      capProd.set(id, capEnv.get(idEntero(fila.id_envase) ?? -1) ?? 0);
    }
    for (const art of articulos) {
      const cap = capProd.get(art.id) ?? 0;
      const stock = stocks.get(art.id);
      const vistos = new Set<string>();
      for (const lote of stock?.lotes ?? []) {
        vistos.add(clave(lote.lote));
        const f = factoresDe(art.id, lote.lote, input.solicitudes, input.movimientos, cap);
        art.lotes.push({
          lote: lote.lote,
          stock: lote.stk_pall,
          vencimiento: "",
          unPorPall: f?.un ?? 0,
          pesoUn: f?.peso ?? 0,
        });
      }
      for (const sol of input.solicitudes) {
        if (idEntero(sol.id_producto) !== art.id) continue;
        const lote = texto(sol.lote);
        if (!lote || vistos.has(clave(lote))) continue;
        const f = factoresDe(art.id, lote, input.solicitudes, input.movimientos, cap);
        if (!f) continue;
        vistos.add(clave(lote));
        art.lotes.push({
          lote,
          stock: 0,
          vencimiento: "",
          unPorPall: f.un,
          pesoUn: f.peso,
        });
      }
      art.lotes.sort((a, b) => clave(a.lote).localeCompare(clave(b.lote), "es"));
    }
  } else {
    lotes = calcularLotes(
      CATALOGOS[input.kind as Exclude<KindMovimiento, "productos">],
      input.catalogo,
      input.movimientos,
      input.articulosUni,
      input.consumos,
    );
    for (const art of articulos) {
      art.lotes = (lotes.get(art.id) ?? []).map((l) => ({
        lote: l.lote,
        stock: l.stock,
        vencimiento: l.vencimiento,
        unPorPall: 0,
        pesoUn: 0,
      }));
    }
  }

  const movimientos: MovimientoVista[] = [];
  for (const fila of input.movimientos) {
    const id = idEntero(fila.id);
    const ref = fila[cfg.campoId];
    const ident = idEntero(ref);
    const codigoRef = texto(ref) || texto(fila.codigo);
    const nombreRef = texto(fila[cfg.campoNombre]);
    if (id == null && ident == null && !codigoRef && !nombreRef) continue;
    if (id == null) continue;
    const articulo =
      (ident != null ? porId.get(ident) : undefined) ||
      (codigoRef ? porCodigo.get(clave(codigoRef)) : undefined) ||
      (nombreRef ? porNombre.get(clave(nombreRef)) : undefined);
    const tipo = tipoClave(fila.tipo);
    const cantidad = cfg.esProducto ? numero(fila.stk_pall) : numero(fila[cfg.campoCantidad]);
    movimientos.push({
      id,
      tipo: tipo === "egreso" ? "egreso" : "ingreso",
      tipo_etiqueta: etiquetaTipo(tipo === "egreso" ? "egreso" : "ingreso"),
      fecha_registro: texto(fila.fecha_registro),
      fecha_vencimiento: texto(fila.fecha_vencimiento),
      codigo: articulo?.codigo || texto(fila.codigo),
      nombre: articulo?.nombre || nombreRef,
      categoria: articulo?.categoria || texto(fila.categoria),
      lote: texto(fila.lote),
      cantidad,
      remito: texto(fila.remito),
      gestion: articulo?.gestion || texto(fila.gestion),
      proveedor: texto(fila.proveedor),
      unidad: cfg.esProducto ? cfg.unidad : articulo?.medida || cfg.unidad,
      observaciones: texto(fila.observaciones),
      stk_un: cfg.esProducto ? numero(fila.stk_un) : 0,
      stk_kg: cfg.esProducto ? numero(fila.stk_kg) : 0,
      id_catalogo: articulo?.id ?? ident,
    });
  }
  movimientos.sort((a, b) => {
    const fa = aFecha(a.fecha_registro) ?? "";
    const fb = aFecha(b.fecha_registro) ?? "";
    if (fa !== fb) return fb.localeCompare(fa);
    return b.id - a.id;
  });
  return { movimientos, articulos };
}

export function filtrarMovimientos(
  items: MovimientoVista[],
  filtros: {
    tipo: string;
    articulo: string;
    gestion: string;
    busqueda: string;
    desde: string;
    hasta: string;
  },
) {
  const tipoN = clave(filtros.tipo);
  const tipo =
    !tipoN || tipoN === "todos"
      ? null
      : tipoN.includes("egreso") || tipoN.includes("salida")
        ? "egreso"
        : tipoN.includes("ingreso") || tipoN.includes("entrada")
          ? "ingreso"
          : null;
  const termino = clave(filtros.busqueda);
  const desde = aFecha(filtros.desde);
  const hasta = aFecha(filtros.hasta);
  return items.filter((item) => {
    if (tipo && item.tipo !== tipo) return false;
    if (filtros.articulo && filtros.articulo !== "Todos" && item.nombre !== filtros.articulo) {
      return false;
    }
    if (filtros.gestion && filtros.gestion !== "Todos" && item.gestion !== filtros.gestion) {
      return false;
    }
    const fecha = aFecha(item.fecha_registro);
    if (desde && (!fecha || fecha < desde)) return false;
    if (hasta && (!fecha || fecha > hasta)) return false;
    if (!termino) return true;
    return [item.codigo, item.nombre, item.lote, item.remito, item.categoria, item.gestion, item.proveedor, item.observaciones]
      .some((c) => clave(c).includes(termino));
  });
}

export function resumenMovimientos(items: MovimientoVista[]) {
  return items.reduce(
    (acc, item) => {
      acc.total += 1;
      if (item.tipo === "ingreso") {
        acc.ingresos += 1;
        acc.cantidad_ingresos += item.cantidad;
      } else if (item.tipo === "egreso") {
        acc.egresos += 1;
        acc.cantidad_egresos += item.cantidad;
      }
      return acc;
    },
    { total: 0, ingresos: 0, egresos: 0, cantidad_ingresos: 0, cantidad_egresos: 0 },
  );
}

export function unicos(items: MovimientoVista[], campo: "nombre" | "gestion") {
  const set = new Set(items.map((i) => i[campo]).filter(Boolean));
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}

export function stockLote(
  articulo: ArticuloOpcion | undefined,
  lote: string,
  editando?: MovimientoVista,
) {
  const base = articulo?.lotes.find((l) => clave(l.lote) === clave(lote))?.stock ?? 0;
  if (!editando || clave(editando.lote) !== clave(lote)) return base;
  if (editando.id_catalogo !== articulo?.id) return base;
  return Math.round((base - signo(editando.tipo) * editando.cantidad) * 1000) / 1000;
}

export function validarMovimiento(
  cfg: ConfigMovimiento,
  datos: DatosMovimientoForm,
  articulos: ArticuloOpcion[],
  editando?: MovimientoVista,
): string[] {
  const errores: string[] = [];
  const tipo = tipoClave(datos.tipo);
  if (tipo !== "ingreso" && tipo !== "egreso") {
    errores.push("Seleccioná si es un ingreso o un egreso.");
  }
  const idCat = idEntero(datos.id_catalogo);
  if (idCat == null) {
    errores.push(`Seleccioná un ${cfg.etiquetaItem.toLowerCase()} del catálogo.`);
  }
  if (!aFecha(datos.fecha_registro)) errores.push("La fecha de registro no es válida.");
  if (texto(datos.fecha_vencimiento) && !aFecha(datos.fecha_vencimiento)) {
    errores.push("La fecha de vencimiento no es válida.");
  }
  const cantidad = numero(datos.cantidad);
  if (cantidad <= 0) {
    errores.push(
      cfg.esProducto ? "La cantidad de pallets debe ser mayor a 0." : "La cantidad debe ser mayor a 0.",
    );
  }
  const art = articulos.find((a) => a.id === idCat);
  const lote = texto(datos.lote);
  if (cfg.esProducto && lote && cantidad > 0) {
    const op = art?.lotes.find((l) => clave(l.lote) === clave(lote));
    if (!op || op.unPorPall <= 0) {
      errores.push(
        "Este lote no tiene unidades por pallet. Tiene que coincidir con una solicitud de producción.",
      );
    }
  }
  if (tipo === "egreso") {
    if (!lote) errores.push("Seleccioná un lote con stock disponible.");
    else if (cantidad > 0) {
      const disponible = stockLote(art, lote, editando);
      if (disponible <= 0.0005) errores.push("El lote no tiene stock disponible.");
      else if (cantidad > disponible + 0.01) {
        errores.push(
          `La cantidad supera el stock disponible (${disponible.toLocaleString("es-AR")} ${cfg.unidad}).`,
        );
      }
    }
  }
  return errores;
}

export function filaMovimiento(
  cfg: ConfigMovimiento,
  datos: DatosMovimientoForm,
  articulos: ArticuloOpcion[],
  id: number,
) {
  const tipo = tipoClave(datos.tipo);
  const idCat = idEntero(datos.id_catalogo);
  const art = articulos.find((a) => a.id === idCat);
  const base: Record<string, unknown> = {
    id,
    tipo,
    fecha_registro: aFecha(datos.fecha_registro),
    fecha_vencimiento: aFecha(datos.fecha_vencimiento),
    [cfg.campoId]: cfg.idTexto ? (idCat != null ? String(idCat) : null) : idCat,
    lote: texto(datos.lote) || null,
    observaciones: texto(datos.observaciones) || null,
  };
  if (cfg.esProducto) {
    const lote = art?.lotes.find((l) => clave(l.lote) === clave(datos.lote));
    const calc =
      lote && lote.unPorPall > 0
        ? cantidadesPallets(numero(datos.cantidad), lote.unPorPall, lote.pesoUn)
        : { pall: Math.round(numero(datos.cantidad) * 100) / 100, unidades: 0, kg: 0 };
    base.stk_pall = calc.pall;
    base.stk_un = calc.unidades;
    base.stk_kg = calc.kg;
    return base;
  }
  base[cfg.campoCantidad] = numero(datos.cantidad);
  base.remito = texto(datos.remito) || null;
  if (cfg.categoria) base.categoria = art?.categoria || null;
  if (cfg.gestion) base.gestion = art?.gestion || null;
  if (tipo === "ingreso" || cfg.proveedor) {
    base.proveedor = texto(datos.proveedor) || null;
  }
  if (cfg.nombreEnFila) base[cfg.campoNombre] = art?.nombre || null;
  return base;
}

export function hoyIso() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dia}`;
}

export function etiquetaOpcion(codigo: string, nombre: string) {
  return codigo ? `${codigo}  —  ${nombre}` : nombre || "Sin nombre";
}

const MESES_CORTO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export type ParteGrafico = { nombre: string; cantidad: number; porcentaje: number; registros: number };

export type ResumenGrafico = {
  titulo: string;
  unidad: string;
  periodo: string;
  totalRegistros: number;
  totalIngresos: number;
  totalEgresos: number;
  totalNeto: number;
  porTipo: ParteGrafico[];
  porCategoria: ParteGrafico[];
  porMes: ParteGrafico[];
  detalle: { nombre: string; ingresos: number; egresos: number; neto: number; registros: number }[];
};

export function resumenGrafico(cfg: ConfigMovimiento, movimientos: MovimientoVista[]): ResumenGrafico {
  const kgTipo = { ingreso: 0, egreso: 0 };
  const nTipo = { ingreso: 0, egreso: 0 };
  const kgCategoria = new Map<string, number>();
  const kgMes = new Map<string, number>();
  const etiqueta = new Map<string, string>();
  const porNombre = new Map<string, { ingresos: number; egresos: number; registros: number }>();
  let totalAbs = 0;
  for (const item of movimientos) {
    const cantidad = Math.max(0, item.cantidad);
    if (item.tipo !== "ingreso" && item.tipo !== "egreso") continue;
    kgTipo[item.tipo] += cantidad;
    nTipo[item.tipo] += 1;
    totalAbs += cantidad;
    const categoria = item.categoria || "Sin categoría";
    kgCategoria.set(categoria, (kgCategoria.get(categoria) ?? 0) + cantidad);
    const fecha = item.fecha_registro?.slice(0, 10);
    if (fecha && /^\d{4}-\d{2}/.test(fecha)) {
      const claveMes = fecha.slice(0, 7);
      const mes = Number(fecha.slice(5, 7));
      etiqueta.set(claveMes, `${MESES_CORTO[mes - 1] ?? ""}-${fecha.slice(2, 4)}`);
      kgMes.set(claveMes, (kgMes.get(claveMes) ?? 0) + cantidad);
    }
    const nombre = item.nombre || item.codigo || `id ${item.id}`;
    const bucket = porNombre.get(nombre) ?? { ingresos: 0, egresos: 0, registros: 0 };
    if (item.tipo === "ingreso") bucket.ingresos += cantidad;
    else bucket.egresos += cantidad;
    bucket.registros += 1;
    porNombre.set(nombre, bucket);
  }
  const pct = (valor: number) => (totalAbs > 0 ? (valor / totalAbs) * 100 : 0);
  const meses = [...kgMes.keys()].sort();
  const articulos = [...porNombre.entries()].sort((a, b) => b[1].ingresos + b[1].egresos - (a[1].ingresos + a[1].egresos));
  const detalle = articulos.map(([nombre, datos]) => ({
    nombre,
    ingresos: datos.ingresos,
    egresos: datos.egresos,
    neto: datos.ingresos - datos.egresos,
    registros: datos.registros,
  }));
  detalle.push({
    nombre: "TOTAL",
    ingresos: kgTipo.ingreso,
    egresos: kgTipo.egreso,
    neto: kgTipo.ingreso - kgTipo.egreso,
    registros: movimientos.length,
  });
  return {
    titulo: `Movimientos de ${cfg.titulo.toLowerCase()}`,
    unidad: cfg.unidad,
    periodo: meses.length ? `${etiqueta.get(meses[0])} a ${etiqueta.get(meses[meses.length - 1])}` : "sin período",
    totalRegistros: movimientos.length,
    totalIngresos: kgTipo.ingreso,
    totalEgresos: kgTipo.egreso,
    totalNeto: kgTipo.ingreso - kgTipo.egreso,
    porTipo: [
      { nombre: "Ingreso", cantidad: kgTipo.ingreso, porcentaje: pct(kgTipo.ingreso), registros: nTipo.ingreso },
      { nombre: "Egreso", cantidad: kgTipo.egreso, porcentaje: pct(kgTipo.egreso), registros: nTipo.egreso },
    ],
    porCategoria: [...kgCategoria.keys()]
      .sort((a, b) => a.localeCompare(b, "es"))
      .map((nombre) => ({
        nombre,
        cantidad: kgCategoria.get(nombre) ?? 0,
        porcentaje: pct(kgCategoria.get(nombre) ?? 0),
        registros: 0,
      })),
    porMes: meses.map((claveMes) => ({
      nombre: etiqueta.get(claveMes) ?? claveMes,
      cantidad: kgMes.get(claveMes) ?? 0,
      porcentaje: pct(kgMes.get(claveMes) ?? 0),
      registros: 0,
    })),
    detalle,
  };
}
