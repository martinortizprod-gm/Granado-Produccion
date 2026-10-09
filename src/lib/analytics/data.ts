import { createClient, supabaseEnvConfigured } from "@/lib/supabase/server";
import {
  armarJornadas,
  armarPendienteEnvase,
  armarPlan,
  type JornadaAnalytics,
  type LineaPlanAnalytics,
  type PendienteEnvase,
} from "@/lib/analytics/logic";
import { armarDatosStock, type DatosStockAnalytics } from "@/lib/analytics/stock";
import { armarPlan as armarMesPlan, hoyIso } from "@/lib/planificacion/logic";
import { aFecha, clave, idEntero, texto } from "@/lib/solicitudes/logic";
import type { DiaHoras, InsumoUsado, LineaRecetaResumen } from "@/lib/analytics/resumen-operativo";

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

function mesesDe(fechas: (string | null)[]) {
  const set = new Set<string>();
  for (const fecha of fechas) {
    if (fecha && /^\d{4}-\d{2}/.test(fecha)) set.add(`${fecha.slice(0, 7)}-01`);
  }
  set.add(`${hoyIso().slice(0, 7)}-01`);
  const meses = [...set].sort();
  return meses.length > 24 ? meses.slice(-24) : meses;
}

function usadosInsumo(
  articulos: Record<string, unknown>[],
  insumos: Record<string, unknown>[],
  consumos: Record<string, unknown>[],
): InsumoUsado[] {
  const codigoPorId = new Map<number, string>();
  for (const fila of insumos) {
    const id = idEntero(fila.id);
    const codigo = texto(fila.codigo);
    if (id != null && codigo) codigoPorId.set(id, codigo);
  }
  const porArticulo = new Map<number, string>();
  for (const fila of articulos) {
    if (clave(fila.tipo_articulo) !== "insumo") continue;
    const id = idEntero(fila.id);
    const origen = idEntero(fila.id_origen);
    const codigo = origen != null ? codigoPorId.get(origen) : "";
    if (id != null && codigo) porArticulo.set(id, codigo);
  }
  const vistos = new Set<string>();
  const out: InsumoUsado[] = [];
  for (const fila of consumos) {
    const codigo = porArticulo.get(idEntero(fila.id_articulo) ?? -1);
    const idSolicitud = idEntero(fila.id_solicitud);
    if (!codigo || idSolicitud == null) continue;
    const llave = `${idSolicitud}|${clave(codigo)}`;
    if (vistos.has(llave)) continue;
    vistos.add(llave);
    out.push({ idSolicitud, codigo });
  }
  return out;
}

function lineasReceta(
  recetas: Record<string, unknown>[],
  ingredientes: Record<string, unknown>[],
): LineaRecetaResumen[] {
  const nombres = new Map<number, string>();
  for (const fila of ingredientes) {
    const id = idEntero(fila.id);
    const nombre = texto(fila.ingrediente);
    if (id != null && nombre) nombres.set(id, nombre);
  }
  const out: LineaRecetaResumen[] = [];
  for (const fila of recetas) {
    const idVersion = idEntero(fila.id_version);
    const idIngrediente = idEntero(fila.id_ingrediente);
    if (idVersion == null || idIngrediente == null) continue;
    const participacion = Number(fila.participacion);
    out.push({
      idVersion,
      idIngrediente,
      nombre: nombres.get(idIngrediente) || `Ingrediente ${idIngrediente}`,
      participacion: Number.isFinite(participacion) ? participacion : 0,
    });
  }
  return out;
}

export async function cargarAnalytics(): Promise<{
  jornadas: JornadaAnalytics[];
  plan: LineaPlanAnalytics[];
  pendientes: PendienteEnvase[];
  horasDias: DiaHoras[];
  recetas: LineaRecetaResumen[];
  insumosUsados: InsumoUsado[];
  stock: DatosStockAnalytics;
  error: string | null;
}> {
  const vacioStock: DatosStockAnalytics = {
    articulos: [],
    movimientos: [],
    consumos: [],
    barridos: [],
    nombresProducto: [],
    deltasProducto: [],
  };
  if (!supabaseEnvConfigured()) {
    return {
      jornadas: [],
      plan: [],
      pendientes: [],
      horasDias: [],
      recetas: [],
      insumosUsados: [],
      stock: vacioStock,
      error: "Falta la configuración de conexión.",
    };
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
      movProd,
      rendimientos,
      paradasPlan,
      horarios,
      capacidades,
      recetas,
    ] = await Promise.all([
      leer(
        "produccion",
        "id, fecha_registro, id_solicitud, pallets, unidades, peso_kg, hs_disponibles, hs_productivas, hs_paradas_programadas, hs_paradas_no_p, rendimiento_kg_h",
      ),
      leer(
        "solicitudes",
        "id, fecha_registro, fecha_estimada, fecha_fin, id_producto, id_version, lote, orden_produccion, unidades_por_pallets, peso_unitario, pallets_cargados, unidades_cargadas, peso_total, pallets_pendientes, cancelada",
      ),
      leer("catalogo_productos", "id, producto, categoria, id_envase, id_etiqueta"),
      leer("catalogo_envases", "id, codigo, envase, categoria, estado, capacidad_carga_kg"),
      leer("causas_paradas", "id, causa"),
      leer("paradas_programadas", "id, id_produccion, id_causas, tiempo_en_hs"),
      leer("paradas_no_programadas", "id, id_produccion, id_causas, tiempo_en_hs"),
      leer(
        "planificacion_mensual",
        "id, fecha, categoria, kg_estimados, horas_disponibles, horas_paradas_programadas, horas_productivas, pallets_estimados, disponibilidad_operarios_estimada, observaciones",
      ),
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
      leer("movimientos_productos", "id, tipo, fecha_registro, id_producto, stk_kg, observaciones"),
      leer("planificacion_rendimientos", "id, cantidad_operarios, categoria, pallets_hora"),
      leer("planificacion_paradas", "id, dia_semana, cantidad_operarios, causa, horas"),
      leer("planificacion_horarios", "id, dia_semana, horas_disponibles"),
      leer("planificacion_capacidades", "id, categoria, kg_por_pallet, kg_por_batch"),
      leer("recetas", "id_version, id_ingrediente, participacion"),
    ]);
    const crudoPlan = {
      mensual,
      rendimientos,
      paradas: paradasPlan,
      horarios,
      capacidades,
      produccion: producciones,
      productos,
      solicitudes,
      paradasNo,
      causas,
    };
    const horasDias: DiaHoras[] = [];
    for (const mes of mesesDe([
      ...producciones.map((fila) => aFecha(fila.fecha_registro)),
      ...mensual.map((fila) => aFecha(fila.fecha)),
      ...solicitudes.map((fila) => aFecha(fila.fecha_fin)),
    ])) {
      for (const dia of armarMesPlan(crudoPlan, mes, null).dias) {
        horasDias.push({ fecha: dia.fecha, disponibles: dia.horas_disponibles });
      }
    }
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
      pendientes: armarPendienteEnvase({ solicitudes, producciones, productos, envases, etiquetas }),
      horasDias,
      recetas: lineasReceta(recetas, ingredientes),
      insumosUsados: usadosInsumo(articulos, insumos, consumos),
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
        movProd,
      }),
      error: null,
    };
  } catch (e) {
    return {
      jornadas: [],
      plan: [],
      pendientes: [],
      horasDias: [],
      recetas: [],
      insumosUsados: [],
      stock: vacioStock,
      error: e instanceof Error ? e.message : "No se pudieron cargar los indicadores.",
    };
  }
}
