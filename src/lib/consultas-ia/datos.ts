import { createClient } from "@/lib/supabase/server";

async function leer(tabla: string, columnas: string) {
  const supabase = await createClient();
  const page = 1000;
  const all: Record<string, unknown>[] = [];
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase
      .from(tabla)
      .select(columnas)
      .range(from, from + page - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    all.push(...rows);
    if (rows.length < page) break;
  }
  return all;
}

export async function cargarLotesIa() {
  const [producciones, solicitudes, productos] = await Promise.all([
    leer("produccion", "id, fecha_registro, id_solicitud, peso_kg"),
    leer("solicitudes", "id, lote, orden_produccion, id_producto, cliente"),
    leer("catalogo_productos", "id, producto"),
  ]);
  return { producciones, solicitudes, productos };
}

export async function cargarConsultaIa() {
  const [
    ingredientes,
    insumos,
    envases,
    etiquetas,
    productos,
    articulos,
    consumos,
    movIng,
    movIns,
    movEnv,
    movEti,
    movProd,
    producciones,
    solicitudes,
    versiones,
    causas,
    paradasProg,
    paradasNo,
    planMensual,
  ] = await Promise.all([
    leer("catalogo_ingredientes", "id, codigo, ingrediente, medida"),
    leer("catalogo_insumos", "id, codigo, insumo, medida"),
    leer("catalogo_envases", "id, codigo, envase, medida, capacidad_carga_kg"),
    leer("catalogo_etiquetas", "id, codigo, etiqueta, medida"),
    leer("catalogo_productos", "id, codigo, producto, categoria, id_envase, id_etiqueta"),
    leer("catalogo_articulos", "id, tipo_articulo, id_origen, codigo, articulo"),
    leer("consumo", "fecha_registro, id_solicitud, id_articulo, cantidad"),
    leer("movimientos_ingredientes", "tipo, fecha_registro, id_ingrediente, lote, peso_total"),
    leer("movimientos_insumos", "tipo, fecha_registro, id_insumo, insumo, lote, cantidad"),
    leer("movimientos_envases", "tipo, fecha_registro, id_envase, lote, cantidad"),
    leer("movimientos_etiquetas", "tipo, fecha_registro, id_etiqueta, lote, cantidad"),
    leer("movimientos_productos", "tipo, fecha_registro, id_producto, lote, stk_pall, stk_un, stk_kg, observaciones"),
    leer(
      "produccion",
      "id, fecha_registro, id_solicitud, pallets, unidades, peso_kg, hs_disponibles, hs_productivas, hs_paradas_programadas, hs_paradas_no_p",
    ),
    leer("solicitudes", "*"),
    leer("registro_versiones", "id, version"),
    leer("causas_paradas", "id, causa"),
    leer("paradas_programadas", "id, id_produccion, id_causas, tiempo_en_hs"),
    leer("paradas_no_programadas", "id, id_produccion, id_causas, tiempo_en_hs"),
    leer("planificacion_mensual", "fecha, categoria, kg_estimados"),
  ]);
  return {
    ingredientes,
    insumos,
    envases,
    etiquetas,
    productos,
    articulos,
    consumos,
    movIng,
    movIns,
    movEnv,
    movEti,
    movProd,
    producciones,
    solicitudes,
    versiones,
    causas,
    paradasProg,
    paradasNo,
    planMensual,
  };
}

export async function cargarConsumoIa() {
  const [ingredientes, articulos, consumos] = await Promise.all([
    leer("catalogo_ingredientes", "id, codigo, ingrediente, medida"),
    leer("catalogo_articulos", "id, tipo_articulo, id_origen"),
    leer("consumo", "fecha_registro, id_articulo, cantidad"),
  ]);
  return { ingredientes, articulos, consumos };
}
