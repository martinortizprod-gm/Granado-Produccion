"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermiso } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";
import {
  armarConfig,
  AsignacionDia,
  CapacidadPlan,
  cambiosEstimaciones,
  cambiosRecalcular,
  filasGenerar,
  HorarioPlan,
  horasDisponibles,
  horasParadas,
  nombreDia,
  ParadaPlan,
  PatchFila,
  prepararDia,
  RendimientoPlan,
  validarCapacidades,
  validarDia,
  validarHorarios,
  validarParadas,
  validarRendimientos,
} from "@/lib/planificacion/logic";
import { aFecha, clave, idEntero, texto } from "@/lib/solicitudes/logic";

const TABLA = "planificacion_mensual";

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

async function maxId(tabla: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.from(tabla).select("id").order("id", { ascending: false }).limit(1);
  if (error) throw new Error(error.message);
  return idEntero(data?.[0]?.id) ?? 0;
}

async function aplicar(tabla: string, updates: PatchFila[], inserts: Record<string, unknown>[], deletes: number[]) {
  const admin = createAdminClient();
  for (const item of updates) {
    const { error } = await admin.from(tabla).update(item.datos).eq("id", item.id);
    if (error) throw new Error(error.message);
  }
  if (inserts.length) {
    const { error } = await admin.from(tabla).insert(inserts);
    if (error) throw new Error(error.message);
  }
  if (deletes.length) {
    const { error } = await admin.from(tabla).delete().in("id", deletes);
    if (error) throw new Error(error.message);
  }
}

async function configYMes(mes: string) {
  const [mensual, rendimientos, paradas, horarios, capacidades] = await Promise.all([
    leer(TABLA),
    leer("planificacion_rendimientos"),
    leer("planificacion_paradas"),
    leer("planificacion_horarios"),
    leer("planificacion_capacidades"),
  ]);
  const config = armarConfig({ rendimientos, paradas, horarios, capacidades });
  const ym = mes.slice(0, 7);
  const filas = mensual
    .map((fila) => ({ fecha: aFecha(fila.fecha), fila }))
    .filter((item): item is { fecha: string; fila: Record<string, unknown> } => !!item.fecha && item.fecha.slice(0, 7) === ym)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || (idEntero(a.fila.id) ?? 0) - (idEntero(b.fila.id) ?? 0));
  return { config, filas, mensual };
}

function refrescar() {
  revalidatePath("/planificacion");
}

export async function generarMes(mes: string, operarios: number) {
  await requirePermiso("planificacion", "editar");
  const { config, filas } = await configYMes(mes);
  const fechas = new Set(filas.map((item) => item.fecha));
  const nuevas = filasGenerar(mes, operarios, config, fechas, (await maxId(TABLA)) + 1);
  if (!nuevas.length) return { aviso: "El mes ya tiene todos los días planificados." };
  await aplicar(TABLA, [], nuevas, []);
  refrescar();
  return { aviso: `Se agregaron ${nuevas.length} día(s) al plan del mes.` };
}

export async function recalcularMes(mes: string, operarios: number) {
  await requirePermiso("planificacion", "editar");
  const { config, filas } = await configYMes(mes);
  const cambios = cambiosRecalcular(filas, operarios, config);
  await aplicar(TABLA, cambios, [], []);
  refrescar();
  return { aviso: "Se recalcularon horas y producción planificada del mes." };
}

async function persistirDia(input: {
  fecha: string;
  operarios: number;
  contempla: boolean;
  horas_disponibles: number;
  horas_paradas: number;
  observaciones: string;
  asignaciones: AsignacionDia[];
}) {
  const errores = validarDia(
    input.contempla,
    input.horas_disponibles,
    input.horas_paradas,
    input.asignaciones,
  );
  if (errores.length) throw new Error(errores.join(" "));
  const { config, mensual } = await configYMes(input.fecha);
  const ids = mensual
    .filter((fila) => aFecha(fila.fecha) === input.fecha.slice(0, 10))
    .map((fila) => idEntero(fila.id))
    .filter((id): id is number => id != null)
    .sort((a, b) => a - b);
  const plan = prepararDia({
    fecha: input.fecha.slice(0, 10),
    operarios: input.operarios,
    contempla: input.contempla,
    horasDisponibles: input.horas_disponibles,
    horasParadas: input.horas_paradas,
    observaciones: input.observaciones,
    asignaciones: input.asignaciones,
    config,
    idsExistentes: ids,
    siguienteId: (await maxId(TABLA)) + 1,
  });
  await aplicar(TABLA, plan.updates, plan.inserts, plan.deletes);
  refrescar();
}

export async function guardarDia(input: {
  fecha: string;
  operarios: number;
  contempla: boolean;
  horas_disponibles: number;
  horas_paradas: number;
  observaciones: string;
  asignaciones: AsignacionDia[];
}) {
  await requirePermiso("planificacion", "editar");
  await persistirDia(input);
  return { aviso: "Día guardado." };
}

export async function alternarContempla(fecha: string, contempla: boolean, operarios: number) {
  await requirePermiso("planificacion", "editar");
  const iso = fecha.slice(0, 10);
  const { config, mensual } = await configYMes(iso);
  const delDia = mensual.filter((fila) => aFecha(fila.fecha) === iso);
  const diaSemana = nombreDia(iso);
  const observaciones = delDia.map((fila) => texto(fila.observaciones)).find(Boolean) ?? "";
  if (contempla) {
    const disponibles = horasDisponibles(config, diaSemana);
    if (disponibles <= 0.0005) {
      throw new Error(
        `${diaSemana} no tiene horas disponibles en la configuración horaria. Cargá disponibilidad horaria o editá el día con el lápiz.`,
      );
    }
    await persistirDia({
      fecha: iso,
      operarios,
      contempla: true,
      horas_disponibles: disponibles,
      horas_paradas: horasParadas(config, diaSemana, operarios),
      observaciones,
      asignaciones: delDia
        .map((fila) => ({ categoria: texto(fila.categoria), horas: Number(fila.horas_productivas) || 0 }))
        .filter((item) => item.categoria),
    });
    return { aviso: `${iso.split("-").reverse().join("/")} marcado como laboral.` };
  }
  await persistirDia({
    fecha: iso,
    operarios,
    contempla: false,
    horas_disponibles: 0,
    horas_paradas: 0,
    observaciones,
    asignaciones: [],
  });
  return { aviso: `${iso.split("-").reverse().join("/")} sin marcar (plan en cero).` };
}

export async function asignarCategoria(fecha: string, categoria: string, operarios: number) {
  await requirePermiso("planificacion", "editar");
  const iso = fecha.slice(0, 10);
  const { config, mensual } = await configYMes(iso);
  const delDia = mensual.filter((fila) => aFecha(fila.fecha) === iso);
  if (!delDia.length) throw new Error("Este día no está en el plan.");
  const disponibles = Math.max(...delDia.map((fila) => Number(fila.horas_disponibles) || 0));
  const paradas = Math.min(
    Math.max(...delDia.map((fila) => Number(fila.horas_paradas_programadas) || 0)),
    disponibles,
  );
  const productivas = Math.round(Math.max(0, disponibles - paradas) * 100) / 100;
  if (disponibles <= 0.0005 || productivas <= 0.0005) {
    throw new Error("Este día no está marcado como laboral o no tiene horas productivas.");
  }
  const nombre = texto(categoria);
  const oficial = nombre ? config.categorias.find((item) => clave(item) === clave(nombre)) : undefined;
  if (nombre && !oficial) throw new Error(`La categoría ${nombre} no está en la configuración.`);
  await persistirDia({
    fecha: iso,
    operarios,
    contempla: true,
    horas_disponibles: disponibles,
    horas_paradas: paradas,
    observaciones: delDia.map((fila) => texto(fila.observaciones)).find(Boolean) ?? "",
    asignaciones: oficial ? [{ categoria: oficial, horas: productivas }] : [],
  });
  return { aviso: oficial ? `${oficial} asignado.` : "Sin producto (plan en cero)." };
}

export async function eliminarDia(fecha: string) {
  await requirePermiso("planificacion", "editar");
  const iso = fecha.slice(0, 10);
  const mensual = await leer(TABLA);
  const ids = mensual
    .filter((fila) => aFecha(fila.fecha) === iso)
    .map((fila) => idEntero(fila.id))
    .filter((id): id is number => id != null);
  await aplicar(TABLA, [], [], ids);
  refrescar();
  return { aviso: "Se quitó la planificación del día." };
}

async function guardarTabla(
  tabla: string,
  items: { id: number | null; datos: Record<string, unknown> }[],
) {
  const actuales = new Set((await leer(tabla)).map((fila) => idEntero(fila.id)).filter((id): id is number => id != null));
  let siguiente = (await maxId(tabla)) + 1;
  const updates: PatchFila[] = [];
  const inserts: Record<string, unknown>[] = [];
  for (const item of items) {
    if (item.id != null && actuales.has(item.id)) updates.push({ id: item.id, datos: item.datos });
    else {
      inserts.push({ id: siguiente, ...item.datos });
      siguiente += 1;
    }
  }
  await aplicar(tabla, updates, inserts, []);
}

export async function guardarRendimientos(mes: string, operarios: number, items: RendimientoPlan[]) {
  await requirePermiso("planificacion", "editar");
  const errores = validarRendimientos(items);
  if (errores.length) throw new Error(errores.join(" "));
  await guardarTabla(
    "planificacion_rendimientos",
    items.map((item) => ({
      id: item.id,
      datos: {
        cantidad_operarios: item.cantidad_operarios,
        categoria: texto(item.categoria) || null,
        pallets_hora: Math.round(item.pallets_hora * 100) / 100,
      },
    })),
  );
  const { config, filas } = await configYMes(mes);
  const cambios = cambiosEstimaciones(filas, operarios, config);
  await aplicar(TABLA, cambios, [], []);
  refrescar();
  return {
    aviso: cambios.length
      ? `Se actualizaron ${cambios.length} línea(s) de pallets/kg con la nueva producción estimada.`
      : "Configuración guardada.",
  };
}

export async function guardarCapacidades(mes: string, operarios: number, items: CapacidadPlan[]) {
  await requirePermiso("planificacion", "editar");
  const limpios = items.filter((item) => texto(item.categoria));
  const errores = validarCapacidades(limpios);
  if (errores.length) throw new Error(errores.join(" "));
  await guardarTabla(
    "planificacion_capacidades",
    limpios.map((item) => ({
      id: item.id,
      datos: {
        categoria: texto(item.categoria) || null,
        kg_por_pallet: Math.round(item.kg_por_pallet * 100) / 100,
        kg_por_batch: Math.round(item.kg_por_batch * 100) / 100,
      },
    })),
  );
  const { config, filas } = await configYMes(mes);
  const cambios = cambiosEstimaciones(filas, operarios, config);
  await aplicar(TABLA, cambios, [], []);
  refrescar();
  return {
    aviso: cambios.length
      ? `Se actualizaron ${cambios.length} línea(s) de pallets/kg con la nueva producción estimada.`
      : "Configuración guardada.",
  };
}

export async function guardarHorarios(mes: string, operarios: number, items: HorarioPlan[]) {
  await requirePermiso("planificacion", "editar");
  const { config, filas } = await configYMes(mes);
  const errores = validarHorarios(items, config, operarios);
  if (errores.length) throw new Error(errores.join(" "));
  await guardarTabla(
    "planificacion_horarios",
    items.map((item) => ({
      id: item.id,
      datos: {
        dia_semana: texto(item.dia_semana) || null,
        horas_disponibles: Math.round(item.horas_disponibles * 100) / 100,
      },
    })),
  );
  if (filas.length) {
    const fresco = await configYMes(mes);
    await aplicar(TABLA, cambiosRecalcular(fresco.filas, operarios, fresco.config), [], []);
    refrescar();
    return { aviso: "Se recalcularon horas y producción planificada del mes." };
  }
  refrescar();
  return { aviso: "Configuración guardada." };
}

export async function guardarParadas(mes: string, operarios: number, items: ParadaPlan[]) {
  await requirePermiso("planificacion", "editar");
  const errores = validarParadas(items);
  if (errores.length) throw new Error(errores.join(" "));
  await guardarTabla(
    "planificacion_paradas",
    items.map((item) => ({
      id: item.id,
      datos: {
        dia_semana: texto(item.dia_semana) || null,
        cantidad_operarios: item.cantidad_operarios,
        causa: texto(item.causa) || null,
        horas: Math.round(item.horas * 100) / 100,
      },
    })),
  );
  const { filas } = await configYMes(mes);
  if (filas.length) {
    const fresco = await configYMes(mes);
    await aplicar(TABLA, cambiosRecalcular(fresco.filas, operarios, fresco.config), [], []);
    refrescar();
    return { aviso: "Se recalcularon horas y producción planificada del mes." };
  }
  refrescar();
  return { aviso: "Configuración guardada." };
}
