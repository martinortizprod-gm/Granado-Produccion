"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermiso } from "@/lib/auth/permisos";
import { MODULOS } from "@/lib/modulos";
import { revalidatePath } from "next/cache";

export type RolPermisoInput = {
  modulo: string;
  puede_ver: boolean;
  puede_leer: boolean;
  puede_editar: boolean;
};

export async function listarRoles() {
  await requirePermiso("usuarios", "leer");
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("roles")
    .select("id, nombre, descripcion, es_sistema")
    .order("id");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listarPermisosRol(idRol: number) {
  await requirePermiso("usuarios", "leer");
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("rol_permisos")
    .select("modulo, puede_ver, puede_leer, puede_editar")
    .eq("id_rol", idRol);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function guardarRol(input: {
  id?: number;
  nombre: string;
  descripcion?: string;
  permisos: RolPermisoInput[];
}) {
  await requirePermiso("usuarios", "editar");
  const admin = createAdminClient();
  const nombre = input.nombre.trim();
  if (!nombre) throw new Error("El nombre del rol es obligatorio");

  let idRol = input.id;

  if (idRol) {
    const { data: existente } = await admin
      .from("roles")
      .select("es_sistema, nombre")
      .eq("id", idRol)
      .single();
    if (existente?.es_sistema && existente.nombre === "Administrador") {
      // Solo se actualizan permisos (siempre full); no se renombra
    } else {
      const { error } = await admin
        .from("roles")
        .update({
          nombre,
          descripcion: input.descripcion?.trim() || null,
        })
        .eq("id", idRol);
      if (error) throw new Error(error.message);
    }
  } else {
    const { data, error } = await admin
      .from("roles")
      .insert({
        nombre,
        descripcion: input.descripcion?.trim() || null,
        es_sistema: false,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    idRol = data.id;
  }

  // Administrador: forzar todos los permisos
  const { data: rol } = await admin
    .from("roles")
    .select("nombre, es_sistema")
    .eq("id", idRol!)
    .single();

  const permisos =
    rol?.nombre === "Administrador"
      ? MODULOS.map((m) => ({
          modulo: m.id,
          puede_ver: true,
          puede_leer: true,
          puede_editar: true,
        }))
      : input.permisos;

  for (const p of permisos) {
    const { error } = await admin.from("rol_permisos").upsert(
      {
        id_rol: idRol,
        modulo: p.modulo,
        puede_ver: p.puede_ver,
        puede_leer: p.puede_leer,
        puede_editar: p.puede_editar,
      },
      { onConflict: "id_rol,modulo" },
    );
    if (error) throw new Error(error.message);
  }

  revalidatePath("/usuarios");
  return { id: idRol };
}

export async function eliminarRol(id: number) {
  await requirePermiso("usuarios", "editar");
  const admin = createAdminClient();
  const { data: rol } = await admin
    .from("roles")
    .select("es_sistema")
    .eq("id", id)
    .single();
  if (rol?.es_sistema) throw new Error("No se puede eliminar un rol de sistema");

  const { count } = await admin
    .from("usuarios")
    .select("id", { count: "exact", head: true })
    .eq("id_rol", id);
  if ((count ?? 0) > 0) {
    throw new Error("Hay usuarios con este rol; reasignalos antes de borrar");
  }

  const { error } = await admin.from("roles").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/usuarios");
}

export async function listarUsuariosApp() {
  await requirePermiso("usuarios", "leer");
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("usuarios")
    .select("id, nombre, apellido, mail, rol, id_rol, contacto, auth_user_id")
    .order("id");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function crearUsuarioApp(input: {
  nombre: string;
  apellido: string;
  mail: string;
  password: string;
  id_rol: number;
  contacto?: string;
}) {
  await requirePermiso("usuarios", "editar");
  const admin = createAdminClient();
  const mail = input.mail.trim().toLowerCase();
  if (!mail || !input.password || input.password.length < 6) {
    throw new Error("Mail y contraseña (mín. 6) son obligatorios");
  }

  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email: mail,
      password: input.password,
      email_confirm: true,
    });
  if (authError) throw new Error(authError.message);

  const { data: roles } = await admin
    .from("roles")
    .select("id, nombre")
    .eq("id", input.id_rol)
    .maybeSingle();

  // Nuevo id: max+1 (compatibilidad con IDs manuales del desktop)
  const { data: maxRow } = await admin
    .from("usuarios")
    .select("id")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextId = (maxRow?.id ?? 0) + 1;

  const { error } = await admin.from("usuarios").insert({
    id: nextId,
    nombre: input.nombre.trim(),
    apellido: input.apellido.trim(),
    mail,
    contacto: input.contacto?.trim() || null,
    id_rol: input.id_rol,
    rol: roles?.nombre === "Administrador" ? "admin" : "operario",
    auth_user_id: authData.user?.id ?? null,
    fecha_registro: new Date().toISOString().slice(0, 19).replace("T", " "),
    clave: null,
  });

  if (error) {
    if (authData.user?.id) {
      await admin.auth.admin.deleteUser(authData.user.id);
    }
    throw new Error(error.message);
  }

  revalidatePath("/usuarios");
  return { id: nextId };
}

export async function actualizarUsuarioApp(input: {
  id: number;
  nombre: string;
  apellido: string;
  id_rol: number;
  contacto?: string;
}) {
  await requirePermiso("usuarios", "editar");
  const admin = createAdminClient();
  const { data: roles } = await admin
    .from("roles")
    .select("nombre")
    .eq("id", input.id_rol)
    .maybeSingle();

  const { error } = await admin
    .from("usuarios")
    .update({
      nombre: input.nombre.trim(),
      apellido: input.apellido.trim(),
      id_rol: input.id_rol,
      contacto: input.contacto?.trim() || null,
      rol: roles?.nombre === "Administrador" ? "admin" : "operario",
    })
    .eq("id", input.id);
  if (error) throw new Error(error.message);
  revalidatePath("/usuarios");
}
