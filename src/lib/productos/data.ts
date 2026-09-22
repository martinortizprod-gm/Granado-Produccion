import { createClient } from "@/lib/supabase/server";
import {
  armarProductos,
  OpcionCatalogo,
  ProductoVista,
} from "@/lib/productos/logic";

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

export async function cargarProductos(): Promise<{
  productos: ProductoVista[];
  envases: OpcionCatalogo[];
  etiquetas: OpcionCatalogo[];
  error: string | null;
}> {
  try {
    const [productos, envases, etiquetas, versiones, movimientos, producciones, solicitudes] =
      await Promise.all([
        leer("catalogo_productos"),
        leer("catalogo_envases"),
        leer("catalogo_etiquetas"),
        leer("registro_versiones"),
        leer("movimientos_productos"),
        leer("produccion"),
        leer("solicitudes"),
      ]);
    return {
      ...armarProductos({
        productos,
        envases,
        etiquetas,
        versiones,
        movimientos,
        producciones,
        solicitudes,
      }),
      error: null,
    };
  } catch (e) {
    return {
      productos: [],
      envases: [],
      etiquetas: [],
      error: e instanceof Error ? e.message : "No se pudieron cargar los productos",
    };
  }
}
