"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermiso } from "@/lib/auth/permisos";
import { cargarProductos } from "@/lib/productos/data";
import {
  DatosProductoForm,
  filaProducto,
  validarProducto,
} from "@/lib/productos/logic";
import { idEntero } from "@/lib/solicitudes/logic";

async function maxId() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("catalogo_productos")
    .select("id")
    .order("id", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  return idEntero(data?.[0]?.id) ?? 0;
}

async function contar(tabla: string, campo: string, id: number) {
  const admin = createAdminClient();
  const page = 1000;
  let total = 0;
  for (let from = 0; ; from += page) {
    const { data, error } = await admin
      .from(tabla)
      .select(campo)
      .range(from, from + page - 1);
    if (error) return total;
    const rows = data ?? [];
    for (const fila of rows) {
      const valor = (fila as unknown as Record<string, unknown>)[campo];
      if (idEntero(valor) === id) total += 1;
    }
    if (rows.length < page) break;
  }
  return total;
}

export async function guardarProducto(datos: DatosProductoForm, idEdicion?: number) {
  await requirePermiso("productos", "editar");
  const cargado = await cargarProductos();
  if (cargado.error) throw new Error(cargado.error);
  const errores = validarProducto(datos, cargado.productos, idEdicion);
  if (errores.length) throw new Error(errores.join(" "));
  const admin = createAdminClient();
  const id = idEdicion ?? (await maxId()) + 1;
  const fila = filaProducto(datos, id);
  const q = idEdicion
    ? admin.from("catalogo_productos").update(fila).eq("id", id)
    : admin.from("catalogo_productos").insert(fila);
  const { error } = await q;
  if (error) throw new Error(error.message);
  revalidatePath("/productos");
  revalidatePath("/");
}

export async function eliminarProducto(id: number) {
  await requirePermiso("productos", "editar");
  const avisos: string[] = [];
  const nSol = await contar("solicitudes", "id_producto", id);
  if (nSol) avisos.push(`está en ${nSol} solicitud${nSol === 1 ? "" : "es"}`);
  const nVer = await contar("registro_versiones", "id_producto", id);
  if (nVer) avisos.push(`tiene ${nVer} versión${nVer === 1 ? "" : "es"}`);
  const nMov = await contar("movimientos_productos", "id_producto", id);
  if (nMov) avisos.push(`tiene ${nMov} movimiento${nMov === 1 ? "" : "s"} de stock`);
  if (avisos.length) {
    throw new Error(`No se puede eliminar este producto: ${avisos.join("; ")}.`);
  }
  const admin = createAdminClient();
  const { error } = await admin.from("catalogo_productos").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/productos");
  revalidatePath("/");
}
