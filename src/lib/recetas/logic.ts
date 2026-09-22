import {
  aFecha,
  clave,
  idEntero,
  nroVisible,
  numero,
  texto,
} from "@/lib/solicitudes/logic";

export const ESTADO_ACTIVO = "activo";
export const ESTADO_INACTIVO = "inactivo";

export const TIPOS_INGREDIENTE = ["macro", "micro"] as const;

export const ETIQUETAS_TIPO: Record<string, string> = {
  macro: "Macro",
  micro: "Micro",
};

export type OpcionProducto = {
  id: number;
  codigo: string;
  nombre: string;
};

export type OpcionIngrediente = {
  id: number;
  codigo: string;
  nombre: string;
  estado: string;
  activo: boolean;
};

export type LineaReceta = {
  id: number;
  fecha_registro: string;
  id_version: number;
  tipo: string;
  tipo_etiqueta: string;
  puesto: number;
  id_ingrediente: number | null;
  codigo_ingrediente: string;
  ingrediente: string;
  participacion: number;
  participacion_pct: number;
};

export type VersionVista = {
  id: number;
  fecha_registro: string;
  numero: number;
  estado: string;
  estado_etiqueta: string;
  id_producto: number | null;
  codigo_producto: string;
  producto: string;
  lineas: LineaReceta[];
  participacion_total: number;
};

export type DatosVersionForm = {
  fecha_registro: string;
  id_producto: string;
  version: string;
  estado: string;
};

export type DatosLineaForm = {
  fecha_registro: string;
  id_version: number;
  id_ingrediente: string;
  tipo: string;
  puesto: string;
  participacion: string;
};

export function estadoClave(valor: unknown): string {
  const n = clave(valor);
  if (n === "activo" || n === "activa") return ESTADO_ACTIVO;
  if (n === "inactivo" || n === "inactiva") return ESTADO_INACTIVO;
  return n;
}

export function etiquetaEstado(estado: string): string {
  if (estado === ESTADO_ACTIVO) return "Activo";
  if (estado === ESTADO_INACTIVO) return "Inactivo";
  return estado || "—";
}

export function tipoClave(valor: unknown): string {
  const n = clave(valor);
  if (n === "macro" || n === "micro") return n;
  if (n === "macroingrediente") return "macro";
  return n;
}

export function participacionPct(fraccion: number): number {
  return Math.round(fraccion * 10000) / 100;
}

export function armarVersiones(
  versiones: Record<string, unknown>[],
  lineas: Record<string, unknown>[],
  productos: Record<string, unknown>[],
  ingredientes: Record<string, unknown>[],
): {
  versiones: VersionVista[];
  productos: OpcionProducto[];
  ingredientes: OpcionIngrediente[];
} {
  const productosOp: OpcionProducto[] = [];
  const productosMap = new Map<number, OpcionProducto>();
  for (const fila of productos) {
    const id = idEntero(fila.id);
    const nombre = texto(fila.producto);
    if (id == null || !nombre) continue;
    const item = { id, codigo: texto(fila.codigo), nombre };
    productosOp.push(item);
    productosMap.set(id, item);
  }
  productosOp.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  const ingredientesOp: OpcionIngrediente[] = [];
  const ingredientesMap = new Map<number, OpcionIngrediente>();
  for (const fila of ingredientes) {
    const id = idEntero(fila.id);
    const nombre = texto(fila.ingrediente);
    if (id == null || !nombre) continue;
    const estado = texto(fila.estado);
    const n = clave(estado);
    const item = {
      id,
      codigo: texto(fila.codigo),
      nombre,
      estado,
      activo: n === "" || n === "activo",
    };
    ingredientesOp.push(item);
    ingredientesMap.set(id, item);
  }
  ingredientesOp.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  const porVersion = new Map<number, LineaReceta[]>();
  for (const fila of lineas) {
    const idVersion = idEntero(fila.id_version);
    const id = idEntero(fila.id);
    if (idVersion == null || id == null) continue;
    const idIng = idEntero(fila.id_ingrediente);
    const ing = idIng != null ? ingredientesMap.get(idIng) : undefined;
    const tipo = texto(fila.tipo_ingrediente);
    const tipoN = tipoClave(tipo);
    const fraccion = numero(fila.participacion);
    const linea: LineaReceta = {
      id,
      fecha_registro: texto(fila.fecha_registro),
      id_version: idVersion,
      tipo: tipoN || tipo,
      tipo_etiqueta: ETIQUETAS_TIPO[tipoN] || tipo || "—",
      puesto: idEntero(fila.puesto) ?? 0,
      id_ingrediente: idIng,
      codigo_ingrediente: ing?.codigo ?? "",
      ingrediente: ing?.nombre ?? "",
      participacion: fraccion,
      participacion_pct: participacionPct(fraccion),
    };
    const lista = porVersion.get(idVersion) ?? [];
    lista.push(linea);
    porVersion.set(idVersion, lista);
  }
  for (const lista of porVersion.values()) {
    lista.sort(
      (a, b) => a.puesto - b.puesto || a.tipo.localeCompare(b.tipo, "es") || a.id - b.id,
    );
  }

  const vistas: VersionVista[] = [];
  for (const fila of versiones) {
    const id = idEntero(fila.id);
    const idProd = idEntero(fila.id_producto);
    if (id == null && idProd == null) continue;
    if (id == null) continue;
    const producto = idProd != null ? productosMap.get(idProd) : undefined;
    const estado = estadoClave(fila.estado);
    const lineasVer = porVersion.get(id) ?? [];
    const total = Math.round(
      lineasVer.reduce((acc, l) => acc + l.participacion, 0) * 10000,
    ) / 100;
    vistas.push({
      id,
      fecha_registro: texto(fila.fecha_registro),
      numero: idEntero(fila.version) ?? 0,
      estado,
      estado_etiqueta: etiquetaEstado(estado),
      id_producto: idProd,
      codigo_producto: producto?.codigo ?? "",
      producto: producto?.nombre ?? "",
      lineas: lineasVer,
      participacion_total: total,
    });
  }
  vistas.sort(
    (a, b) =>
      a.producto.localeCompare(b.producto, "es") || a.numero - b.numero || a.id - b.id,
  );
  return { versiones: vistas, productos: productosOp, ingredientes: ingredientesOp };
}

export function filtrarVersiones(
  versiones: VersionVista[],
  filtros: {
    producto: string;
    estado: string;
    busqueda: string;
    soloSinFormula: boolean;
  },
): VersionVista[] {
  const productoN = clave(filtros.producto);
  const estadoN = clave(filtros.estado);
  const termino = clave(filtros.busqueda);
  return versiones.filter((item) => {
    if (productoN && productoN !== "todos" && clave(item.producto) !== productoN) {
      return false;
    }
    if (estadoN && estadoN !== "todos") {
      if (estadoN === "activo" && item.estado !== ESTADO_ACTIVO) return false;
      if (estadoN === "inactivo" && item.estado === ESTADO_ACTIVO) return false;
    }
    if (filtros.soloSinFormula && item.lineas.length > 0) return false;
    if (!termino) return true;
    const campos = [
      item.codigo_producto,
      item.producto,
      item.numero ? String(item.numero) : "",
      item.estado_etiqueta,
      ...item.lineas.flatMap((l) => [l.codigo_ingrediente, l.ingrediente, l.tipo_etiqueta]),
    ];
    return campos.some((c) => clave(c).includes(termino));
  });
}

export function resumenVersiones(versiones: VersionVista[]) {
  return versiones.reduce(
    (acc, item) => {
      acc.total += 1;
      if (item.estado === ESTADO_ACTIVO) acc.activas += 1;
      else acc.inactivas += 1;
      if (item.lineas.length === 0) acc.sin_formula += 1;
      return acc;
    },
    { total: 0, activas: 0, inactivas: 0, sin_formula: 0 },
  );
}

export function siguienteNumero(versiones: VersionVista[], idProducto: number): number {
  let mayor = 0;
  for (const item of versiones) {
    if (item.id_producto === idProducto && item.numero > mayor) mayor = item.numero;
  }
  return mayor + 1;
}

export function validarVersion(
  datos: DatosVersionForm,
  versiones: VersionVista[],
  idEdicion?: number,
): string[] {
  const errores: string[] = [];
  const idProd = idEntero(datos.id_producto);
  if (idProd == null) errores.push("Seleccioná un producto.");
  const nro = idEntero(datos.version);
  if (nro == null || nro <= 0) {
    errores.push("La versión tiene que ser un número mayor a 0.");
  }
  const estado = estadoClave(datos.estado);
  if (estado !== ESTADO_ACTIVO && estado !== ESTADO_INACTIVO) {
    errores.push("Seleccioná si está activa o inactiva.");
  }
  if (idProd != null && nro != null && nro > 0) {
    const dup = versiones.some(
      (v) =>
        v.id !== idEdicion && v.id_producto === idProd && v.numero === nro,
    );
    if (dup) errores.push("Ese producto ya tiene esa versión.");
  }
  return errores;
}

export function validarLinea(datos: DatosLineaForm): string[] {
  const errores: string[] = [];
  if (datos.id_version == null) errores.push("Falta la versión de la receta.");
  if (idEntero(datos.id_ingrediente) == null) errores.push("Seleccioná un ingrediente.");
  if (!TIPOS_INGREDIENTE.includes(tipoClave(datos.tipo) as (typeof TIPOS_INGREDIENTE)[number])) {
    errores.push("El tipo tiene que ser macro o micro.");
  }
  const puesto = idEntero(datos.puesto);
  if (puesto == null || puesto <= 0) {
    errores.push("El puesto tiene que ser un número mayor a 0.");
  }
  const pct = numero(datos.participacion);
  if (!texto(datos.participacion) || pct <= 0) {
    errores.push("La participación tiene que ser mayor a 0.");
  }
  return errores;
}

export function filaVersion(datos: DatosVersionForm, id: number) {
  const estado = estadoClave(datos.estado);
  return {
    id,
    fecha_registro: aFecha(datos.fecha_registro) ?? hoyIso(),
    version: String(idEntero(datos.version)),
    id_producto: idEntero(datos.id_producto),
    estado: etiquetaEstado(estado === ESTADO_INACTIVO ? ESTADO_INACTIVO : ESTADO_ACTIVO),
  };
}

export function filaLinea(datos: DatosLineaForm, id: number) {
  const pct = numero(datos.participacion);
  return {
    id,
    fecha_registro: aFecha(datos.fecha_registro) ?? hoyIso(),
    id_version: datos.id_version,
    tipo_ingrediente: tipoClave(datos.tipo),
    puesto: String(idEntero(datos.puesto)),
    id_ingrediente: idEntero(datos.id_ingrediente),
    participacion: Math.round((pct / 100) * 1000000) / 1000000,
  };
}

export function hoyIso() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dia}`;
}

export function etiquetaOpcion(codigo: string, nombre: string) {
  return codigo ? `${codigo}  —  ${nombre}` : nombre;
}

export function pctTexto(pct: number) {
  return `${nroVisible(pct, 2)} %`;
}
