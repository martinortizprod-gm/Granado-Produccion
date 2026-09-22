"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermiso } from "@/lib/auth/permisos";
import { siguienteIdSolicitud } from "@/lib/solicitudes/data";
import {
  armarFilaGuardar,
  idEntero,
  numero,
  texto,
  validarDatosSolicitud,
} from "@/lib/solicitudes/logic";

export type DatosFormSolicitud = {
  orden_compra: string;
  lote: string;
  orden_produccion: string;
  id_producto: number;
  id_version: number;
  id_envase: number | null;
  pallets: number;
  unidades_por_pallets: number;
  peso_unitario: number;
  unidades: number;
  fecha_registro: string;
  fecha_estimada: string;
};

async function lotesExistentes() {
  const admin = createAdminClient();
  const { data } = await admin.from("solicitudes").select("id, lote");
  return (data || []).map((f) => ({
    id: Number(f.id),
    lote: String(f.lote ?? ""),
  }));
}

export async function crearSolicitud(datos: DatosFormSolicitud) {
  await requirePermiso("solicitudes", "editar");
  const errores = validarDatosSolicitud(
    datos,
    await lotesExistentes(),
    null,
  );
  if (errores.length) throw new Error(errores.join(" "));

  const id = await siguienteIdSolicitud();
  const fila = armarFilaGuardar(
    { ...datos, pallets_pendientes: numero(datos.pallets) },
    id,
  );
  const admin = createAdminClient();
  const { error } = await admin.from("solicitudes").insert(fila);
  if (error) throw new Error(error.message);
  revalidatePath("/solicitudes");
  return { id };
}

export async function actualizarSolicitud(
  id: number,
  datos: DatosFormSolicitud,
  palletsCargadosVista: number,
  fechaFinExistente: string | null,
) {
  await requirePermiso("solicitudes", "editar");
  const errores = validarDatosSolicitud(
    datos,
    await lotesExistentes(),
    id,
  );
  if (errores.length) throw new Error(errores.join(" "));

  const pendientes = Math.max(0, numero(datos.pallets) - numero(palletsCargadosVista));
  const fila = armarFilaGuardar(
    {
      ...datos,
      fecha_fin: fechaFinExistente,
      pallets_pendientes: pendientes,
    },
    id,
  );
  const admin = createAdminClient();
  const { error } = await admin.from("solicitudes").update(fila).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/solicitudes");
  return { id };
}

export async function eliminarSolicitud(id: number) {
  await requirePermiso("solicitudes", "editar");
  if (idEntero(id) == null) throw new Error("ID inválido");
  const admin = createAdminClient();

  const { count } = await admin
    .from("produccion")
    .select("id", { count: "exact", head: true })
    .eq("id_solicitud", id);

  const { error } = await admin.from("solicitudes").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/solicitudes");
  return {
    teniaProduccion: (count ?? 0) > 0,
  };
}

export async function solicitudTieneProduccion(id: number): Promise<boolean> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("produccion")
    .select("id", { count: "exact", head: true })
    .eq("id_solicitud", id);
  return (count ?? 0) > 0;
}
