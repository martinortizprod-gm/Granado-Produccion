import { createClient } from "@/lib/supabase/server";
import {
  armarCotizaciones,
  type DatosCotizaciones,
} from "@/lib/cotizaciones/logic";

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

function mensajeTabla(error: unknown) {
  const texto = error instanceof Error ? error.message : "No se pudieron cargar las cotizaciones";
  const n = texto.toLowerCase();
  if (
    n.includes("cotiz_mp") ||
    n.includes("cotiz_fazon") ||
    n.includes("cotiz_producto") ||
    n.includes("schema cache") ||
    n.includes("does not exist")
  ) {
    return "Falta crear las tablas de cotizaciones. En Supabase → SQL Editor, ejecutá supabase/cotizaciones.sql y recargá.";
  }
  return texto;
}

const vacio: DatosCotizaciones = {
  ingredientes: [],
  productos: [],
  pares_fazon: [],
  versiones: [],
  listas_mp: [],
  listas_fazon: [],
  filas_producto: [],
  cotizaciones_producto: [],
};

export async function cargarCotizaciones(): Promise<DatosCotizaciones & { error: string | null }> {
  try {
    const [ingredientes, productos, envases, versiones, recetas, usuarios] = await Promise.all([
      leer("catalogo_ingredientes"),
      leer("catalogo_productos"),
      leer("catalogo_envases"),
      leer("registro_versiones"),
      leer("recetas"),
      leer("usuarios"),
    ]);
    let mp: Record<string, unknown>[] = [];
    let mpItems: Record<string, unknown>[] = [];
    let fazon: Record<string, unknown>[] = [];
    let fazonItems: Record<string, unknown>[] = [];
    let productosCotiz: Record<string, unknown>[] = [];
    let productosItems: Record<string, unknown>[] = [];
    try {
      [mp, mpItems, fazon, fazonItems, productosCotiz, productosItems] = await Promise.all([
        leer("cotiz_mp"),
        leer("cotiz_mp_items"),
        leer("cotiz_fazon"),
        leer("cotiz_fazon_items"),
        leer("cotiz_producto"),
        leer("cotiz_producto_items"),
      ]);
    } catch (e) {
      const maestros = armarCotizaciones({
        ingredientes,
        productos,
        envases,
        versiones,
        recetas,
        mp: [],
        mpItems: [],
        fazon: [],
        fazonItems: [],
        productosCotiz: [],
        productosItems: [],
        usuarios,
      });
      return { ...maestros, error: mensajeTabla(e) };
    }
    return {
      ...armarCotizaciones({
        ingredientes,
        productos,
        envases,
        versiones,
        recetas,
        mp,
        mpItems,
        fazon,
        fazonItems,
        productosCotiz,
        productosItems,
        usuarios,
      }),
      error: null,
    };
  } catch (e) {
    return {
      ...vacio,
      error: e instanceof Error ? e.message : "No se pudieron cargar las cotizaciones",
    };
  }
}
