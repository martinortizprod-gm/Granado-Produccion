import { createClient } from "@/lib/supabase/server";
import { armarProduccion, vacio } from "@/lib/produccion/logic";

async function leer(tabla: string) {
  const supabase = await createClient();
  const page = 1000;
  const all: Record<string, unknown>[] = [];
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase.from(tabla).select("*").range(from, from + page - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Record<string, unknown>[];
    all.push(...rows);
    if (rows.length < page) break;
  }
  return all;
}

export async function cargarProduccion() {
  try {
    const [
      solicitudes,
      producciones,
      productos,
      versiones,
      envases,
      etiquetas,
      ingredientes,
      insumos,
      equipos,
      usuarios,
      roles,
      causas,
      recetas,
      articulos,
      consumos,
      movIng,
      movEnv,
      movIns,
      movEti,
      movProd,
      paradasProg,
      paradasNo,
      responsables,
      limpiezas,
      barridos,
    ] = await Promise.all([
      leer("solicitudes"),
      leer("produccion"),
      leer("catalogo_productos"),
      leer("registro_versiones"),
      leer("catalogo_envases"),
      leer("catalogo_etiquetas"),
      leer("catalogo_ingredientes"),
      leer("catalogo_insumos"),
      leer("catalogo_equipos"),
      leer("usuarios"),
      leer("roles"),
      leer("causas_paradas"),
      leer("recetas"),
      leer("catalogo_articulos"),
      leer("consumo"),
      leer("movimientos_ingredientes"),
      leer("movimientos_envases"),
      leer("movimientos_insumos"),
      leer("movimientos_etiquetas"),
      leer("movimientos_productos"),
      leer("paradas_programadas"),
      leer("paradas_no_programadas"),
      leer("responsables_producciones"),
      leer("limpieza_equipos"),
      leer("barridos_linea"),
    ]);
    return armarProduccion({
      solicitudes,
      producciones,
      productos,
      versiones,
      envases,
      etiquetas,
      ingredientes,
      insumos,
      equipos,
      usuarios,
      roles,
      causas,
      recetas,
      articulos,
      consumos,
      movIng,
      movEnv,
      movIns,
      movEti,
      movProd,
      paradasProg,
      paradasNo,
      responsables,
      limpiezas,
      barridos,
    });
  } catch (error) {
    const datos = vacio();
    datos.error = error instanceof Error ? error.message : "No se pudo cargar la producción.";
    return datos;
  }
}
