import {
  aFecha,
  clave,
  idEntero,
  nroVisible,
  numero,
  texto,
} from "@/lib/solicitudes/logic";
import type { ModuloId } from "@/lib/modulos";

export type KindCatalogo = Extract<
  ModuloId,
  "ingredientes" | "insumos" | "envases" | "etiquetas"
>;

export type ConfigCatalogo = {
  kind: KindCatalogo;
  titulo: string;
  subtitulo: string;
  tabla: string;
  campoNombre: string;
  etiquetaItem: string;
  unidad: string;
  genero: "m" | "f";
  campoExtra?: string;
  etiquetaExtra?: string;
  extraEsNumero?: boolean;
  tablaMov: string;
  campoIdMov: string;
  campoCantidadMov: string;
  tipoArticulo: string;
  stockMinimo: number;
  refRecetas?: boolean;
  refProductosCampo?: "id_envase" | "id_etiqueta";
};

export const CATALOGOS: Record<KindCatalogo, ConfigCatalogo> = {
  ingredientes: {
    kind: "ingredientes",
    titulo: "Ingredientes",
    subtitulo:
      "Materias primas usadas en las recetas. El stock se calcula con ingresos, egresos y consumo de producción.",
    tabla: "catalogo_ingredientes",
    campoNombre: "ingrediente",
    etiquetaItem: "Ingrediente",
    unidad: "kg",
    genero: "m",
    tablaMov: "movimientos_ingredientes",
    campoIdMov: "id_ingrediente",
    campoCantidadMov: "peso_total",
    tipoArticulo: "ingrediente",
    stockMinimo: 1,
    refRecetas: true,
  },
  insumos: {
    kind: "insumos",
    titulo: "Insumos",
    subtitulo:
      "Papel, film y otros insumos de empaque. El stock se calcula con ingresos, egresos y consumo de producción.",
    tabla: "catalogo_insumos",
    campoNombre: "insumo",
    etiquetaItem: "Insumo",
    unidad: "Un.",
    genero: "m",
    campoExtra: "consumo_aprox",
    etiquetaExtra: "Consumo aproximado",
    tablaMov: "movimientos_insumos",
    campoIdMov: "id_insumo",
    campoCantidadMov: "cantidad",
    tipoArticulo: "insumo",
    stockMinimo: 0.0005,
  },
  envases: {
    kind: "envases",
    titulo: "Envases",
    subtitulo:
      "Big bags y bolsas. La capacidad de carga (kg) se usa en las solicitudes. El stock descuenta el consumo de producción.",
    tabla: "catalogo_envases",
    campoNombre: "envase",
    etiquetaItem: "Envase",
    unidad: "Un.",
    genero: "m",
    campoExtra: "capacidad_carga_kg",
    etiquetaExtra: "Capacidad de carga (kg)",
    extraEsNumero: true,
    tablaMov: "movimientos_envases",
    campoIdMov: "id_envase",
    campoCantidadMov: "cantidad",
    tipoArticulo: "envase",
    stockMinimo: 0.0005,
    refProductosCampo: "id_envase",
  },
  etiquetas: {
    kind: "etiquetas",
    titulo: "Etiquetas",
    subtitulo:
      "Obleas asociadas a cada producto. El stock se calcula con ingresos, egresos y consumo de producción.",
    tabla: "catalogo_etiquetas",
    campoNombre: "etiqueta",
    etiquetaItem: "Etiqueta",
    unidad: "Un.",
    genero: "f",
    tablaMov: "movimientos_etiquetas",
    campoIdMov: "id_etiqueta",
    campoCantidadMov: "cantidad",
    tipoArticulo: "etiqueta",
    stockMinimo: 0.0005,
    refProductosCampo: "id_etiqueta",
  },
};

export const ESTADO_ACTIVO = "activo";
export const ESTADO_INACTIVO = "inactivo";

export type LoteVista = { lote: string; stock: number; vencimiento: string };

export type ArticuloVista = {
  id: number;
  fecha_registro: string;
  codigo: string;
  nombre: string;
  categoria: string;
  gestion: string;
  medida: string;
  estado: string;
  estado_etiqueta: string;
  extra: string;
  extra_numero: number;
  ingresos: number;
  egresos: number;
  produccion: number;
  stock: number;
  lotes: LoteVista[];
};

export type DatosCatalogoForm = {
  fecha_registro: string;
  codigo: string;
  nombre: string;
  categoria: string;
  gestion: string;
  medida: string;
  estado: string;
  extra: string;
};

function signoMovimiento(tipo: unknown): number {
  const n = clave(tipo);
  if (n === "ingreso" || n === "entrada") return 1;
  if (n === "egreso" || n === "salida") return -1;
  return 0;
}

export function estadoExcel(valor: unknown): string {
  const n = clave(valor);
  if (n === "" || n === "activo") return ESTADO_ACTIVO;
  if (n.includes("inactivo")) return ESTADO_INACTIVO;
  return n.includes("activo") ? ESTADO_ACTIVO : ESTADO_INACTIVO;
}

export function etiquetaEstado(estado: string): string {
  return estado === ESTADO_ACTIVO ? "Activo" : "Inactivo";
}

export function calcularStock(
  cfg: ConfigCatalogo,
  catalogo: Record<string, unknown>[],
  movimientos: Record<string, unknown>[],
  articulos: Record<string, unknown>[],
  consumos: Record<string, unknown>[],
): Map<number, { ingresos: number; egresos: number; produccion: number; stock: number }> {
  const porId = new Map<number, { ingresos: number; egresos: number }>();
  const porCodigo = new Map<string, { ingresos: number; egresos: number }>();
  const porNombre = new Map<string, { ingresos: number; egresos: number }>();

  for (const mov of movimientos) {
    const cantidad = numero(mov[cfg.campoCantidadMov]);
    const signo = signoMovimiento(mov.tipo);
    if (signo === 0 || cantidad === 0) continue;
    const destino = signo > 0 ? "ingresos" : "egresos";
    const referencia = mov[cfg.campoIdMov];
    const ident = idEntero(referencia);
    let codigoMov = clave(mov.codigo);
    if (!codigoMov && ident == null) codigoMov = clave(referencia);
    const nombreMov = clave(mov[cfg.campoNombre]);
    const bucket =
      ident != null
        ? (porId.get(ident) ?? { ingresos: 0, egresos: 0 })
        : codigoMov
          ? (porCodigo.get(codigoMov) ?? { ingresos: 0, egresos: 0 })
          : nombreMov
            ? (porNombre.get(nombreMov) ?? { ingresos: 0, egresos: 0 })
            : null;
    if (!bucket) continue;
    bucket[destino] += cantidad;
    if (ident != null) porId.set(ident, bucket);
    else if (codigoMov) porCodigo.set(codigoMov, bucket);
    else if (nombreMov) porNombre.set(nombreMov, bucket);
  }

  const artPorId = new Map<number, number>();
  for (const art of articulos) {
    if (clave(art.tipo_articulo) !== cfg.tipoArticulo) continue;
    const idArt = idEntero(art.id);
    const origen = idEntero(art.id_origen);
    if (idArt != null && origen != null) artPorId.set(idArt, origen);
  }
  const consumoPorOrigen = new Map<number, number>();
  for (const fila of consumos) {
    const origen = artPorId.get(idEntero(fila.id_articulo) ?? -1);
    if (origen == null) continue;
    consumoPorOrigen.set(
      origen,
      (consumoPorOrigen.get(origen) ?? 0) + numero(fila.cantidad),
    );
  }

  const out = new Map<
    number,
    { ingresos: number; egresos: number; produccion: number; stock: number }
  >();
  for (const item of catalogo) {
    const ident = idEntero(item.id);
    if (ident == null) continue;
    const mov =
      porId.get(ident) ||
      porCodigo.get(clave(item.codigo)) ||
      porNombre.get(clave(item[cfg.campoNombre])) ||
      { ingresos: 0, egresos: 0 };
    const produccion = consumoPorOrigen.get(ident) ?? 0;
    const ingresos = Math.round(mov.ingresos * 1000) / 1000;
    const egresos = Math.round(mov.egresos * 1000) / 1000;
    const prod = Math.round(produccion * 1000) / 1000;
    out.set(ident, {
      ingresos,
      egresos,
      produccion: prod,
      stock: Math.round((ingresos - egresos - prod) * 1000) / 1000,
    });
  }
  return out;
}

export function calcularLotes(
  cfg: ConfigCatalogo,
  catalogo: Record<string, unknown>[],
  movimientos: Record<string, unknown>[],
  articulos: Record<string, unknown>[],
  consumos: Record<string, unknown>[],
): Map<number, LoteVista[]> {
  const idPorNombre = new Map<string, number>();
  for (const fila of catalogo) {
    const ident = idEntero(fila.id);
    const nombre = clave(fila[cfg.campoNombre]);
    if (ident != null && nombre) idPorNombre.set(nombre, ident);
  }

  const saldos = new Map<number, Map<string, number>>();
  const venc = new Map<string, { rango: [number, string, number]; fecha: string }>();

  function bucket(ident: number) {
    let m = saldos.get(ident);
    if (!m) {
      m = new Map();
      saldos.set(ident, m);
    }
    return m;
  }

  for (const mov of movimientos) {
    let ident = idEntero(mov[cfg.campoIdMov]);
    if (ident == null) ident = idPorNombre.get(clave(mov[cfg.campoNombre])) ?? null;
    const lote = texto(mov.lote);
    if (ident == null || !lote) continue;
    const signo = signoMovimiento(mov.tipo);
    if (signo === 0) continue;
    const m = bucket(ident);
    m.set(lote, (m.get(lote) ?? 0) + signo * numero(mov[cfg.campoCantidadMov]));

    const fechaV = aFecha(mov.fecha_vencimiento) ?? texto(mov.fecha_vencimiento);
    if (fechaV) {
      const rango: [number, string, number] = [
        signo > 0 ? 1 : 0,
        aFecha(mov.fecha_registro) ?? "",
        idEntero(mov.id) ?? 0,
      ];
      const k = `${ident}|${clave(lote)}`;
      const prev = venc.get(k);
      const mejor =
        !prev ||
        rango[0] > prev.rango[0] ||
        (rango[0] === prev.rango[0] && rango[1] > prev.rango[1]) ||
        (rango[0] === prev.rango[0] &&
          rango[1] === prev.rango[1] &&
          rango[2] >= prev.rango[2]);
      if (mejor) venc.set(k, { rango, fecha: fechaV });
    }
  }

  const artPorId = new Map<number, number>();
  for (const art of articulos) {
    if (clave(art.tipo_articulo) !== cfg.tipoArticulo) continue;
    const idArt = idEntero(art.id);
    const origen = idEntero(art.id_origen);
    if (idArt != null && origen != null) artPorId.set(idArt, origen);
  }
  for (const fila of consumos) {
    const origen = artPorId.get(idEntero(fila.id_articulo) ?? -1);
    const lote = texto(fila.lote_articulo);
    if (origen == null || !lote) continue;
    const m = bucket(origen);
    m.set(lote, (m.get(lote) ?? 0) - numero(fila.cantidad));
  }

  const out = new Map<number, LoteVista[]>();
  for (const [ident, porLote] of saldos) {
    const lotes: LoteVista[] = [];
    for (const [lote, stock] of porLote) {
      const redondo = Math.round(stock * 1000) / 1000;
      if (redondo <= 0.0005) continue;
      lotes.push({
        lote,
        stock: redondo,
        vencimiento: venc.get(`${ident}|${clave(lote)}`)?.fecha ?? "",
      });
    }
    lotes.sort((a, b) => a.lote.localeCompare(b.lote, "es"));
    if (lotes.length) out.set(ident, lotes);
  }
  return out;
}

export function armarArticulos(
  cfg: ConfigCatalogo,
  filas: Record<string, unknown>[],
  stocks: Map<number, { ingresos: number; egresos: number; produccion: number; stock: number }>,
  lotes: Map<number, LoteVista[]>,
): ArticuloVista[] {
  const items: ArticuloVista[] = [];
  for (const fila of filas) {
    const id = idEntero(fila.id);
    const nombre = texto(fila[cfg.campoNombre]);
    const codigo = texto(fila.codigo);
    if (id == null && !codigo && !nombre) continue;
    if (id == null) continue;
    const extraNumero = cfg.campoExtra ? numero(fila[cfg.campoExtra]) : 0;
    let extra = "";
    if (cfg.campoExtra) {
      extra = cfg.extraEsNumero
        ? extraNumero > 0
          ? `${nroVisible(extraNumero, 1)} kg`
          : ""
        : texto(fila[cfg.campoExtra]);
    }
    const estado = estadoExcel(fila.estado);
    const stock = stocks.get(id) ?? {
      ingresos: 0,
      egresos: 0,
      produccion: 0,
      stock: 0,
    };
    items.push({
      id,
      fecha_registro: texto(fila.fecha_registro),
      codigo,
      nombre,
      categoria: texto(fila.categoria),
      gestion: texto(fila.gestion),
      medida: texto(fila.medida) || cfg.unidad,
      estado,
      estado_etiqueta: etiquetaEstado(estado),
      extra,
      extra_numero: extraNumero,
      ...stock,
      lotes: (lotes.get(id) ?? []).filter((l) => l.stock >= cfg.stockMinimo),
    });
  }
  items.sort((a, b) =>
    (a.nombre || a.codigo).localeCompare(b.nombre || b.codigo, "es"),
  );
  return items;
}

export function filtrarArticulos(
  items: ArticuloVista[],
  cfg: ConfigCatalogo,
  filtros: {
    estado: string;
    categoria: string;
    gestion: string;
    busqueda: string;
    soloSinStock: boolean;
  },
): ArticuloVista[] {
  const termino = clave(filtros.busqueda);
  const estado = clave(filtros.estado);
  const estadoFiltro = estado.includes("inactivo")
    ? ESTADO_INACTIVO
    : estado.includes("activo") && !estado.includes("todos")
      ? ESTADO_ACTIVO
      : null;
  return items.filter((item) => {
    if (estadoFiltro && item.estado !== estadoFiltro) return false;
    if (
      filtros.categoria &&
      filtros.categoria !== "Todos" &&
      item.categoria !== filtros.categoria
    ) {
      return false;
    }
    if (
      filtros.gestion &&
      filtros.gestion !== "Todos" &&
      item.gestion !== filtros.gestion
    ) {
      return false;
    }
    if (filtros.soloSinStock && item.stock >= cfg.stockMinimo) return false;
    if (!termino) return true;
    return [item.codigo, item.nombre, item.categoria, item.gestion, item.medida, item.extra]
      .some((c) => clave(c).includes(termino));
  });
}

export function resumenArticulos(items: ArticuloVista[], minimo: number) {
  return items.reduce(
    (acc, item) => {
      acc.total += 1;
      if (item.estado === ESTADO_ACTIVO) acc.activos += 1;
      else acc.inactivos += 1;
      if (item.stock < minimo) acc.sin_stock += 1;
      acc.stock_total += item.stock;
      return acc;
    },
    { total: 0, activos: 0, inactivos: 0, sin_stock: 0, stock_total: 0 },
  );
}

export function validarCatalogo(
  cfg: ConfigCatalogo,
  datos: DatosCatalogoForm,
): string[] {
  const errores: string[] = [];
  if (!texto(datos.nombre)) {
    errores.push(
      `Ingresá el nombre ${cfg.genero === "f" ? "de la" : "del"} ${cfg.etiquetaItem.toLowerCase()}.`,
    );
  }
  if (!texto(datos.codigo)) errores.push("Ingresá el código.");
  if (!aFecha(datos.fecha_registro)) {
    errores.push("La fecha de registro no es válida.");
  }
  const estado = estadoExcel(datos.estado);
  if (estado !== ESTADO_ACTIVO && estado !== ESTADO_INACTIVO) {
    errores.push("Seleccioná si está activo o inactivo.");
  }
  if (cfg.extraEsNumero && cfg.campoExtra && numero(datos.extra) <= 0) {
    errores.push(`${cfg.etiquetaExtra} debe ser mayor a 0.`);
  }
  return errores;
}

export function filaCatalogo(
  cfg: ConfigCatalogo,
  datos: DatosCatalogoForm,
  id: number,
): Record<string, unknown> {
  const fila: Record<string, unknown> = {
    id,
    fecha_registro: aFecha(datos.fecha_registro),
    codigo: texto(datos.codigo) || null,
    [cfg.campoNombre]: texto(datos.nombre) || null,
    categoria: texto(datos.categoria) || null,
    gestion: texto(datos.gestion) || null,
    medida: texto(datos.medida) || cfg.unidad,
    estado: etiquetaEstado(estadoExcel(datos.estado)),
  };
  if (cfg.campoExtra) {
    if (cfg.extraEsNumero) {
      const valor = numero(datos.extra);
      fila[cfg.campoExtra] = valor > 0 ? valor : null;
    } else {
      fila[cfg.campoExtra] = texto(datos.extra) || null;
    }
  }
  return fila;
}

export function unicos(items: ArticuloVista[], campo: "categoria" | "gestion"): string[] {
  const set = new Set(items.map((i) => i[campo]).filter(Boolean));
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}

export { nroVisible };
