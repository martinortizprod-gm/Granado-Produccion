"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermiso } from "@/lib/auth/permisos";
import {
  CATALOGOS,
  DatosCatalogoForm,
  KindCatalogo,
  etiquetaEstado,
  estadoExcel,
  filaCatalogo,
  validarCatalogo,
} from "@/lib/catalogos/logic";
import { idEntero, texto } from "@/lib/solicitudes/logic";

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

async function contar(tabla: string, campo: string, id: number): Promise<number> {
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

async function referencias(kind: KindCatalogo, id: number): Promise<string[]> {
  const cfg = CATALOGOS[kind];
  const avisos: string[] = [];
  if (cfg.refRecetas) {
    const n = await contar("recetas", "id_ingrediente", id);
    if (n) avisos.push(`está en ${n} línea${n === 1 ? "" : "s"} de receta`);
  }
  if (cfg.refProductosCampo) {
    const n = await contar("catalogo_productos", cfg.refProductosCampo, id);
    if (n) avisos.push(`está asociado a ${n} producto${n === 1 ? "" : "s"}`);
  }
  const nMov = await contar(cfg.tablaMov, cfg.campoIdMov, id);
  if (nMov) avisos.push(`tiene ${nMov} movimiento${nMov === 1 ? "" : "s"}`);

  const admin = createAdminClient();
  const { data: art } = await admin
    .from("catalogo_articulos")
    .select("id")
    .eq("tipo_articulo", cfg.tipoArticulo)
    .eq("id_origen", id)
    .maybeSingle();
  const idArt = idEntero(art?.id);
  if (idArt != null) {
    const n = await contar("consumo", "id_articulo", idArt);
    if (n) avisos.push(`tiene ${n} consumo${n === 1 ? "" : "s"} de producción`);
  }
  return avisos;
}

async function sincronizarArticulo(
  kind: KindCatalogo,
  idOrigen: number,
  codigo: string,
  nombre: string,
  medida: string,
  estado: string,
) {
  const cfg = CATALOGOS[kind];
  const admin = createAdminClient();
  const datos = {
    tipo_articulo: cfg.tipoArticulo,
    id_origen: idOrigen,
    codigo: texto(codigo) || null,
    articulo: texto(nombre) || null,
    medida: texto(medida) || null,
    estado: texto(estado) || "Activo",
  };
  const { data: actual } = await admin
    .from("catalogo_articulos")
    .select("id")
    .eq("tipo_articulo", cfg.tipoArticulo)
    .eq("id_origen", idOrigen)
    .maybeSingle();
  if (actual?.id != null) {
    const { error } = await admin
      .from("catalogo_articulos")
      .update(datos)
      .eq("id", actual.id);
    if (error) throw new Error(error.message);
    return;
  }
  const id = (await maxId("catalogo_articulos")) + 1;
  const { error } = await admin
    .from("catalogo_articulos")
    .insert({ id, ...datos });
  if (error) throw new Error(error.message);
}

export async function guardarCatalogo(
  kind: KindCatalogo,
  datos: DatosCatalogoForm,
  idEdicion?: number,
) {
  await requirePermiso(kind, "editar");
  const cfg = CATALOGOS[kind];
  const errores = validarCatalogo(cfg, datos);
  if (errores.length) throw new Error(errores.join(" "));
  const admin = createAdminClient();
  const id = idEdicion ?? (await maxId(cfg.tabla)) + 1;
  const fila = filaCatalogo(cfg, datos, id);
  const q = idEdicion
    ? admin.from(cfg.tabla).update(fila).eq("id", id)
    : admin.from(cfg.tabla).insert(fila);
  const { error } = await q;
  if (error) throw new Error(error.message);
  await sincronizarArticulo(
    kind,
    id,
    texto(datos.codigo),
    texto(datos.nombre),
    texto(datos.medida) || cfg.unidad,
    etiquetaEstado(estadoExcel(datos.estado)),
  );
  revalidatePath(`/${kind}`);
}

export async function eliminarCatalogo(kind: KindCatalogo, id: number) {
  await requirePermiso(kind, "editar");
  const cfg = CATALOGOS[kind];
  const avisos = await referencias(kind, id);
  if (avisos.length) {
    const art = cfg.genero === "f" ? "esta" : "este";
    throw new Error(
      `No se puede eliminar ${art} ${cfg.etiquetaItem.toLowerCase()}: ${avisos.join("; ")}.`,
    );
  }
  const admin = createAdminClient();
  const { error } = await admin.from(cfg.tabla).delete().eq("id", id);
  if (error) throw new Error(error.message);
  await admin
    .from("catalogo_articulos")
    .delete()
    .eq("tipo_articulo", cfg.tipoArticulo)
    .eq("id_origen", id);
  revalidatePath(`/${kind}`);
}
