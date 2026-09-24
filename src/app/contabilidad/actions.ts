"use server";

import { revalidatePath } from "next/cache";
import { requirePermiso } from "@/lib/auth/permisos";
import {
  borrarFichaSiExiste,
  definirImpacto,
  guardarCotizacion,
  guardarFicha,
  urlComprobante,
} from "@/lib/contabilidad/ficha";
import { idEntero, texto } from "@/lib/solicitudes/logic";

export async function guardarContable(fd: FormData) {
  const perfil = await requirePermiso("contabilidad", "editar");
  await guardarFicha(perfil, fd);
  revalidatePath("/contabilidad");
}

export async function eliminarContable(tabla: string, idMovimiento: number) {
  await requirePermiso("contabilidad", "editar");
  const id = idEntero(idMovimiento);
  if (!texto(tabla) || id == null) throw new Error("El ingreso no es válido.");
  await borrarFichaSiExiste(tabla, id);
  revalidatePath("/contabilidad");
}

export async function abrirComprobante(ruta: string) {
  await requirePermiso("contabilidad", "leer");
  return urlComprobante(texto(ruta));
}

export async function marcarImpacto(tabla: string, idMovimiento: number, impacta: boolean) {
  const perfil = await requirePermiso("contabilidad", "editar");
  const id = idEntero(idMovimiento);
  if (!texto(tabla) || id == null) throw new Error("El ingreso no es válido.");
  await definirImpacto(perfil, tabla, id, impacta);
  revalidatePath("/contabilidad");
}

export async function actualizarDolar(valor: string) {
  const perfil = await requirePermiso("contabilidad", "editar");
  await guardarCotizacion(perfil, valor);
  revalidatePath("/contabilidad");
}
