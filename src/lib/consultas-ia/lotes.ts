import { nroDec } from "@/lib/produccion/logic";
import {
  aFecha,
  clave,
  fechaVisible,
  idEntero,
  numero,
  texto,
} from "@/lib/solicitudes/logic";

export type CualLote = "primero" | "ultimo" | "todos";

type Jornada = { id: number; fecha: string; idSolicitud: number; kg: number };
type Solicitud = {
  id: number;
  lote: string;
  orden: string;
  idProducto: number | null;
  cliente: string;
};

export type FilaLoteIa = {
  fecha: string;
  lote: string;
  orden: string;
  producto: string;
  cliente: string;
  kg: number;
  jornadas: number;
};

export function cualLote(valor: unknown): CualLote | null {
  const t = clave(valor);
  if (t === "primero" || t === "primer") return "primero";
  if (t === "ultimo") return "ultimo";
  if (t === "todos" || t === "todo" || t === "listado") return "todos";
  return null;
}

function jornadasDe(filas: Record<string, unknown>[], desde: string, hasta: string): Jornada[] {
  const lista: Jornada[] = [];
  for (const fila of filas) {
    const id = idEntero(fila.id);
    const fecha = aFecha(fila.fecha_registro);
    const idSolicitud = idEntero(fila.id_solicitud);
    if (id == null || !fecha || idSolicitud == null) continue;
    if (fecha < desde || fecha > hasta) continue;
    lista.push({ id, fecha, idSolicitud, kg: numero(fila.peso_kg) });
  }
  lista.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id);
  return lista;
}

function solicitudesDe(filas: Record<string, unknown>[]): Map<number, Solicitud> {
  const mapa = new Map<number, Solicitud>();
  for (const fila of filas) {
    const id = idEntero(fila.id);
    if (id == null) continue;
    mapa.set(id, {
      id,
      lote: texto(fila.lote) || `Solicitud ${id}`,
      orden: texto(fila.orden_produccion),
      idProducto: idEntero(fila.id_producto),
      cliente: texto(fila.cliente),
    });
  }
  return mapa;
}

function productosDe(filas: Record<string, unknown>[]): Map<number, string> {
  const mapa = new Map<number, string>();
  for (const fila of filas) {
    const id = idEntero(fila.id);
    const nombre = texto(fila.producto);
    if (id == null || !nombre) continue;
    mapa.set(id, nombre);
  }
  return mapa;
}

function filaDe(
  solicitud: Solicitud | undefined,
  idSolicitud: number,
  fecha: string,
  kg: number,
  jornadas: number,
  productos: Map<number, string>,
): FilaLoteIa {
  const productoId = solicitud?.idProducto ?? null;
  return {
    fecha,
    lote: solicitud?.lote || `Solicitud ${idSolicitud}`,
    orden: solicitud?.orden || "",
    producto: (productoId != null ? productos.get(productoId) : "") || "",
    cliente: solicitud?.cliente || "",
    kg: Math.round(kg * 1000) / 1000,
    jornadas,
  };
}

export function listarLotes(input: {
  cual: CualLote;
  desde: string;
  hasta: string;
  producciones: Record<string, unknown>[];
  solicitudes: Record<string, unknown>[];
  productos: Record<string, unknown>[];
}): FilaLoteIa[] {
  const jornadas = jornadasDe(input.producciones, input.desde, input.hasta);
  if (!jornadas.length) return [];
  const solicitudes = solicitudesDe(input.solicitudes);
  const productos = productosDe(input.productos);

  if (input.cual === "primero" || input.cual === "ultimo") {
    const jornada = input.cual === "primero" ? jornadas[0] : jornadas[jornadas.length - 1];
    return [
      filaDe(
        solicitudes.get(jornada.idSolicitud),
        jornada.idSolicitud,
        jornada.fecha,
        jornada.kg,
        1,
        productos,
      ),
    ];
  }

  const grupos = new Map<number, { fecha: string; kg: number; jornadas: number }>();
  for (const jornada of jornadas) {
    const grupo = grupos.get(jornada.idSolicitud);
    if (!grupo) {
      grupos.set(jornada.idSolicitud, { fecha: jornada.fecha, kg: jornada.kg, jornadas: 1 });
      continue;
    }
    grupo.kg += jornada.kg;
    grupo.jornadas += 1;
  }

  return [...grupos.entries()]
    .map(([idSolicitud, grupo]) =>
      filaDe(solicitudes.get(idSolicitud), idSolicitud, grupo.fecha, grupo.kg, grupo.jornadas, productos),
    )
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.lote.localeCompare(b.lote, "es"));
}

export function resumenLotes(filas: FilaLoteIa[], cual: CualLote, desde: string, hasta: string): string {
  const periodo = `del ${fechaVisible(desde)} al ${fechaVisible(hasta)}`;
  if (!filas.length) return `No hay jornadas de producción ${periodo}.`;
  const fila = filas[0];
  const producto = fila.producto ? `, ${fila.producto}` : "";
  if (cual === "primero") {
    return `El primer lote elaborado ${periodo} fue ${fila.lote}${producto}, el ${fechaVisible(fila.fecha)}, con ${nroDec(fila.kg, 3)} kg.`;
  }
  if (cual === "ultimo") {
    return `El último lote elaborado ${periodo} fue ${fila.lote}${producto}, el ${fechaVisible(fila.fecha)}, con ${nroDec(fila.kg, 3)} kg.`;
  }
  if (filas.length > 4) {
    return `Entre ${fechaVisible(desde)} y ${fechaVisible(hasta)} se elaboraron ${filas.length} lotes. El primero fue ${fila.lote}${producto}, el ${fechaVisible(fila.fecha)}.`;
  }
  const partes = filas.map(
    (item) => `${item.lote} (${fechaVisible(item.fecha)}, ${nroDec(item.kg, 3)} kg)`,
  );
  return `Lotes elaborados ${periodo}: ${partes.join("; ")}.`;
}

export function tablaLotes(filas: FilaLoteIa[]): { columnas: string[]; filas: string[][] } {
  return {
    columnas: ["Fecha", "Lote", "Orden", "Producto", "Kg", "Jornadas", "Cliente"],
    filas: filas.map((fila) => [
      fechaVisible(fila.fecha),
      fila.lote,
      fila.orden || "—",
      fila.producto || "—",
      nroDec(fila.kg, 3),
      String(fila.jornadas),
      fila.cliente || "—",
    ]),
  };
}
