import { createClient } from "@/lib/supabase/server";
import { cargarMovimientos } from "@/lib/movimientos/data";
import {
  armarFilasContables,
  formasPago,
  ORIGENES_CONTABLES,
  type CotizacionDolar,
  type FilaIngresoContable,
  type FormaPago,
} from "@/lib/contabilidad/logic";
import { numero, texto } from "@/lib/solicitudes/logic";

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
  const texto = error instanceof Error ? error.message : "No se pudo leer la contabilidad";
  const n = texto.toLowerCase();
  if (
    n.includes("contable_movimientos") ||
    n.includes("contable_pagos") ||
    n.includes("formas_de_pago") ||
    n.includes("schema cache") ||
    n.includes("does not exist")
  ) {
    return "Falta crear las tablas de contabilidad. En Supabase → SQL Editor, ejecutá supabase/contabilidad.sql y recargá.";
  }
  return texto;
}

async function leerCotizacion(): Promise<CotizacionDolar | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("contable_cotizacion")
      .select("pesos_por_dolar, fecha_hora_actualizacion")
      .eq("id", 1)
      .maybeSingle();
    if (error || !data) return null;
    const pesos = numero(data.pesos_por_dolar);
    if (pesos <= 0) return null;
    return { pesos, fecha: texto(data.fecha_hora_actualizacion) };
  } catch {
    return null;
  }
}

export async function cargarContabilidad(): Promise<{
  filas: FilaIngresoContable[];
  formas: FormaPago[];
  cotizacion: CotizacionDolar | null;
  errorMovimientos: string | null;
  errorContable: string | null;
}> {
  const mov = await cargarMovimientos();
  let fichas: Record<string, unknown>[] = [];
  let formasCrudas: Record<string, unknown>[] = [];
  let usuarios: Record<string, unknown>[] = [];
  let pagos: Record<string, unknown>[] = [];
  let errorContable: string | null = null;
  try {
    [fichas, formasCrudas, usuarios] = await Promise.all([
      leer("contable_movimientos"),
      leer("formas_de_pago"),
      leer("usuarios"),
    ]);
    pagos = await leer("contable_pagos");
  } catch (e) {
    const crudo = e instanceof Error ? e.message.toLowerCase() : "";
    errorContable = crudo.includes("contable_pagos")
      ? "Falta la tabla de pagos. En Supabase → SQL Editor, ejecutá de nuevo supabase/contabilidad.sql y recargá."
      : mensajeTabla(e);
  }
  const cotizacion = await leerCotizacion();
  const filas = armarFilasContables({
    ingresos: ORIGENES_CONTABLES.map((kind) => ({
      kind,
      movimientos: mov.kinds[kind].movimientos,
    })),
    fichas,
    pagos,
    formas: formasCrudas,
    usuarios,
    cotizacion: cotizacion?.pesos ?? null,
  });
  return {
    filas,
    formas: formasPago(formasCrudas),
    cotizacion,
    errorMovimientos: mov.error,
    errorContable,
  };
}
