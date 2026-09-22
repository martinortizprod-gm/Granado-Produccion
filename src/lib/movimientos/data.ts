import { createClient } from "@/lib/supabase/server";
import {
  armarKind,
  ArticuloOpcion,
  KindMovimiento,
  MovimientoVista,
} from "@/lib/movimientos/logic";

async function leer(tabla: string) {
  const supabase = await createClient();
  const page = 1000;
  const all: Record<string, unknown>[] = [];
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase
      .from(tabla)
      .select("*")
      .range(from, from + page - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Record<string, unknown>[];
    all.push(...rows);
    if (rows.length < page) break;
  }
  return all;
}

export type DatosKind = {
  movimientos: MovimientoVista[];
  articulos: ArticuloOpcion[];
};

export async function cargarMovimientos(): Promise<{
  kinds: Record<KindMovimiento, DatosKind>;
  error: string | null;
}> {
  const vacio = (): DatosKind => ({ movimientos: [], articulos: [] });
  const kinds = {
    ingredientes: vacio(),
    envases: vacio(),
    insumos: vacio(),
    etiquetas: vacio(),
    productos: vacio(),
  };
  try {
    const [
      movIng,
      movEnv,
      movIns,
      movEti,
      movProd,
      catIng,
      catEnv,
      catIns,
      catEti,
      catProd,
      articulos,
      consumos,
      producciones,
      solicitudes,
    ] = await Promise.all([
      leer("movimientos_ingredientes"),
      leer("movimientos_envases"),
      leer("movimientos_insumos"),
      leer("movimientos_etiquetas"),
      leer("movimientos_productos"),
      leer("catalogo_ingredientes"),
      leer("catalogo_envases"),
      leer("catalogo_insumos"),
      leer("catalogo_etiquetas"),
      leer("catalogo_productos"),
      leer("catalogo_articulos"),
      leer("consumo"),
      leer("produccion"),
      leer("solicitudes"),
    ]);
    const comun = {
      articulosUni: articulos,
      consumos,
      producciones,
      solicitudes,
      envases: catEnv,
    };
    const pares: [KindMovimiento, Record<string, unknown>[], Record<string, unknown>[]][] = [
      ["ingredientes", movIng, catIng],
      ["envases", movEnv, catEnv],
      ["insumos", movIns, catIns],
      ["etiquetas", movEti, catEti],
      ["productos", movProd, catProd],
    ];
    for (const [kind, movimientos, catalogo] of pares) {
      kinds[kind] = armarKind({ kind, movimientos, catalogo, ...comun });
    }
    return { kinds, error: null };
  } catch (e) {
    return {
      kinds,
      error: e instanceof Error ? e.message : "No se pudieron cargar los movimientos",
    };
  }
}
