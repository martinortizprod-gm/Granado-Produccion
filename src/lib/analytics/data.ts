import { createClient, supabaseEnvConfigured } from "@/lib/supabase/server";
import {
  armarJornadas,
  armarPlan,
  type JornadaAnalytics,
  type LineaPlanAnalytics,
} from "@/lib/analytics/logic";
import { armarDatosStock, type DatosStockAnalytics } from "@/lib/analytics/stock";

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

export async function cargarAnalytics(): Promise<{
  jornadas: JornadaAnalytics[];
  plan: LineaPlanAnalytics[];
  stock: DatosStockAnalytics;
  error: string | null;
}> {
  const vacioStock: DatosStockAnalytics = {
    articulos: [],
    movimientos: [],
    consumos: [],
    barridos: [],
  };
  if (!supabaseEnvConfigured()) {
    return { jornadas: [], plan: [], stock: vacioStock, error: "Falta la configuración de conexión." };
  }
  try {
    const [
      producciones,
      solicitudes,
      productos,
      envases,
      causas,
      paradasProg,
      paradasNo,
      mensual,
      ingredientes,
      insumos,
      etiquetas,
      articulos,
      movIng,
      movIns,
      movEnv,
      movEti,
      consumos,
      barridos,
    ] = await Promise.all([
      leer(
        "produccion",
        "id, fecha_registro, id_solicitud, pallets, unidades, peso_kg, hs_disponibles, hs_productivas, hs_paradas_programadas, hs_paradas_no_p, rendimiento_kg_h",
      ),
      leer("solicitudes", "id, fecha_registro, id_producto, lote, orden_produccion"),
      leer("catalogo_productos", "id, producto, categoria, id_envase"),
      leer("catalogo_envases", "id, codigo, envase, categoria, estado, capacidad_carga_kg"),
      leer("causas_paradas", "id, causa"),
      leer("paradas_programadas", "id, id_produccion, id_causas, tiempo_en_hs"),
      leer("paradas_no_programadas", "id, id_produccion, id_causas, tiempo_en_hs"),
      leer("planificacion_mensual", "fecha, categoria, kg_estimados"),
      leer("catalogo_ingredientes", "id, codigo, ingrediente, categoria, estado, gestion, medida"),
      leer("catalogo_insumos", "id, codigo, insumo, categoria, estado, gestion, medida"),
      leer("catalogo_etiquetas", "id, codigo, etiqueta, categoria, estado, gestion, medida"),
      leer("catalogo_articulos", "id, tipo_articulo, id_origen, articulo"),
      leer("movimientos_ingredientes", "id, tipo, fecha_registro, fecha_vencimiento, id_ingrediente, lote, peso_total"),
      leer("movimientos_insumos", "id, tipo, fecha_registro, fecha_vencimiento, id_insumo, insumo, lote, cantidad"),
      leer("movimientos_envases", "id, tipo, fecha_registro, fecha_vencimiento, id_envase, lote, cantidad"),
      leer("movimientos_etiquetas", "id, tipo, fecha_registro, fecha_vencimiento, id_etiqueta, lote, cantidad"),
      leer("consumo", "fecha_registro, id_solicitud, id_articulo, lote_articulo, cantidad"),
      leer("barridos_linea", "id, id_solicitud, id_ingrediente, pesaje_total"),
    ]);
    return {
      jornadas: armarJornadas({
        producciones,
        solicitudes,
        productos,
        envases,
        causas,
        paradasProg,
        paradasNo,
      }),
      plan: armarPlan(mensual),
      stock: armarDatosStock({
        ingredientes,
        insumos,
        envases,
        etiquetas,
        articulos,
        movIng,
        movIns,
        movEnv,
        movEti,
        consumos,
        barridos,
        solicitudes,
        productos,
        producciones,
      }),
      error: null,
    };
  } catch (e) {
    return {
      jornadas: [],
      plan: [],
      stock: vacioStock,
      error: e instanceof Error ? e.message : "No se pudieron cargar los indicadores.",
    };
  }
}
