"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermiso } from "@/lib/auth/permisos";
import { cargarCotizaciones } from "@/lib/cotizaciones/data";
import {
  DatosCotizProductoForm,
  ItemFazonForm,
  ItemMpForm,
  armarDesgloseProducto,
  parseCosto,
  validarCotizProducto,
  validarListaFazon,
  validarListaMp,
} from "@/lib/cotizaciones/logic";
import { idEntero, numero } from "@/lib/solicitudes/logic";

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

function usuarioId(id: number | null) {
  if (id == null) throw new Error("Tu usuario no está vinculado. No se puede registrar la cotización.");
  return id;
}

export async function guardarListaMp(items: ItemMpForm[], observaciones?: string) {
  const perfil = await requirePermiso("cotizaciones", "editar");
  const errores = validarListaMp(items);
  if (errores.length) throw new Error(errores.join(" "));
  const cargado = await cargarCotizaciones();
  if (cargado.error) throw new Error(cargado.error);
  const porId = new Map(cargado.ingredientes.map((i) => [i.id, i]));

  const admin = createAdminClient();
  const idLista = (await maxId("cotiz_mp")) + 1;
  const { error: errCab } = await admin.from("cotiz_mp").insert({
    id: idLista,
    id_usuario_registro: usuarioId(perfil.usuarioId),
    observaciones: observaciones?.trim() || null,
  });
  if (errCab) throw new Error(errCab.message);

  let idItem = (await maxId("cotiz_mp_items")) + 1;
  const filas = [];
  for (const item of items) {
    const idIng = idEntero(item.id_ingrediente);
    if (idIng == null) continue;
    const ing = porId.get(idIng);
    const costo = parseCosto(item.costo_por_tn);
    if (costo == null) continue;
    filas.push({
      id: idItem,
      id_cotiz_mp: idLista,
      id_ingrediente: idIng,
      codigo: ing?.codigo ?? "",
      nombre: ing?.nombre ?? "",
      costo_por_tn: costo,
    });
    idItem += 1;
  }
  if (filas.length) {
    const { error } = await admin.from("cotiz_mp_items").insert(filas);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/cotizaciones");
}

export async function eliminarUltimaListaMp() {
  await requirePermiso("cotizaciones", "editar");
  const cargado = await cargarCotizaciones();
  if (cargado.error) throw new Error(cargado.error);
  const vigente = cargado.listas_mp.find((l) => l.vigente);
  if (!vigente) throw new Error("No hay una cotización de ingredientes para borrar.");
  const admin = createAdminClient();
  const { error: errItems } = await admin.from("cotiz_mp_items").delete().eq("id_cotiz_mp", vigente.id);
  if (errItems) throw new Error(errItems.message);
  const { error } = await admin.from("cotiz_mp").delete().eq("id", vigente.id);
  if (error) throw new Error(error.message);
  revalidatePath("/cotizaciones");
}

export async function guardarListaFazon(items: ItemFazonForm[], observaciones?: string) {
  const perfil = await requirePermiso("cotizaciones", "editar");
  const errores = validarListaFazon(items);
  if (errores.length) throw new Error(errores.join(" "));

  const admin = createAdminClient();
  const idLista = (await maxId("cotiz_fazon")) + 1;
  const { error: errCab } = await admin.from("cotiz_fazon").insert({
    id: idLista,
    id_usuario_registro: usuarioId(perfil.usuarioId),
    observaciones: observaciones?.trim() || null,
  });
  if (errCab) throw new Error(errCab.message);

  let idItem = (await maxId("cotiz_fazon_items")) + 1;
  const filas = [];
  for (const item of items) {
    const costo = parseCosto(item.costo_por_tn);
    const kg = numero(item.capacidad_kg);
    if (costo == null || !(kg > 0) || !item.categoria.trim()) continue;
    filas.push({
      id: idItem,
      id_cotiz_fazon: idLista,
      categoria: item.categoria.trim(),
      capacidad_kg: kg,
      costo_por_tn: costo,
    });
    idItem += 1;
  }
  if (filas.length) {
    const { error } = await admin.from("cotiz_fazon_items").insert(filas);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/cotizaciones");
}

export async function eliminarUltimaListaFazon() {
  await requirePermiso("cotizaciones", "editar");
  const cargado = await cargarCotizaciones();
  if (cargado.error) throw new Error(cargado.error);
  const vigente = cargado.listas_fazon.find((l) => l.vigente);
  if (!vigente) throw new Error("No hay una cotización de fazón para borrar.");
  const admin = createAdminClient();
  const { error: errItems } = await admin.from("cotiz_fazon_items").delete().eq("id_cotiz_fazon", vigente.id);
  if (errItems) throw new Error(errItems.message);
  const { error } = await admin.from("cotiz_fazon").delete().eq("id", vigente.id);
  if (error) throw new Error(error.message);
  revalidatePath("/cotizaciones");
}

export async function guardarCotizacionProducto(datos: DatosCotizProductoForm) {
  const perfil = await requirePermiso("cotizaciones", "editar");
  const errores = validarCotizProducto(datos);
  if (errores.length) throw new Error(errores.join(" "));
  const cargado = await cargarCotizaciones();
  if (cargado.error) throw new Error(cargado.error);

  const idProducto = idEntero(datos.id_producto)!;
  const idVersion = idEntero(datos.id_version)!;
  const capacidad = numero(datos.capacidad_kg);
  const toneladas = numero(datos.toneladas);
  const vigenteMp = cargado.listas_mp.find((l) => l.vigente);
  const vigenteFz = cargado.listas_fazon.find((l) => l.vigente);
  const desglose = armarDesgloseProducto({
    productos: cargado.productos,
    versiones: cargado.versiones,
    listaMp: vigenteMp,
    listaFazon: vigenteFz,
    idProducto,
    idVersion,
    capacidadKg: capacidad,
    toneladas,
  });
  if (!desglose?.fila) throw new Error("No se pudo armar la cotización con esa receta.");
  const fila = desglose.fila;

  const admin = createAdminClient();
  const id = (await maxId("cotiz_producto")) + 1;
  const { error: errCab } = await admin.from("cotiz_producto").insert({
    id,
    id_usuario_registro: usuarioId(perfil.usuarioId),
    id_cotiz_mp: vigenteMp?.id ?? null,
    id_cotiz_fazon: vigenteFz?.id ?? null,
    id_producto: fila.id_producto,
    codigo_producto: fila.codigo,
    producto: fila.producto,
    categoria: fila.categoria,
    id_version: fila.id_version,
    version: fila.version,
    capacidad_kg: desglose.capacidad_kg,
    toneladas: desglose.toneladas,
    costo_mp_tn: fila.costo_mp_tn,
    costo_fazon_tn: desglose.costo_fazon_tn,
    costo_tn: desglose.costo_tn,
    total: desglose.total,
  });
  if (errCab) throw new Error(errCab.message);

  let idItem = (await maxId("cotiz_producto_items")) + 1;
  const items = fila.lineas.map((l) => {
    const row = {
      id: idItem,
      id_cotiz_producto: id,
      id_ingrediente: l.id_ingrediente,
      codigo: l.codigo,
      nombre: l.nombre,
      participacion: l.participacion,
      costo_ingrediente_tn: l.costo_ingrediente_tn,
      costo_linea_tn: l.costo_linea_tn,
    };
    idItem += 1;
    return row;
  });
  if (items.length) {
    const { error } = await admin.from("cotiz_producto_items").insert(items);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/cotizaciones");
  return {
    id,
    fila,
    toneladas: desglose.toneladas,
    total: desglose.total,
  };
}
