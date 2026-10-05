import { plata } from "@/lib/contabilidad/logic";
import {
  ESTADO_ACTIVO,
  LineaReceta,
  OpcionIngrediente,
  VersionVista,
  armarVersiones,
  participacionPct,
} from "@/lib/recetas/logic";
import { clave, idEntero, nroVisible, numero, texto } from "@/lib/solicitudes/logic";

export { plata };

export const SOLAPAS = ["ingredientes", "fazon", "productos"] as const;
export type SolapaCotiz = (typeof SOLAPAS)[number];

export type ItemMp = {
  id: number;
  id_ingrediente: number | null;
  codigo: string;
  nombre: string;
  costo_por_tn: number;
  variacion_pct: number | null;
};

export type ListaMp = {
  id: number;
  fecha_hora_registro: string;
  id_usuario_registro: number;
  usuario: string;
  observaciones: string;
  items: ItemMp[];
  items_con_costo: number;
  vigente: boolean;
  cambios: number;
};

export type ParFazon = {
  clave: string;
  categoria: string;
  capacidad_kg: number;
};

export type ItemFazon = {
  id: number;
  categoria: string;
  capacidad_kg: number;
  costo_por_tn: number;
  variacion_pct: number | null;
};

export type ListaFazon = {
  id: number;
  fecha_hora_registro: string;
  id_usuario_registro: number;
  usuario: string;
  observaciones: string;
  items: ItemFazon[];
  items_con_costo: number;
  vigente: boolean;
  cambios: number;
};

export type ProductoCotiz = {
  id: number;
  codigo: string;
  nombre: string;
  categoria: string;
  envase: string;
  capacidad_kg: number;
};

export type LineaCosto = {
  id_ingrediente: number | null;
  codigo: string;
  nombre: string;
  participacion: number;
  participacion_pct: number;
  costo_ingrediente_tn: number;
  costo_linea_tn: number;
  sin_costo: boolean;
};

export type PresentacionCosto = {
  capacidad_kg: number;
  costo_fazon_tn: number;
  costo_tn: number;
};

export type FilaProductoCotiz = {
  clave: string;
  id_producto: number;
  id_version: number;
  codigo: string;
  producto: string;
  categoria: string;
  version: number;
  envase: string;
  capacidad_kg: number;
  costo_mp_tn: number;
  costo_fazon_tn: number;
  costo_tn: number;
  lineas: LineaCosto[];
  otras_presentaciones: PresentacionCosto[];
  lineas_sin_costo: number;
};

export type ItemProductoGuardado = {
  id: number;
  id_ingrediente: number | null;
  codigo: string;
  nombre: string;
  participacion: number;
  participacion_pct: number;
  costo_ingrediente_tn: number;
  costo_linea_tn: number;
};

export type CotizProductoGuardada = {
  id: number;
  fecha_hora_registro: string;
  usuario: string;
  id_cotiz_mp: number | null;
  id_cotiz_fazon: number | null;
  id_producto: number | null;
  codigo_producto: string;
  producto: string;
  categoria: string;
  id_version: number | null;
  version: number;
  capacidad_kg: number;
  toneladas: number;
  costo_mp_tn: number;
  costo_fazon_tn: number;
  costo_tn: number;
  total: number;
  observaciones: string;
  items: ItemProductoGuardado[];
};

export type DatosCotizaciones = {
  ingredientes: OpcionIngrediente[];
  productos: ProductoCotiz[];
  pares_fazon: ParFazon[];
  versiones: VersionVista[];
  listas_mp: ListaMp[];
  listas_fazon: ListaFazon[];
  filas_producto: FilaProductoCotiz[];
  cotizaciones_producto: CotizProductoGuardada[];
};

export type ItemMpForm = {
  id_ingrediente: string;
  costo_por_tn: string;
};

export type ItemFazonForm = {
  categoria: string;
  capacidad_kg: string;
  costo_por_tn: string;
};

export type DatosCotizProductoForm = {
  id_producto: string;
  id_version: string;
  capacidad_kg: string;
  toneladas: string;
};

function redondear2(valor: number) {
  return Math.round(valor * 100) / 100;
}

function redondear3(valor: number) {
  return Math.round(valor * 1000) / 1000;
}

export function claveCategoria(valor: string) {
  return clave(valor);
}

export function claveCapacidad(valor: number) {
  return String(redondear3(valor));
}

export function clavePar(categoria: string, capacidadKg: number) {
  return `${claveCategoria(categoria)}|${claveCapacidad(capacidadKg)}`;
}

export function parseCosto(valor: string): number | null {
  const t = valor.trim();
  if (!t) return 0;
  const n = numero(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return redondear2(n);
}

export function costoInput(valor: number) {
  if (!valor) return "";
  return String(valor).replace(".", ",");
}

export function textoDinero(valor: number) {
  return `$ ${plata(valor)}`;
}

export function textoCapacidad(kg: number) {
  if (!(kg > 0)) return "—";
  return `${nroVisible(kg, kg % 1 === 0 ? 0 : 1)} kg`;
}

export function textoVariacion(pct: number | null) {
  if (pct == null || !Number.isFinite(pct)) return "—";
  const n = Math.round(pct * 10) / 10;
  const txt = `${n > 0 ? "+" : ""}${n.toLocaleString("es-AR", {
    minimumFractionDigits: Math.abs(n % 1) < 0.05 ? 0 : 1,
    maximumFractionDigits: 1,
  })} %`;
  return txt;
}

function variacionPct(actual: number, anterior: number | undefined): number | null {
  if (anterior == null) return null;
  if (anterior <= 0 && actual <= 0) return 0;
  if (anterior <= 0) return null;
  return ((actual - anterior) / anterior) * 100;
}

function nombreUsuario(fila: Record<string, unknown> | undefined, id: number | null) {
  if (id == null) return "—";
  if (!fila) return String(id);
  const nombre = [texto(fila.nombre), texto(fila.apellido)].filter(Boolean).join(" ");
  return nombre || String(id);
}

function mapaUsuarios(filas: Record<string, unknown>[]) {
  const map = new Map<number, Record<string, unknown>>();
  for (const fila of filas) {
    const id = idEntero(fila.id);
    if (id != null) map.set(id, fila);
  }
  return map;
}

export function armarProductosCotiz(
  productos: Record<string, unknown>[],
  envases: Record<string, unknown>[],
): ProductoCotiz[] {
  const porEnvase = new Map<number, { nombre: string; kg: number }>();
  for (const fila of envases) {
    const id = idEntero(fila.id);
    if (id == null) continue;
    porEnvase.set(id, {
      nombre: texto(fila.envase),
      kg: numero(fila.capacidad_carga_kg),
    });
  }
  const items: ProductoCotiz[] = [];
  for (const fila of productos) {
    const id = idEntero(fila.id);
    const nombre = texto(fila.producto);
    if (id == null || !nombre) continue;
    const env = porEnvase.get(idEntero(fila.id_envase) ?? -1);
    items.push({
      id,
      codigo: texto(fila.codigo),
      nombre,
      categoria: texto(fila.categoria),
      envase: env?.nombre ?? "",
      capacidad_kg: env?.kg ?? 0,
    });
  }
  items.sort((a, b) => a.nombre.localeCompare(b.nombre, "es") || a.codigo.localeCompare(b.codigo, "es"));
  return items;
}

export function armarParesFazon(productos: ProductoCotiz[]): ParFazon[] {
  const vistos = new Map<string, ParFazon>();
  for (const p of productos) {
    if (!p.categoria || !(p.capacidad_kg > 0)) continue;
    const k = clavePar(p.categoria, p.capacidad_kg);
    if (vistos.has(k)) continue;
    vistos.set(k, {
      clave: k,
      categoria: p.categoria,
      capacidad_kg: p.capacidad_kg,
    });
  }
  return [...vistos.values()].sort(
    (a, b) =>
      a.categoria.localeCompare(b.categoria, "es") || a.capacidad_kg - b.capacidad_kg,
  );
}

function armarListasMp(
  cabeceras: Record<string, unknown>[],
  lineas: Record<string, unknown>[],
  usuarios: Map<number, Record<string, unknown>>,
): ListaMp[] {
  const porLista = new Map<number, ItemMp[]>();
  for (const fila of lineas) {
    const idLista = idEntero(fila.id_cotiz_mp);
    const id = idEntero(fila.id);
    if (idLista == null || id == null) continue;
    const item: ItemMp = {
      id,
      id_ingrediente: idEntero(fila.id_ingrediente),
      codigo: texto(fila.codigo),
      nombre: texto(fila.nombre),
      costo_por_tn: redondear2(numero(fila.costo_por_tn)),
      variacion_pct: null,
    };
    const lista = porLista.get(idLista) ?? [];
    lista.push(item);
    porLista.set(idLista, lista);
  }

  const listas: ListaMp[] = [];
  for (const fila of cabeceras) {
    const id = idEntero(fila.id);
    if (id == null) continue;
    const idUsuario = idEntero(fila.id_usuario_registro) ?? 0;
    const items = (porLista.get(id) ?? []).sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es") || a.codigo.localeCompare(b.codigo, "es"),
    );
    listas.push({
      id,
      fecha_hora_registro: texto(fila.fecha_hora_registro),
      id_usuario_registro: idUsuario,
      usuario: nombreUsuario(usuarios.get(idUsuario), idUsuario),
      observaciones: texto(fila.observaciones),
      items,
      items_con_costo: items.filter((i) => i.costo_por_tn > 0).length,
      vigente: false,
      cambios: 0,
    });
  }
  listas.sort((a, b) => {
    const fa = a.fecha_hora_registro;
    const fb = b.fecha_hora_registro;
    if (fa !== fb) return fb.localeCompare(fa);
    return b.id - a.id;
  });
  if (listas[0]) listas[0].vigente = true;
  for (let i = 0; i < listas.length; i += 1) {
    const anterior = listas[i + 1];
    if (!anterior) continue;
    const prev = new Map<number, number>();
    for (const item of anterior.items) {
      if (item.id_ingrediente != null) prev.set(item.id_ingrediente, item.costo_por_tn);
    }
    let cambios = 0;
    for (const item of listas[i].items) {
      const ant = item.id_ingrediente != null ? prev.get(item.id_ingrediente) : undefined;
      item.variacion_pct = variacionPct(item.costo_por_tn, ant);
      if (ant != null && redondear2(ant) !== item.costo_por_tn) cambios += 1;
      if (ant == null && item.costo_por_tn > 0) cambios += 1;
    }
    listas[i].cambios = cambios;
  }
  return listas;
}

function armarListasFazon(
  cabeceras: Record<string, unknown>[],
  lineas: Record<string, unknown>[],
  usuarios: Map<number, Record<string, unknown>>,
): ListaFazon[] {
  const porLista = new Map<number, ItemFazon[]>();
  for (const fila of lineas) {
    const idLista = idEntero(fila.id_cotiz_fazon);
    const id = idEntero(fila.id);
    if (idLista == null || id == null) continue;
    const item: ItemFazon = {
      id,
      categoria: texto(fila.categoria),
      capacidad_kg: numero(fila.capacidad_kg),
      costo_por_tn: redondear2(numero(fila.costo_por_tn)),
      variacion_pct: null,
    };
    const lista = porLista.get(idLista) ?? [];
    lista.push(item);
    porLista.set(idLista, lista);
  }

  const listas: ListaFazon[] = [];
  for (const fila of cabeceras) {
    const id = idEntero(fila.id);
    if (id == null) continue;
    const idUsuario = idEntero(fila.id_usuario_registro) ?? 0;
    const items = (porLista.get(id) ?? []).sort(
      (a, b) =>
        a.categoria.localeCompare(b.categoria, "es") || a.capacidad_kg - b.capacidad_kg,
    );
    listas.push({
      id,
      fecha_hora_registro: texto(fila.fecha_hora_registro),
      id_usuario_registro: idUsuario,
      usuario: nombreUsuario(usuarios.get(idUsuario), idUsuario),
      observaciones: texto(fila.observaciones),
      items,
      items_con_costo: items.filter((i) => i.costo_por_tn > 0).length,
      vigente: false,
      cambios: 0,
    });
  }
  listas.sort((a, b) => {
    const fa = a.fecha_hora_registro;
    const fb = b.fecha_hora_registro;
    if (fa !== fb) return fb.localeCompare(fa);
    return b.id - a.id;
  });
  if (listas[0]) listas[0].vigente = true;
  for (let i = 0; i < listas.length; i += 1) {
    const anterior = listas[i + 1];
    if (!anterior) continue;
    const prev = new Map<string, number>();
    for (const item of anterior.items) {
      prev.set(clavePar(item.categoria, item.capacidad_kg), item.costo_por_tn);
    }
    let cambios = 0;
    for (const item of listas[i].items) {
      const k = clavePar(item.categoria, item.capacidad_kg);
      const ant = prev.get(k);
      item.variacion_pct = variacionPct(item.costo_por_tn, ant);
      if (ant != null && redondear2(ant) !== item.costo_por_tn) cambios += 1;
      if (ant == null && item.costo_por_tn > 0) cambios += 1;
    }
    listas[i].cambios = cambios;
  }
  return listas;
}

export function mapaCostoMp(lista: ListaMp | undefined) {
  const map = new Map<number, number>();
  if (!lista) return map;
  for (const item of lista.items) {
    if (item.id_ingrediente != null) map.set(item.id_ingrediente, item.costo_por_tn);
  }
  return map;
}

export function mapaCostoFazon(lista: ListaFazon | undefined) {
  const map = new Map<string, number>();
  if (!lista) return map;
  for (const item of lista.items) {
    map.set(clavePar(item.categoria, item.capacidad_kg), item.costo_por_tn);
  }
  return map;
}

function categoriasConFazon(lista: ListaFazon | undefined) {
  const set = new Set<string>();
  if (!lista) return set;
  for (const item of lista.items) {
    if (item.costo_por_tn > 0) set.add(claveCategoria(item.categoria));
  }
  return set;
}

function lineasCosto(lineas: LineaReceta[], costos: Map<number, number>): LineaCosto[] {
  return lineas.map((l) => {
    const costoIng =
      l.id_ingrediente != null ? (costos.get(l.id_ingrediente) ?? 0) : 0;
    const costoLinea = redondear2(l.participacion * costoIng);
    return {
      id_ingrediente: l.id_ingrediente,
      codigo: l.codigo_ingrediente,
      nombre: l.ingrediente,
      participacion: l.participacion,
      participacion_pct: l.participacion_pct,
      costo_ingrediente_tn: costoIng,
      costo_linea_tn: costoLinea,
      sin_costo: !(costoIng > 0),
    };
  });
}

export function armarFilasProducto(
  productos: ProductoCotiz[],
  versiones: VersionVista[],
  listaMp: ListaMp | undefined,
  listaFazon: ListaFazon | undefined,
): FilaProductoCotiz[] {
  const costosMp = mapaCostoMp(listaMp);
  const costosFz = mapaCostoFazon(listaFazon);
  const cats = categoriasConFazon(listaFazon);
  const porId = new Map(productos.map((p) => [p.id, p]));
  const filas: FilaProductoCotiz[] = [];

  for (const ver of versiones) {
    if (ver.estado !== ESTADO_ACTIVO) continue;
    if (ver.id_producto == null) continue;
    const prod = porId.get(ver.id_producto);
    if (!prod) continue;
    if (!cats.has(claveCategoria(prod.categoria))) continue;
    const lineas = lineasCosto(ver.lineas, costosMp);
    const costoMp = redondear2(lineas.reduce((acc, l) => acc + l.costo_linea_tn, 0));
    const fazonTn = costosFz.get(clavePar(prod.categoria, prod.capacidad_kg)) ?? 0;
    const otras: PresentacionCosto[] = [];
    if (listaFazon) {
      for (const item of listaFazon.items) {
        if (claveCategoria(item.categoria) !== claveCategoria(prod.categoria)) continue;
        if (!(item.costo_por_tn > 0)) continue;
        if (claveCapacidad(item.capacidad_kg) === claveCapacidad(prod.capacidad_kg)) continue;
        otras.push({
          capacidad_kg: item.capacidad_kg,
          costo_fazon_tn: item.costo_por_tn,
          costo_tn: redondear2(costoMp + item.costo_por_tn),
        });
      }
      otras.sort((a, b) => a.capacidad_kg - b.capacidad_kg);
    }
    filas.push({
      clave: `${prod.id}-${ver.id}`,
      id_producto: prod.id,
      id_version: ver.id,
      codigo: prod.codigo,
      producto: prod.nombre,
      categoria: prod.categoria,
      version: ver.numero,
      envase: prod.envase,
      capacidad_kg: prod.capacidad_kg,
      costo_mp_tn: costoMp,
      costo_fazon_tn: fazonTn,
      costo_tn: redondear2(costoMp + fazonTn),
      lineas,
      otras_presentaciones: otras,
      lineas_sin_costo: lineas.filter((l) => l.sin_costo).length,
    });
  }
  filas.sort(
    (a, b) =>
      a.producto.localeCompare(b.producto, "es") ||
      a.version - b.version ||
      a.capacidad_kg - b.capacidad_kg,
  );
  return filas;
}

export function armarDesgloseProducto(input: {
  productos: ProductoCotiz[];
  versiones: VersionVista[];
  listaMp: ListaMp | undefined;
  listaFazon: ListaFazon | undefined;
  idProducto: number;
  idVersion: number;
  capacidadKg: number;
  toneladas: number;
}): {
  fila: FilaProductoCotiz | null;
  capacidad_kg: number;
  costo_fazon_tn: number;
  costo_tn: number;
  total: number;
  toneladas: number;
} | null {
  const prod = input.productos.find((p) => p.id === input.idProducto);
  const ver = input.versiones.find((v) => v.id === input.idVersion);
  if (!prod || !ver || ver.id_producto !== prod.id) return null;
  const costosMp = mapaCostoMp(input.listaMp);
  const costosFz = mapaCostoFazon(input.listaFazon);
  const lineas = lineasCosto(ver.lineas, costosMp);
  const costoMp = redondear2(lineas.reduce((acc, l) => acc + l.costo_linea_tn, 0));
  const cap = input.capacidadKg > 0 ? input.capacidadKg : prod.capacidad_kg;
  const fazon = costosFz.get(clavePar(prod.categoria, cap)) ?? 0;
  const costoTn = redondear2(costoMp + fazon);
  const tn = input.toneladas > 0 ? input.toneladas : 0;
  const otras: PresentacionCosto[] = [];
  if (input.listaFazon) {
    for (const item of input.listaFazon.items) {
      if (claveCategoria(item.categoria) !== claveCategoria(prod.categoria)) continue;
      if (!(item.costo_por_tn > 0)) continue;
      if (claveCapacidad(item.capacidad_kg) === claveCapacidad(cap)) continue;
      otras.push({
        capacidad_kg: item.capacidad_kg,
        costo_fazon_tn: item.costo_por_tn,
        costo_tn: redondear2(costoMp + item.costo_por_tn),
      });
    }
  }
  const fila: FilaProductoCotiz = {
    clave: `${prod.id}-${ver.id}`,
    id_producto: prod.id,
    id_version: ver.id,
    codigo: prod.codigo,
    producto: prod.nombre,
    categoria: prod.categoria,
    version: ver.numero,
    envase: prod.envase,
    capacidad_kg: cap,
    costo_mp_tn: costoMp,
    costo_fazon_tn: fazon,
    costo_tn: costoTn,
    lineas,
    otras_presentaciones: otras,
    lineas_sin_costo: lineas.filter((l) => l.sin_costo).length,
  };
  return {
    fila,
    capacidad_kg: cap,
    costo_fazon_tn: fazon,
    costo_tn: costoTn,
    total: redondear2(costoTn * tn),
    toneladas: tn,
  };
}

function armarCotizacionesProducto(
  cabeceras: Record<string, unknown>[],
  lineas: Record<string, unknown>[],
  usuarios: Map<number, Record<string, unknown>>,
): CotizProductoGuardada[] {
  const porLista = new Map<number, ItemProductoGuardado[]>();
  for (const fila of lineas) {
    const idLista = idEntero(fila.id_cotiz_producto);
    const id = idEntero(fila.id);
    if (idLista == null || id == null) continue;
    const part = numero(fila.participacion);
    const item: ItemProductoGuardado = {
      id,
      id_ingrediente: idEntero(fila.id_ingrediente),
      codigo: texto(fila.codigo),
      nombre: texto(fila.nombre),
      participacion: part,
      participacion_pct: participacionPct(part),
      costo_ingrediente_tn: redondear2(numero(fila.costo_ingrediente_tn)),
      costo_linea_tn: redondear2(numero(fila.costo_linea_tn)),
    };
    const lista = porLista.get(idLista) ?? [];
    lista.push(item);
    porLista.set(idLista, lista);
  }
  const out: CotizProductoGuardada[] = [];
  for (const fila of cabeceras) {
    const id = idEntero(fila.id);
    if (id == null) continue;
    const idUsuario = idEntero(fila.id_usuario_registro) ?? 0;
    out.push({
      id,
      fecha_hora_registro: texto(fila.fecha_hora_registro),
      usuario: nombreUsuario(usuarios.get(idUsuario), idUsuario),
      id_cotiz_mp: idEntero(fila.id_cotiz_mp),
      id_cotiz_fazon: idEntero(fila.id_cotiz_fazon),
      id_producto: idEntero(fila.id_producto),
      codigo_producto: texto(fila.codigo_producto),
      producto: texto(fila.producto),
      categoria: texto(fila.categoria),
      id_version: idEntero(fila.id_version),
      version: numero(fila.version),
      capacidad_kg: numero(fila.capacidad_kg),
      toneladas: numero(fila.toneladas),
      costo_mp_tn: redondear2(numero(fila.costo_mp_tn)),
      costo_fazon_tn: redondear2(numero(fila.costo_fazon_tn)),
      costo_tn: redondear2(numero(fila.costo_tn)),
      total: redondear2(numero(fila.total)),
      observaciones: texto(fila.observaciones),
      items: porLista.get(id) ?? [],
    });
  }
  out.sort((a, b) => {
    if (a.fecha_hora_registro !== b.fecha_hora_registro) {
      return b.fecha_hora_registro.localeCompare(a.fecha_hora_registro);
    }
    return b.id - a.id;
  });
  return out;
}

export function armarCotizaciones(input: {
  ingredientes: Record<string, unknown>[];
  productos: Record<string, unknown>[];
  envases: Record<string, unknown>[];
  versiones: Record<string, unknown>[];
  recetas: Record<string, unknown>[];
  mp: Record<string, unknown>[];
  mpItems: Record<string, unknown>[];
  fazon: Record<string, unknown>[];
  fazonItems: Record<string, unknown>[];
  productosCotiz: Record<string, unknown>[];
  productosItems: Record<string, unknown>[];
  usuarios: Record<string, unknown>[];
}): DatosCotizaciones {
  const recetas = armarVersiones(
    input.versiones,
    input.recetas,
    input.productos,
    input.ingredientes,
  );
  const productos = armarProductosCotiz(input.productos, input.envases);
  const usuarios = mapaUsuarios(input.usuarios);
  const listasMp = armarListasMp(input.mp, input.mpItems, usuarios);
  const listasFazon = armarListasFazon(input.fazon, input.fazonItems, usuarios);
  const vigenteMp = listasMp.find((l) => l.vigente);
  const vigenteFz = listasFazon.find((l) => l.vigente);
  return {
    ingredientes: recetas.ingredientes,
    productos,
    pares_fazon: armarParesFazon(productos),
    versiones: recetas.versiones,
    listas_mp: listasMp,
    listas_fazon: listasFazon,
    filas_producto: armarFilasProducto(productos, recetas.versiones, vigenteMp, vigenteFz),
    cotizaciones_producto: armarCotizacionesProducto(
      input.productosCotiz,
      input.productosItems,
      usuarios,
    ),
  };
}

export function itemsActualesMp(lista: ListaMp | undefined) {
  return (lista?.items ?? []).filter((i) => i.costo_por_tn > 0);
}

export function itemsActualesFazon(lista: ListaFazon | undefined) {
  return (lista?.items ?? []).filter((i) => i.costo_por_tn > 0);
}

export function formMpDesde(
  ingredientes: OpcionIngrediente[],
  vigente: ListaMp | undefined,
): ItemMpForm[] {
  const costos = mapaCostoMp(vigente);
  return ingredientes
    .filter((i) => i.activo)
    .map((i) => ({
      id_ingrediente: String(i.id),
      costo_por_tn: costoInput(costos.get(i.id) ?? 0),
    }));
}

export function formFazonDesde(pares: ParFazon[], vigente: ListaFazon | undefined): ItemFazonForm[] {
  const costos = mapaCostoFazon(vigente);
  return pares.map((p) => ({
    categoria: p.categoria,
    capacidad_kg: String(p.capacidad_kg),
    costo_por_tn: costoInput(costos.get(p.clave) ?? 0),
  }));
}

export function validarListaMp(items: ItemMpForm[]): string[] {
  const errores: string[] = [];
  if (!items.length) errores.push("No hay ingredientes activos para cotizar.");
  for (const item of items) {
    if (parseCosto(item.costo_por_tn) == null) {
      errores.push("Hay un costo de ingrediente inválido. Usá un número mayor o igual a 0.");
      break;
    }
  }
  return errores;
}

export function validarListaFazon(items: ItemFazonForm[]): string[] {
  const errores: string[] = [];
  if (!items.length) {
    errores.push("No hay pares de categoría y capacidad en los productos.");
  }
  for (const item of items) {
    if (!texto(item.categoria) || !(numero(item.capacidad_kg) > 0)) {
      errores.push("Falta categoría o capacidad en una fila de fazón.");
      break;
    }
    if (parseCosto(item.costo_por_tn) == null) {
      errores.push("Hay un costo de fazón inválido. Usá un número mayor o igual a 0.");
      break;
    }
  }
  return errores;
}

export function validarCotizProducto(datos: DatosCotizProductoForm): string[] {
  const errores: string[] = [];
  if (idEntero(datos.id_producto) == null) errores.push("Seleccioná un producto.");
  if (idEntero(datos.id_version) == null) errores.push("Seleccioná una versión de receta.");
  if (!(numero(datos.capacidad_kg) > 0)) errores.push("Indicá la capacidad del envase en kg.");
  const tn = numero(datos.toneladas);
  if (!(tn > 0)) errores.push("Indicá las toneladas a cotizar.");
  return errores;
}

export function filtrarFilasProducto(
  filas: FilaProductoCotiz[],
  filtros: { categoria: string; producto: string; busqueda: string },
) {
  const cat = clave(filtros.categoria);
  const prod = clave(filtros.producto);
  const q = clave(filtros.busqueda);
  return filas.filter((f) => {
    if (cat && cat !== "todos" && clave(f.categoria) !== cat) return false;
    if (prod && prod !== "todos" && clave(f.producto) !== prod) return false;
    if (!q) return true;
    return [f.codigo, f.producto, f.categoria, String(f.version), f.envase].some((c) =>
      clave(c).includes(q),
    );
  });
}

export function capacidadesDeCategoria(
  pares: ParFazon[],
  lista: ListaFazon | undefined,
  categoria: string,
  extraKg: number,
) {
  const vistos = new Map<string, number>();
  for (const p of pares) {
    if (claveCategoria(p.categoria) === claveCategoria(categoria)) {
      vistos.set(claveCapacidad(p.capacidad_kg), p.capacidad_kg);
    }
  }
  if (lista) {
    for (const item of lista.items) {
      if (claveCategoria(item.categoria) === claveCategoria(categoria)) {
        vistos.set(claveCapacidad(item.capacidad_kg), item.capacidad_kg);
      }
    }
  }
  if (extraKg > 0) vistos.set(claveCapacidad(extraKg), extraKg);
  return [...vistos.values()].sort((a, b) => a - b);
}

export function versionesActivasDe(versiones: VersionVista[], idProducto: number) {
  return versiones
    .filter((v) => v.id_producto === idProducto && v.estado === ESTADO_ACTIVO)
    .sort((a, b) => a.numero - b.numero);
}

export const ENCABEZADOS_INFORME_PRODUCTOS = [
  "Categoría",
  "Código",
  "Producto",
  "Versión",
  "Capacidad kg",
  "Costo MP $/Tn",
  "Fazón $/Tn",
  "Costo $/Tn",
] as const;

export function filasInformeProductos(filas: FilaProductoCotiz[]): (string | number | null)[][] {
  return filas.map((f) => [
    f.categoria,
    f.codigo,
    f.producto,
    f.version,
    f.capacidad_kg,
    f.costo_mp_tn,
    f.costo_fazon_tn,
    f.costo_tn,
  ]);
}

export function etiquetaOpcion(codigo: string, nombre: string) {
  return codigo ? `${codigo}  —  ${nombre}` : nombre;
}
