"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermiso } from "@/lib/auth/permisos";
import {
  DatosLineaForm,
  DatosVersionForm,
  filaLinea,
  filaVersion,
  validarLinea,
  validarVersion,
} from "@/lib/recetas/logic";
import { cargarRecetas } from "@/lib/recetas/data";
import { idEntero } from "@/lib/solicitudes/logic";

async function maxId(tabla: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from(tabla)
    .select("id")
    .order("id", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  return idEntero(data?.[0]?.id) ?? 0;
}

async function contarSolicitudes(idVersion: number) {
  const admin = createAdminClient();
  const page = 1000;
  let total = 0;
  for (let from = 0; ; from += page) {
    const { data, error } = await admin
      .from("solicitudes")
      .select("id_version")
      .range(from, from + page - 1);
    if (error) return total;
    const rows = data ?? [];
    for (const fila of rows) {
      if (idEntero((fila as { id_version?: unknown }).id_version) === idVersion) {
        total += 1;
      }
    }
    if (rows.length < page) break;
  }
  return total;
}

export async function guardarVersion(datos: DatosVersionForm, idEdicion?: number) {
  await requirePermiso("recetas", "editar");
  const cargado = await cargarRecetas();
  if (cargado.error) throw new Error(cargado.error);
  const errores = validarVersion(datos, cargado.versiones, idEdicion);
  if (errores.length) throw new Error(errores.join(" "));
  const admin = createAdminClient();
  const id = idEdicion ?? (await maxId("registro_versiones")) + 1;
  const fila = filaVersion(datos, id);
  const q = idEdicion
    ? admin.from("registro_versiones").update(fila).eq("id", id)
    : admin.from("registro_versiones").insert(fila);
  const { error } = await q;
  if (error) throw new Error(error.message);
  revalidatePath("/recetas");
}

export async function eliminarVersion(id: number, lineas: number) {
  await requirePermiso("recetas", "editar");
  const n = await contarSolicitudes(id);
  if (n) {
    throw new Error(
      `No se puede eliminar esta versión: está en ${n} solicitud${n === 1 ? "" : "es"}.`,
    );
  }
  const admin = createAdminClient();
  if (lineas > 0) {
    const { error } = await admin.from("recetas").delete().eq("id_version", id);
    if (error) throw new Error(error.message);
  }
  const { error } = await admin.from("registro_versiones").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/recetas");
}

export async function guardarLinea(datos: DatosLineaForm, idEdicion?: number) {
  await requirePermiso("recetas", "editar");
  const errores = validarLinea(datos);
  if (errores.length) throw new Error(errores.join(" "));
  const admin = createAdminClient();
  const id = idEdicion ?? (await maxId("recetas")) + 1;
  const fila = filaLinea(datos, id);
  const q = idEdicion
    ? admin.from("recetas").update(fila).eq("id", id)
    : admin.from("recetas").insert(fila);
  const { error } = await q;
  if (error) throw new Error(error.message);
  revalidatePath("/recetas");
}

export async function eliminarLinea(id: number) {
  await requirePermiso("recetas", "editar");
  const admin = createAdminClient();
  const { error } = await admin.from("recetas").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/recetas");
}
