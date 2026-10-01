import { nroDec } from "@/lib/produccion/logic";
import {
  aFecha,
  clave,
  fechaVisible,
  idEntero,
  numero,
  texto,
} from "@/lib/solicitudes/logic";
import type { FilaConsumoIa } from "@/lib/consultas-ia/tipos";

type Ingrediente = {
  id: number;
  codigo: string;
  nombre: string;
  unidad: string;
};

type Articulo = {
  id: number;
  tipo: string;
  idOrigen: number | null;
};

type Consumo = {
  fecha: string | null;
  idArticulo: number | null;
  cantidad: number;
};

export function armarIngredientes(filas: Record<string, unknown>[]): Ingrediente[] {
  const lista: Ingrediente[] = [];
  for (const fila of filas) {
    const id = idEntero(fila.id);
    if (id == null) continue;
    lista.push({
      id,
      codigo: texto(fila.codigo),
      nombre: texto(fila.ingrediente),
      unidad: texto(fila.medida),
    });
  }
  return lista;
}

export function armarArticulos(filas: Record<string, unknown>[]): Articulo[] {
  const lista: Articulo[] = [];
  for (const fila of filas) {
    const id = idEntero(fila.id);
    if (id == null) continue;
    lista.push({
      id,
      tipo: clave(fila.tipo_articulo),
      idOrigen: idEntero(fila.id_origen),
    });
  }
  return lista;
}

export function armarConsumos(filas: Record<string, unknown>[]): Consumo[] {
  return filas.map((fila) => ({
    fecha: aFecha(fila.fecha_registro),
    idArticulo: idEntero(fila.id_articulo),
    cantidad: numero(fila.cantidad),
  }));
}

function coincidencias(pedido: string, ingredientes: Ingrediente[]): Ingrediente[] {
  const p = clave(pedido);
  if (!p) return [];
  const exactos = ingredientes.filter(
    (item) => p === clave(item.codigo) || p === clave(item.nombre),
  );
  if (exactos.length) return exactos;
  if (p.length < 3) return [];
  return ingredientes.filter((item) => {
    const nombre = clave(item.nombre);
    const codigo = clave(item.codigo);
    return nombre.includes(p) || codigo.includes(p);
  });
}

export function sumarConsumo(input: {
  pedidos: string[];
  desde: string;
  hasta: string;
  ingredientes: Ingrediente[];
  articulos: Articulo[];
  consumos: Consumo[];
}): FilaConsumoIa[] {
  const artsPorIng = new Map<number, Set<number>>();
  for (const art of input.articulos) {
    if (art.tipo !== "ingrediente" || art.idOrigen == null) continue;
    const set = artsPorIng.get(art.idOrigen) ?? new Set<number>();
    set.add(art.id);
    artsPorIng.set(art.idOrigen, set);
  }

  const filas: FilaConsumoIa[] = [];
  const vistos = new Set<string>();

  if (!input.pedidos.length) {
    for (const ing of input.ingredientes) {
      const fila = filaDeIngrediente(ing, "Todos", artsPorIng, input);
      if (fila.registros > 0) filas.push(fila);
    }
    filas.sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, "es"));
    return filas;
  }

  for (const pedido of input.pedidos) {
    const matches = coincidencias(pedido, input.ingredientes);
    if (!matches.length) {
      filas.push({
        pedido,
        codigo: "",
        nombre: "",
        cantidad: 0,
        unidad: "",
        registros: 0,
        estado: "no_encontrado",
      });
      continue;
    }

    for (const ing of matches) {
      const marca = `${clave(pedido)}:${ing.id}`;
      if (vistos.has(marca)) continue;
      vistos.add(marca);
      filas.push(filaDeIngrediente(ing, pedido, artsPorIng, input));
    }
  }

  return filas;
}

function filaDeIngrediente(
  ing: Ingrediente,
  pedido: string,
  artsPorIng: Map<number, Set<number>>,
  input: { desde: string; hasta: string; consumos: Consumo[] },
): FilaConsumoIa {
  const arts = artsPorIng.get(ing.id) ?? new Set<number>();
  let cantidad = 0;
  let registros = 0;
  for (const consumo of input.consumos) {
    if (consumo.idArticulo == null || !arts.has(consumo.idArticulo)) continue;
    if (!consumo.fecha || consumo.fecha < input.desde || consumo.fecha > input.hasta) continue;
    cantidad += consumo.cantidad;
    registros += 1;
  }
  return {
    pedido,
    codigo: ing.codigo,
    nombre: ing.nombre,
    cantidad: Math.round(cantidad * 1000) / 1000,
    unidad: ing.unidad,
    registros,
    estado: "ok",
  };
}

export function resumenLocal(filas: FilaConsumoIa[], desde: string, hasta: string): string {
  if (!filas.length) {
    return `No hubo consumo de ingredientes en producción entre el ${fechaVisible(desde)} y el ${fechaVisible(hasta)}.`;
  }
  const ok = filas.filter((fila) => fila.estado === "ok");
  if (ok.length > 8) {
    return `Consumo en producción del ${fechaVisible(desde)} al ${fechaVisible(hasta)}: ${ok.length} ingredientes. El detalle está en la tabla.`;
  }
  const partes = filas.map((fila) => {
    if (fila.estado === "no_encontrado") {
      return `«${fila.pedido}» no está en el catálogo`;
    }
    const quien = fila.nombre || fila.codigo || fila.pedido;
    const unidad = fila.unidad || "u.";
    return `${quien}: ${nroDec(fila.cantidad, 3)} ${unidad}`;
  });
  return `Consumo en producción del ${fechaVisible(desde)} al ${fechaVisible(hasta)}: ${partes.join("; ")}.`;
}

export function tablaConsumo(filas: FilaConsumoIa[]): { columnas: string[]; filas: string[][] } {
  return {
    columnas: ["Pedido", "Código", "Ingrediente", "Cantidad", "Unidad", "Registros"],
    filas: filas.map((fila) => [
      fila.pedido,
      fila.codigo || "—",
      fila.estado === "no_encontrado" ? "No está en el catálogo" : fila.nombre || "—",
      fila.estado === "ok" ? nroDec(fila.cantidad, 3) : "—",
      fila.unidad || "—",
      fila.estado === "ok" ? String(fila.registros) : "—",
    ]),
  };
}
