"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermiso } from "@/lib/auth/permisos";
import { idEntero } from "@/lib/solicitudes/logic";
import {
  DatosParteForm,
  KindParte,
  PARTES,
  filaGuardarParte,
  filaParte,
  validarParte,
} from "@/lib/terceros/logic";

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

async function existentes(tabla: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.from(tabla).select("id, nombre");
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((fila) => filaParte(fila as Record<string, unknown>))
    .filter((item): item is NonNullable<typeof item> => item != null)
    .map((item) => ({ id: item.id, nombre: item.nombre }));
}

export async function guardarParte(
  kind: KindParte,
  datos: DatosParteForm,
  idEdicion?: number,
) {
  await requirePermiso(kind, "editar");
  const cfg = PARTES[kind];
  const errores = validarParte(datos, await existentes(cfg.tabla), idEdicion ?? null);
  if (errores.length) throw new Error(errores.join(" "));
  const admin = createAdminClient();
  const id = idEdicion ?? (await maxId(cfg.tabla)) + 1;
  const fila = filaGuardarParte(datos, id);
  const q = idEdicion
    ? admin.from(cfg.tabla).update(fila).eq("id", id)
    : admin.from(cfg.tabla).insert(fila);
  const { error } = await q;
  if (error) throw new Error(error.message);
  revalidatePath(`/${kind}`);
  revalidatePath("/movimientos");
  revalidatePath("/solicitudes", "layout");
}

export async function eliminarParte(kind: KindParte, id: number) {
  await requirePermiso(kind, "editar");
  if (idEntero(id) == null) throw new Error("ID inválido");
  const cfg = PARTES[kind];
  const admin = createAdminClient();
  const { error } = await admin.from(cfg.tabla).delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/${kind}`);
  revalidatePath("/movimientos");
  revalidatePath("/solicitudes", "layout");
}
