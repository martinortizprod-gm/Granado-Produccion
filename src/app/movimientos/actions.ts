"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermiso } from "@/lib/auth/permisos";
import { cargarMovimientos } from "@/lib/movimientos/data";
import {
  DatosMovimientoForm,
  filaMovimiento,
  KindMovimiento,
  MOVIMIENTOS,
  validarMovimiento,
} from "@/lib/movimientos/logic";
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

export async function guardarMovimiento(
  kind: KindMovimiento,
  datos: DatosMovimientoForm,
  idEdicion?: number,
) {
  await requirePermiso("movimientos", "editar");
  const cfg = MOVIMIENTOS[kind];
  const cargado = await cargarMovimientos();
  if (cargado.error) throw new Error(cargado.error);
  const pack = cargado.kinds[kind];
  const editando = idEdicion != null ? pack.movimientos.find((m) => m.id === idEdicion) : undefined;
  const errores = validarMovimiento(cfg, datos, pack.articulos, editando);
  if (errores.length) throw new Error(errores.join(" "));
  const admin = createAdminClient();
  const id = idEdicion ?? (await maxId(cfg.tabla)) + 1;
  const fila = filaMovimiento(cfg, datos, pack.articulos, id);
  const q = idEdicion
    ? admin.from(cfg.tabla).update(fila).eq("id", id)
    : admin.from(cfg.tabla).insert(fila);
  const { error } = await q;
  if (error) throw new Error(error.message);
  revalidatePath("/movimientos");
  revalidatePath(`/${kind === "productos" ? "productos" : kind}`);
}

export async function eliminarMovimiento(kind: KindMovimiento, id: number) {
  await requirePermiso("movimientos", "editar");
  const cfg = MOVIMIENTOS[kind];
  const admin = createAdminClient();
  const { error } = await admin.from(cfg.tabla).delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/movimientos");
  revalidatePath(`/${kind === "productos" ? "productos" : kind}`);
}
