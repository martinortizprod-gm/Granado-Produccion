import { createClient } from "@/lib/supabase/server";
import { armarPlan, DatosPlan, mesValido, planVacio } from "@/lib/planificacion/logic";
import { idEntero } from "@/lib/solicitudes/logic";

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

export async function cargarPlanificacion(mesParam?: string, opsParam?: string): Promise<DatosPlan> {
  const mes = mesValido(mesParam);
  const ops = idEntero(opsParam);
  try {
    const [mensual, rendimientos, paradas, horarios, capacidades, produccion, productos, solicitudes, paradasNo, causas] =
      await Promise.all([
        leer("planificacion_mensual"),
        leer("planificacion_rendimientos"),
        leer("planificacion_paradas"),
        leer("planificacion_horarios"),
        leer("planificacion_capacidades"),
        leer("produccion"),
        leer("catalogo_productos"),
        leer("solicitudes"),
        leer("paradas_no_programadas"),
        leer("causas_paradas"),
      ]);
    return armarPlan(
      {
        mensual,
        rendimientos,
        paradas,
        horarios,
        capacidades,
        produccion,
        productos,
        solicitudes,
        paradasNo,
        causas,
      },
      mes,
      ops && ops > 0 ? ops : null,
    );
  } catch (error) {
    return planVacio(mes, ops, error instanceof Error ? error.message : "No se pudo leer la planificación");
  }
}
