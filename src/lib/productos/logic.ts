import {
  aFecha,
  clave,
  idEntero,
  nroVisible,
  numero,
  texto,
} from "@/lib/solicitudes/logic";

const PREFIJO_CIERRE = "Cierre de producción #";

export type OpcionCatalogo = {
  id: number;
  codigo: string;
  nombre: string;
  extra: string;
  extra_numero: number;
  estado: string;
  activo: boolean;
};

export type VersionResumen = {
  id: number;
  numero: number;
  estado: string;
  fecha_registro: string;
  etiqueta: string;
};

export type LoteProducto = {
  lote: string;
  stk_pall: number;
  stk_un: number;
  stk_kg: number;
};

export type ProductoVista = {
  id: number;
  fecha_registro: string;
  codigo: string;
  nombre: string;
  receta_plc: string;
  medida: string;
  categoria: string;
  id_envase: number | null;
  codigo_envase: string;
  envase: string;
  capacidad_kg: number;
  id_etiqueta: number | null;
  codigo_etiqueta: string;
  nombre_etiqueta: string;
  stk_pall: number;
  stk_un: number;
  stk_kg: number;
  ingresos: number;
  egresos: number;
  produccion: number;
  lotes: LoteProducto[];
  versiones: VersionResumen[];
};

export type DatosProductoForm = {
  fecha_registro: string;
  codigo: string;
  nombre: string;
  categoria: string;
  medida: string;
  receta_plc: string;
  id_envase: string;
  id_etiqueta: string;
};

type Saldo = {
  ingresos: number;
  egresos: number;
  produccion: number;
  stk_pall: number;
  stk_un: number;
  stk_kg: number;
  lotes: Map<string, { lote: string; stk_pall: number; stk_un: number; stk_kg: number }>;
};

function signo(tipo: unknown): number {
  const n = clave(tipo);
  if (n === "ingreso" || n === "entrada") return 1;
  if (n === "egreso" || n === "salida") return -1;
  return 0;
}

function saldoVacio(): Saldo {
  return {
    ingresos: 0,
    egresos: 0,
    produccion: 0,
    stk_pall: 0,
    stk_un: 0,
    stk_kg: 0,
    lotes: new Map(),
  };
}

function idCierre(observaciones: unknown): number | null {
  const t = texto(observaciones);
  if (!t.startsWith(PREFIJO_CIERRE)) return null;
  return idEntero(t.slice(PREFIJO_CIERRE.length));
}

function bucketLote(saldo: Saldo, lote: string) {
  let item = saldo.lotes.get(lote);
  if (!item) {
    item = { lote, stk_pall: 0, stk_un: 0, stk_kg: 0 };
    saldo.lotes.set(lote, item);
  }
  return item;
}

export function calcularStockProductos(
  movimientos: Record<string, unknown>[],
  producciones: Record<string, unknown>[],
  solicitudes: Record<string, unknown>[],
): Map<number, Omit<Saldo, "lotes"> & { lotes: LoteProducto[] }> {
  const saldos = new Map<number, Saldo>();
  const cierres = new Set<number>();

  function saldoDe(id: number) {
    let s = saldos.get(id);
    if (!s) {
      s = saldoVacio();
      saldos.set(id, s);
    }
    return s;
  }

  for (const mov of movimientos) {
    const ident = idEntero(mov.id_producto);
    const sig = signo(mov.tipo);
    if (ident == null || sig === 0) continue;
    const pall = numero(mov.stk_pall);
    const un = numero(mov.stk_un);
    const kg = numero(mov.stk_kg);
    const destino = saldoDe(ident);
    if (sig > 0) destino.ingresos += pall;
    else destino.egresos += pall;
    destino.stk_pall += sig * pall;
    destino.stk_un += sig * un;
    destino.stk_kg += sig * kg;
    const lote = texto(mov.lote);
    if (lote) {
      const item = bucketLote(destino, lote);
      item.stk_pall += sig * pall;
      item.stk_un += sig * un;
      item.stk_kg += sig * kg;
    }
    const cierre = idCierre(mov.observaciones);
    if (cierre != null) cierres.add(cierre);
  }

  const solMap = new Map<number, Record<string, unknown>>();
  for (const fila of solicitudes) {
    const id = idEntero(fila.id);
    if (id != null) solMap.set(id, fila);
  }

  for (const fila of producciones) {
    const idProd = idEntero(fila.id);
    if (idProd != null && cierres.has(idProd)) continue;
    const pall = numero(fila.pallets);
    const un = numero(fila.unidades);
    const kg = numero(fila.peso_kg);
    if (pall <= 0.0005 && un <= 0.0005 && kg <= 0.0005) continue;
    const solicitud = solMap.get(idEntero(fila.id_solicitud) ?? -1);
    if (!solicitud) continue;
    const ident = idEntero(solicitud.id_producto);
    const lote = texto(solicitud.lote);
    if (ident == null || !lote) continue;
    const destino = saldoDe(ident);
    destino.ingresos += pall;
    destino.produccion += pall;
    destino.stk_pall += pall;
    destino.stk_un += un;
    destino.stk_kg += kg;
    const item = bucketLote(destino, lote);
    item.stk_pall += pall;
    item.stk_un += un;
    item.stk_kg += kg;
  }

  for (const fila of producciones) {
    const idProd = idEntero(fila.id);
    if (idProd == null || !cierres.has(idProd)) continue;
    const solicitud = solMap.get(idEntero(fila.id_solicitud) ?? -1);
    if (!solicitud) continue;
    const ident = idEntero(solicitud.id_producto);
    if (ident == null) continue;
    saldoDe(ident).produccion += numero(fila.pallets);
  }

  const out = new Map<number, Omit<Saldo, "lotes"> & { lotes: LoteProducto[] }>();
  for (const [id, saldo] of saldos) {
    const lotes: LoteProducto[] = [];
    for (const item of saldo.lotes.values()) {
      const pall = Math.round(item.stk_pall * 100) / 100;
      if (pall <= 0.0005) continue;
      lotes.push({
        lote: item.lote,
        stk_pall: pall,
        stk_un: Math.round(item.stk_un * 100) / 100,
        stk_kg: Math.round(item.stk_kg * 1000) / 1000,
      });
    }
    lotes.sort((a, b) => clave(a.lote).localeCompare(clave(b.lote), "es"));
    out.set(id, {
      ingresos: Math.round(saldo.ingresos * 100) / 100,
      egresos: Math.round(saldo.egresos * 100) / 100,
      produccion: Math.round(saldo.produccion * 100) / 100,
      stk_pall: Math.round(saldo.stk_pall * 100) / 100,
      stk_un: Math.round(saldo.stk_un * 100) / 100,
      stk_kg: Math.round(saldo.stk_kg * 1000) / 1000,
      lotes,
    });
  }
  return out;
}

function activoEstado(estado: string) {
  const n = clave(estado);
  return n === "" || n === "activo";
}

function opciones(
  filas: Record<string, unknown>[],
  campo: string,
  extra?: string,
): OpcionCatalogo[] {
  const items: OpcionCatalogo[] = [];
  for (const fila of filas) {
    const id = idEntero(fila.id);
    const nombre = texto(fila[campo]);
    if (id == null || !nombre) continue;
    const extraN = extra ? numero(fila[extra]) : 0;
    items.push({
      id,
      codigo: texto(fila.codigo),
      nombre,
      extra: extra && extraN > 0 ? `${nroVisible(extraN, 1)} kg` : "",
      extra_numero: extraN,
      estado: texto(fila.estado),
      activo: activoEstado(texto(fila.estado)),
    });
  }
  items.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  return items;
}

export function armarProductos(input: {
  productos: Record<string, unknown>[];
  envases: Record<string, unknown>[];
  etiquetas: Record<string, unknown>[];
  versiones: Record<string, unknown>[];
  movimientos: Record<string, unknown>[];
  producciones: Record<string, unknown>[];
  solicitudes: Record<string, unknown>[];
}): { productos: ProductoVista[]; envases: OpcionCatalogo[]; etiquetas: OpcionCatalogo[] } {
  const envases = opciones(input.envases, "envase", "capacidad_carga_kg");
  const etiquetas = opciones(input.etiquetas, "etiqueta");
  const mapEnv = new Map(envases.map((e) => [e.id, e]));
  const mapEti = new Map(etiquetas.map((e) => [e.id, e]));
  const stocks = calcularStockProductos(
    input.movimientos,
    input.producciones,
    input.solicitudes,
  );

  const porProducto = new Map<number, VersionResumen[]>();
  for (const fila of input.versiones) {
    const idProd = idEntero(fila.id_producto);
    const id = idEntero(fila.id);
    if (idProd == null || id == null) continue;
    const nro = idEntero(fila.version) ?? 0;
    const estado = texto(fila.estado);
    const item: VersionResumen = {
      id,
      numero: nro,
      estado,
      fecha_registro: texto(fila.fecha_registro),
      etiqueta: estado ? `Versión ${nro || "—"}  ·  ${estado}` : `Versión ${nro || "—"}`,
    };
    const lista = porProducto.get(idProd) ?? [];
    lista.push(item);
    porProducto.set(idProd, lista);
  }
  for (const lista of porProducto.values()) {
    lista.sort((a, b) => a.numero - b.numero || a.id - b.id);
  }

  const productos: ProductoVista[] = [];
  for (const fila of input.productos) {
    const id = idEntero(fila.id);
    const codigo = texto(fila.codigo);
    const nombre = texto(fila.producto);
    if (id == null && !codigo && !nombre) continue;
    if (id == null) continue;
    const idEnv = idEntero(fila.id_envase);
    const idEti = idEntero(fila.id_etiqueta);
    const env = idEnv != null ? mapEnv.get(idEnv) : undefined;
    const eti = idEti != null ? mapEti.get(idEti) : undefined;
    const stock = stocks.get(id);
    const recetaN = idEntero(fila.receta_PLC);
    productos.push({
      id,
      fecha_registro: texto(fila.fecha_registro),
      codigo,
      nombre,
      receta_plc: recetaN != null ? String(recetaN) : texto(fila.receta_PLC),
      medida: texto(fila.medida) || "kg",
      categoria: texto(fila.categoria),
      id_envase: idEnv,
      codigo_envase: env?.codigo ?? "",
      envase: env?.nombre ?? "",
      capacidad_kg: env?.extra_numero ?? 0,
      id_etiqueta: idEti,
      codigo_etiqueta: eti?.codigo ?? "",
      nombre_etiqueta: eti?.nombre ?? "",
      stk_pall: stock?.stk_pall ?? 0,
      stk_un: stock?.stk_un ?? 0,
      stk_kg: stock?.stk_kg ?? 0,
      ingresos: stock?.ingresos ?? 0,
      egresos: stock?.egresos ?? 0,
      produccion: stock?.produccion ?? 0,
      lotes: stock?.lotes ?? [],
      versiones: porProducto.get(id) ?? [],
    });
  }
  productos.sort((a, b) => a.nombre.localeCompare(b.nombre, "es") || a.codigo.localeCompare(b.codigo, "es"));
  return { productos, envases, etiquetas };
}

function filtroBinario(valor: string): "con" | "sin" | null {
  const n = clave(valor);
  if (!n || n === "todos") return null;
  if (n.includes("sin")) return "sin";
  if (n.includes("con")) return "con";
  return null;
}

export function filtrarProductos(
  productos: ProductoVista[],
  filtros: {
    categoria: string;
    codigo: string;
    envase: string;
    stock: string;
    busqueda: string;
    soloSinReceta: boolean;
  },
): ProductoVista[] {
  const termino = clave(filtros.busqueda);
  const codigoF = filtroBinario(filtros.codigo);
  const stockF = filtroBinario(filtros.stock);
  return productos.filter((item) => {
    if (filtros.categoria && filtros.categoria !== "Todos" && item.categoria !== filtros.categoria) {
      return false;
    }
    if (codigoF === "con" && !item.codigo) return false;
    if (codigoF === "sin" && item.codigo) return false;
    if (filtros.envase && filtros.envase !== "Todos" && item.envase !== filtros.envase) return false;
    const sinStock = item.stk_pall < 0.0005;
    if (stockF === "con" && sinStock) return false;
    if (stockF === "sin" && !sinStock) return false;
    if (filtros.soloSinReceta && item.receta_plc) return false;
    if (!termino) return true;
    const campos = [
      item.codigo,
      item.nombre,
      item.categoria,
      item.receta_plc,
      item.envase,
      item.nombre_etiqueta,
      item.codigo_envase,
      item.codigo_etiqueta,
      ...item.lotes.map((l) => l.lote),
    ];
    return campos.some((c) => clave(c).includes(termino));
  });
}

export function resumenProductos(productos: ProductoVista[]) {
  return productos.reduce(
    (acc, item) => {
      acc.total += 1;
      if (item.codigo) acc.con_codigo += 1;
      else acc.sin_codigo += 1;
      if (!item.receta_plc) acc.sin_receta += 1;
      return acc;
    },
    { total: 0, con_codigo: 0, sin_codigo: 0, sin_receta: 0 },
  );
}

export function unicos(productos: ProductoVista[], campo: "categoria" | "envase") {
  const set = new Set(productos.map((p) => p[campo]).filter(Boolean));
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}

export function validarProducto(
  datos: DatosProductoForm,
  productos: ProductoVista[],
  idEdicion?: number,
): string[] {
  const errores: string[] = [];
  if (!texto(datos.nombre)) errores.push("Ingresá el nombre del producto.");
  if (!aFecha(datos.fecha_registro)) {
    errores.push("La fecha de registro no es válida.");
  }
  if (idEntero(datos.id_envase) == null) errores.push("Seleccioná un envase del catálogo.");
  if (idEntero(datos.id_etiqueta) == null) errores.push("Seleccioná una etiqueta del catálogo.");
  const receta = texto(datos.receta_plc);
  if (receta && idEntero(receta) == null) {
    errores.push("La receta PLC tiene que ser un número.");
  }
  const codigo = texto(datos.codigo);
  if (
    codigo &&
    productos.some(
      (p) => p.id !== idEdicion && clave(p.codigo) === clave(codigo),
    )
  ) {
    errores.push(`Ya existe un producto con el código ${codigo}.`);
  }
  return errores;
}

export function filaProducto(datos: DatosProductoForm, id: number) {
  const receta = texto(datos.receta_plc);
  return {
    id,
    fecha_registro: aFecha(datos.fecha_registro),
    codigo: texto(datos.codigo) || null,
    producto: texto(datos.nombre) || null,
    receta_PLC: receta ? idEntero(receta) : null,
    medida: texto(datos.medida) || "kg",
    categoria: texto(datos.categoria) || null,
    id_envase: idEntero(datos.id_envase),
    id_etiqueta: idEntero(datos.id_etiqueta),
  };
}

export function etiquetaOpcion(codigo: string, nombre: string) {
  return codigo ? `${codigo}  —  ${nombre}` : nombre || "Sin nombre";
}

export function hoyIso() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dia}`;
}
