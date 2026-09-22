import { createClient } from "@/lib/supabase/server";
import { armarVersiones, OpcionIngrediente, OpcionProducto, VersionVista } from "@/lib/recetas/logic";

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

export async function cargarRecetas(): Promise<{
  versiones: VersionVista[];
  productos: OpcionProducto[];
  ingredientes: OpcionIngrediente[];
  error: string | null;
}> {
  try {
    const [versiones, lineas, productos, ingredientes] = await Promise.all([
      leer("registro_versiones"),
      leer("recetas"),
      leer("catalogo_productos"),
      leer("catalogo_ingredientes"),
    ]);
    return { ...armarVersiones(versiones, lineas, productos, ingredientes), error: null };
  } catch (e) {
    return {
      versiones: [],
      productos: [],
      ingredientes: [],
      error: e instanceof Error ? e.message : "No se pudieron cargar las recetas",
    };
  }
}
