/** Lógica de negocio portada de services/solicitudes_service.py */

export const ESTADO_PENDIENTE = "pendiente";
export const ESTADO_PRODUCCION = "en_produccion";
export const ESTADO_COMPLETADA = "completada";

export const ETIQUETAS_ESTADO: Record<string, string> = {
  [ESTADO_PENDIENTE]: "Pendiente",
  [ESTADO_PRODUCCION]: "En producción",
  [ESTADO_COMPLETADA]: "Completada",
};

export type VersionOpcion = {
  id: number;
  numero: number;
  estado: string;
};

export type ProductoOpcion = {
  id: number;
  codigo: string;
  nombre: string;
  versiones: VersionOpcion[];
  receta_plc: string;
  id_envase: number | null;
  codigo_envase: string;
  envase: string;
  capacidad_kg: number;
  id_etiqueta: number | null;
  codigo_etiqueta: string;
  nombre_etiqueta: string;
  categoria: string;
};

export type SolicitudVista = {
  id: number | null;
  fecha_registro: string | null;
  fecha_estimada: string | null;
  fecha_fin: string | null;
  orden_compra: string;
  lote: string;
  orden_produccion: string;
  id_producto: number | null;
  id_version: number | null;
  id_envase: number | null;
  id_etiqueta: number | null;
  codigo_producto: string;
  producto: string;
  categoria: string;
  receta_plc: string;
  version: string;
  presentacion: string;
  envase: string;
  codigo_envase: string;
  capacidad_kg: number;
  nombre_etiqueta: string;
  codigo_etiqueta: string;
  etiqueta_unidad: string;
  unidades_por_pallets: number;
  peso_unitario: number;
  pallets_solicitados: number;
  unidades_solicitadas: number;
  kg_solicitados: number;
  pallets_cargados: number;
  unidades_cargadas: number;
  kg_cargados: number;
  pallets_pendientes: number;
  unidades_pendientes: number;
  kg_pendientes: number;
  progreso: number;
  progreso_real: number;
  excedente_kg: number;
  estado: string;
  estado_etiqueta: string;
  tiene_produccion: boolean;
  fuente_cargado: string;
};

export type ResumenSolicitudes = {
  total: number;
  pendientes: number;
  en_produccion: number;
  completadas: number;
};

export function clave(valor: unknown): string {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function texto(valor: unknown): string {
  if (valor == null) return "";
  return String(valor).trim();
}

export function numero(valor: unknown): number {
  if (valor == null || valor === "") return 0;
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
  const s = String(valor).trim().replace(/\s/g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export function idEntero(valor: unknown): number | null {
  if (valor == null || valor === "") return null;
  const n = Number(valor);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

/** Parsea fechas ISO, dd/mm/yyyy o serial Excel. */
export function aFecha(valor: unknown): string | null {
  if (valor == null || valor === "") return null;
  if (typeof valor === "number" && valor > 20000 && valor < 80000) {
    // Serial Excel → fecha UTC aprox.
    const epoch = Date.UTC(1899, 11, 30);
    const d = new Date(epoch + valor * 86400000);
    return d.toISOString().slice(0, 10);
  }
  const s = String(valor).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    return `${m[3]}-${mm}-${dd}`;
  }
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return new Date(t).toISOString().slice(0, 10);
  return null;
}

export function fechaVisible(iso: string | null): string {
  if (!iso) return "—";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export function nroVisible(valor: number, decimales = 0): string {
  const n = Math.max(0, Number(valor) || 0);
  if (decimales === 0 || Math.abs(n - Math.round(n)) < 0.05) {
    return Math.round(n).toLocaleString("es-AR");
  }
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

export function etiquetaUnidad(presentacion: string): string {
  const n = clave(presentacion);
  if (n.includes("big bag") || n.includes("bigbag")) return "Big Bags";
  if (n.includes("bolsa")) return "Bolsas";
  return texto(presentacion) || "unidades";
}

export function sugerirPresentacion(
  presentacion: string,
  capacidadKg = 0,
): { upp: number; peso: number } {
  let peso = capacidadKg > 0 ? capacidadKg : 0;
  if (peso <= 0 && presentacion.includes("*")) {
    const cola = presentacion.split("*").pop() || "";
    peso = numero(cola.replace(/kg/gi, ""));
  }
  const n = clave(presentacion);
  if (n.includes("big bag") || n.includes("bigbag")) return { upp: 1, peso };
  if (n.includes("bolsa")) return { upp: 50, peso: peso > 0 ? peso : 25 };
  return { upp: 1, peso };
}

export function enriquecerSolicitud(
  fila: Record<string, unknown>,
  porSolicitud: Map<number, { pallets: number; unidades: number; kg: number }>,
  productos: Map<number, Record<string, unknown>>,
  versiones: Map<number, Record<string, unknown>>,
  envases: Map<number, Record<string, unknown>>,
  etiquetas: Map<number, Record<string, unknown>>,
): SolicitudVista {
  const lote = texto(fila.lote);
  let upp = numero(fila.unidades_por_pallets);
  let pesoU = numero(fila.peso_unitario);
  let palletsSol = Math.max(0, numero(fila.pallets_cargados));
  let unidadesSol = Math.max(0, numero(fila.unidades_cargadas));
  if (unidadesSol <= 0 && palletsSol > 0 && upp > 0) unidadesSol = palletsSol * upp;
  if (palletsSol <= 0 && unidadesSol > 0 && upp > 0) palletsSol = unidadesSol / upp;
  let kgSol = Math.max(0, numero(fila.peso_total));
  if (kgSol <= 0 && unidadesSol > 0 && pesoU > 0) kgSol = unidadesSol * pesoU;

  const idSolicitud = idEntero(fila.id);
  const prod =
    idSolicitud != null ? porSolicitud.get(idSolicitud) : undefined;
  const tieneProduccion = prod != null;

  let fuente: string;
  let palletsCarg: number;
  let unidadesCarg: number;
  let kgCarg: number;
  let palletsPend: number;
  let unidadesPend: number;
  let kgPend: number;
  let excedente: number;

  if (tieneProduccion && prod) {
    fuente = "produccion";
    palletsCarg = Math.max(0, prod.pallets);
    unidadesCarg = Math.max(0, prod.unidades);
    kgCarg = Math.max(0, prod.kg);
    palletsPend = Math.max(0, palletsSol - palletsCarg);
    unidadesPend = Math.max(0, unidadesSol - unidadesCarg);
    kgPend = Math.max(0, kgSol - kgCarg);
    excedente = kgSol > 0 ? Math.max(0, kgCarg - kgSol) : 0;
  } else {
    fuente = "solicitud";
    palletsPend = Math.max(0, numero(fila.pallets_pendientes));
    palletsCarg = Math.max(0, palletsSol - palletsPend);
    if (upp > 0) unidadesPend = palletsPend * upp;
    else if (palletsSol > 0)
      unidadesPend = unidadesSol * (palletsPend / palletsSol);
    else unidadesPend = 0;
    unidadesCarg = Math.max(0, unidadesSol - unidadesPend);
    if (pesoU > 0) kgPend = palletsPend * (upp > 0 ? upp : 1) * pesoU;
    else if (unidadesSol > 0)
      kgPend = kgSol * (unidadesPend / unidadesSol);
    else kgPend = 0;
    kgCarg = Math.max(0, kgSol - kgPend);
    excedente = 0;
  }

  kgPend = Math.max(0, kgPend);
  let progresoReal =
    kgSol <= 0 ? 0 : (kgCarg / kgSol) * 100;
  if (kgSol <= 0 && unidadesSol > 0)
    progresoReal = (unidadesCarg / unidadesSol) * 100;
  const progreso = Math.max(0, Math.min(100, progresoReal));

  let estado: string;
  if (
    kgPend <= 0.01 &&
    unidadesPend <= 0.01 &&
    palletsPend <= 0.01 &&
    (kgSol > 0 || unidadesSol > 0 || palletsSol > 0)
  ) {
    estado = ESTADO_COMPLETADA;
  } else if (kgCarg > 0.01 || unidadesCarg > 0.01 || tieneProduccion) {
    estado = ESTADO_PRODUCCION;
  } else {
    estado = ESTADO_PENDIENTE;
  }

  const idProducto = idEntero(fila.id_producto);
  const idVersion = idEntero(fila.id_version);
  const producto = idProducto != null ? productos.get(idProducto) ?? {} : {};
  const version = idVersion != null ? versiones.get(idVersion) ?? {} : {};
  const idEnvase = idEntero(producto.id_envase);
  const idEtiqueta = idEntero(producto.id_etiqueta);
  const envase = idEnvase != null ? envases.get(idEnvase) ?? {} : {};
  const etiqueta = idEtiqueta != null ? etiquetas.get(idEtiqueta) ?? {} : {};
  const nombreEnvase = texto(envase.envase);
  const capacidad = numero(envase.capacidad_carga_kg);
  if (pesoU <= 0 && capacidad > 0) pesoU = capacidad;
  const nroVersion = idEntero(version.version);

  return {
    id: idSolicitud,
    fecha_registro: aFecha(fila.fecha_registro),
    fecha_estimada: aFecha(fila.fecha_estimada),
    fecha_fin: aFecha(fila.fecha_fin),
    orden_compra: texto(fila.orden_compra),
    lote,
    orden_produccion: texto(fila.orden_produccion),
    id_producto: idProducto,
    id_version: idVersion,
    id_envase: idEnvase,
    id_etiqueta: idEtiqueta,
    codigo_producto: texto(producto.codigo),
    producto: texto(producto.producto),
    categoria: texto(producto.categoria),
    receta_plc: (() => {
      const n = idEntero(producto.receta_PLC);
      return n != null ? String(n) : texto(producto.receta_PLC);
    })(),
    version: nroVersion == null ? "" : String(nroVersion),
    presentacion: nombreEnvase,
    envase: nombreEnvase,
    codigo_envase: texto(envase.codigo),
    capacidad_kg: capacidad,
    nombre_etiqueta: texto(etiqueta.etiqueta),
    codigo_etiqueta: texto(etiqueta.codigo),
    etiqueta_unidad: etiquetaUnidad(nombreEnvase),
    unidades_por_pallets: upp,
    peso_unitario: pesoU,
    pallets_solicitados: palletsSol,
    unidades_solicitadas: unidadesSol,
    kg_solicitados: kgSol,
    pallets_cargados: palletsCarg,
    unidades_cargadas: unidadesCarg,
    kg_cargados: kgCarg,
    pallets_pendientes: palletsPend,
    unidades_pendientes: unidadesPend,
    kg_pendientes: kgPend,
    progreso,
    progreso_real: progresoReal,
    excedente_kg: excedente,
    estado,
    estado_etiqueta: ETIQUETAS_ESTADO[estado],
    tiene_produccion: tieneProduccion,
    fuente_cargado: fuente,
  };
}

export function ordenarSolicitudes(items: SolicitudVista[]): SolicitudVista[] {
  const prioridad: Record<string, number> = {
    [ESTADO_PENDIENTE]: 0,
    [ESTADO_PRODUCCION]: 1,
    [ESTADO_COMPLETADA]: 2,
  };
  return [...items].sort((a, b) => {
    const ga = prioridad[a.estado] ?? 9;
    const gb = prioridad[b.estado] ?? 9;
    if (ga !== gb) return ga - gb;
    if (a.estado === ESTADO_COMPLETADA) {
      const fa = a.fecha_fin || a.fecha_registro || "";
      const fb = b.fecha_fin || b.fecha_registro || "";
      if (fa !== fb) return fb.localeCompare(fa);
      return (b.id || 0) - (a.id || 0);
    }
    const ra = a.fecha_registro || "9999";
    const rb = b.fecha_registro || "9999";
    if (ra !== rb) return ra.localeCompare(rb);
    return (a.id || 0) - (b.id || 0);
  });
}

export function filtrarSolicitudes(
  items: SolicitudVista[],
  opts: {
    estado?: string;
    producto?: string;
    busqueda?: string;
    soloPendientes?: boolean;
    fechaDesde?: string | null;
    fechaHasta?: string | null;
  },
): SolicitudVista[] {
  const termino = clave(opts.busqueda || "");
  let estadoFiltro: string | null = null;
  const e = clave(opts.estado || "");
  if (e && e !== "todos") {
    if (e.includes("produccion") || e.includes("producción"))
      estadoFiltro = ESTADO_PRODUCCION;
    else if (e.includes("completa")) estadoFiltro = ESTADO_COMPLETADA;
    else if (e.includes("pendiente")) estadoFiltro = ESTADO_PENDIENTE;
  }

  return items.filter((item) => {
    if (estadoFiltro && item.estado !== estadoFiltro) return false;
    if (opts.soloPendientes && item.estado === ESTADO_COMPLETADA) return false;
    const fecha =
      item.fecha_estimada || item.fecha_fin || item.fecha_registro;
    if (opts.fechaDesde && (!fecha || fecha < opts.fechaDesde)) return false;
    if (opts.fechaHasta && (!fecha || fecha > opts.fechaHasta)) return false;
    if (
      opts.producto &&
      opts.producto !== "Todos" &&
      opts.producto !== "" &&
      texto(item.producto) !== opts.producto
    )
      return false;
    if (termino) {
      const campos = [
        item.codigo_producto,
        item.producto,
        item.lote,
        item.orden_compra,
        item.orden_produccion,
        item.envase,
        item.nombre_etiqueta,
      ];
      if (!campos.some((c) => clave(c).includes(termino))) return false;
    }
    return true;
  });
}

export function resumenSolicitudes(
  items: SolicitudVista[],
): ResumenSolicitudes {
  const r: ResumenSolicitudes = {
    total: items.length,
    pendientes: 0,
    en_produccion: 0,
    completadas: 0,
  };
  for (const item of items) {
    if (item.estado === ESTADO_PENDIENTE) r.pendientes++;
    else if (item.estado === ESTADO_PRODUCCION) r.en_produccion++;
    else if (item.estado === ESTADO_COMPLETADA) r.completadas++;
  }
  return r;
}

export function armarFilaGuardar(
  datos: {
    orden_compra: string;
    lote: string;
    orden_produccion: string;
    id_producto: number;
    id_version: number;
    pallets: number;
    unidades_por_pallets: number;
    peso_unitario: number;
    unidades: number;
    fecha_registro: string;
    fecha_estimada: string;
    fecha_fin?: string | null;
    pallets_pendientes?: number | null;
  },
  idRegistro: number,
): Record<string, unknown> {
  let upp = numero(datos.unidades_por_pallets);
  const pesoU = numero(datos.peso_unitario);
  let unidades = numero(datos.unidades);
  let pallets = numero(datos.pallets);
  if (unidades <= 0 && pallets > 0 && upp > 0) unidades = pallets * upp;
  if (pallets <= 0 && unidades > 0 && upp > 0) pallets = unidades / upp;
  if (pallets <= 0 && unidades > 0) pallets = unidades;
  let kg = unidades * pesoU;
  const fechaReg = aFecha(datos.fecha_registro) || new Date().toISOString().slice(0, 10);
  const fechaEst = aFecha(datos.fecha_estimada) || fechaReg;
  const pendientes =
    datos.pallets_pendientes != null
      ? Math.max(0, numero(datos.pallets_pendientes))
      : pallets;

  const oc = texto(datos.orden_compra);
  const op = texto(datos.orden_produccion);

  return {
    id: idRegistro,
    fecha_registro: `${fechaReg} 00:00:00`,
    orden_compra: /^\d+$/.test(oc) ? Number(oc) : oc || null,
    lote: texto(datos.lote),
    orden_produccion: /^\d+$/.test(op) ? Number(op) : op || null,
    id_producto: datos.id_producto,
    id_version: datos.id_version,
    pallets_cargados: pallets,
    unidades_por_pallets: upp > 0 ? upp : null,
    peso_unitario: pesoU > 0 ? pesoU : null,
    unidades_cargadas: unidades,
    peso_total: kg,
    fecha_estimada: `${fechaEst} 00:00:00`,
    fecha_fin: `${aFecha(datos.fecha_fin) || fechaEst} 00:00:00`,
    pallets_pendientes: pendientes,
  };
}

export function validarDatosSolicitud(
  datos: {
    id_producto?: number | null;
    producto?: string;
    lote?: string;
    orden_compra?: string;
    id_envase?: number | null;
    fecha_registro?: string;
    fecha_estimada?: string;
    unidades?: number;
    pallets?: number;
    peso_unitario?: number;
    unidades_por_pallets?: number;
    id_version?: number | null;
  },
  lotesExistentes: { id: number; lote: string }[],
  idEdicion: number | null,
): string[] {
  const errores: string[] = [];
  if (idEntero(datos.id_producto) == null && !texto(datos.producto)) {
    errores.push("Seleccioná un producto del catálogo.");
  }
  const lote = texto(datos.lote);
  if (!lote) errores.push("Ingresá el lote.");
  if (!texto(datos.orden_compra))
    errores.push("Ingresá la orden de compra / SAP.");
  if (idEntero(datos.id_envase) == null)
    errores.push(
      "El producto seleccionado no tiene envase asignado en el catálogo.",
    );
  if (!aFecha(datos.fecha_registro))
    errores.push("La fecha de registro no es válida.");
  if (!aFecha(datos.fecha_estimada))
    errores.push("La fecha estimada de finalización no es válida.");
  const cantidad = numero(datos.unidades);
  const pallets = numero(datos.pallets);
  const peso = numero(datos.peso_unitario);
  const upp = numero(datos.unidades_por_pallets);
  if (cantidad <= 0 && pallets <= 0)
    errores.push("La cantidad solicitada debe ser mayor a 0.");
  if (peso < 0) errores.push("El peso unitario no puede ser negativo.");
  if (upp < 0) errores.push("Las unidades por pallet no pueden ser negativas.");
  if (idEntero(datos.id_version) == null)
    errores.push("Indicá la versión del producto.");
  if (lote && clave(lote) !== "pendiente") {
    const dup = lotesExistentes.some(
      (f) =>
        clave(f.lote) === clave(lote) &&
        (idEdicion == null || f.id !== idEdicion),
    );
    if (dup) errores.push(`Ya existe una solicitud con el lote ${lote}.`);
  }
  return errores;
}

export function colorEstado(estado: string): string {
  if (estado === ESTADO_COMPLETADA) return "g-badge g-badge-success";
  if (estado === ESTADO_PRODUCCION) return "g-badge g-badge-warning";
  return "g-badge g-badge-neutral";
}
