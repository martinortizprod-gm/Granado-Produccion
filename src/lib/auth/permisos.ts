import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AccionPermiso, ModuloId, PermisoModulo } from "@/lib/modulos";
import { urlFotoPerfil } from "@/lib/auth/foto-perfil";
import { PerfilSesion, puede } from "@/lib/auth/permisos-core";

export type { PerfilSesion } from "@/lib/auth/permisos-core";
export { puede } from "@/lib/auth/permisos-core";

export async function getPerfilSesion(): Promise<PerfilSesion | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const email = user.email;
  const fotoUrl = urlFotoPerfil(
    user.user_metadata?.avatar_path,
    user.user_metadata?.avatar_v,
  );
  const base: PerfilSesion = {
    authUserId: user.id,
    email,
    usuarioId: null,
    nombre: null,
    apellido: null,
    rolNombre: null,
    idRol: null,
    esAdministrador: false,
    permisos: [],
    fotoUrl,
  };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return base;
  }

  const columnas = "id, nombre, apellido, rol, id_rol, auth_user_id, mail";
  let { data: fila, error: errUser } = await admin
    .from("usuarios")
    .select(columnas)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!errUser && !fila) {
    const porMail = await admin
      .from("usuarios")
      .select(columnas)
      .ilike("mail", email)
      .maybeSingle();
    fila = porMail.data;
    errUser = porMail.error;
  }

  if (errUser) {
    // Tablas/roles aún no migrados
    return base;
  }

  if (fila?.id && !fila.auth_user_id) {
    await admin
      .from("usuarios")
      .update({ auth_user_id: user.id })
      .eq("id", fila.id);
  }

  let idRol = fila?.id_rol ?? null;
  let rolNombre: string | null = null;
  let esAdministrador = false;

  if (idRol) {
    const { data: rol } = await admin
      .from("roles")
      .select("id, nombre")
      .eq("id", idRol)
      .maybeSingle();
    rolNombre = rol?.nombre ?? null;
    esAdministrador = rolNombre === "Administrador";
  } else if (fila && String(fila.rol || "").toLowerCase() === "admin") {
    esAdministrador = true;
    rolNombre = "Administrador";
    const { data: rolAdmin } = await admin
      .from("roles")
      .select("id")
      .eq("nombre", "Administrador")
      .maybeSingle();
    if (rolAdmin?.id && fila.id) {
      idRol = rolAdmin.id;
      await admin.from("usuarios").update({ id_rol: idRol }).eq("id", fila.id);
    }
  }

  let permisos: PermisoModulo[] = [];
  if (idRol) {
    const { data: perms } = await admin
      .from("rol_permisos")
      .select("modulo, puede_ver, puede_leer, puede_editar")
      .eq("id_rol", idRol);
    permisos = (perms ?? []) as PermisoModulo[];
  }

  if (esAdministrador && permisos.length) {
    permisos = permisos.map((p) => ({
      ...p,
      puede_ver: true,
      puede_leer: true,
      puede_editar: true,
    }));
  }

  return {
    authUserId: user.id,
    email,
    usuarioId: fila?.id ?? null,
    nombre: fila?.nombre ?? null,
    apellido: fila?.apellido ?? null,
    rolNombre,
    idRol,
    esAdministrador,
    permisos,
    fotoUrl,
  };
}

export async function requirePermiso(
  modulo: ModuloId,
  accion: AccionPermiso = "ver",
) {
  const perfil = await getPerfilSesion();
  if (!puede(perfil, modulo, accion)) {
    throw new Error("Sin permiso");
  }
  return perfil!;
}
