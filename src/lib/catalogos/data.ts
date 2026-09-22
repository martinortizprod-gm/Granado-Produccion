import { createClient } from "@/lib/supabase/server";
import {
  ArticuloVista,
  CATALOGOS,
  KindCatalogo,
  armarArticulos,
  calcularLotes,
  calcularStock,
} from "@/lib/catalogos/logic";

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

export async function cargarCatalogo(kind: KindCatalogo): Promise<{
  articulos: ArticuloVista[];
  error: string | null;
}> {
  const cfg = CATALOGOS[kind];
  try {
    const [catalogo, movimientos, articulos, consumos] = await Promise.all([
      leer(cfg.tabla),
      leer(cfg.tablaMov),
      leer("catalogo_articulos"),
      leer("consumo"),
    ]);
    const stocks = calcularStock(cfg, catalogo, movimientos, articulos, consumos);
    const lotes = calcularLotes(cfg, catalogo, movimientos, articulos, consumos);
    return {
      articulos: armarArticulos(cfg, catalogo, stocks, lotes),
      error: null,
    };
  } catch (e) {
    return {
      articulos: [],
      error: e instanceof Error ? e.message : "No se pudo cargar el catálogo",
    };
  }
}
