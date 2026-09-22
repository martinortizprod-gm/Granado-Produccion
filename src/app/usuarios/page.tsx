import { AppShell } from "@/components/app-shell";
import { getPerfilSesion, puede } from "@/lib/auth/permisos";
import { listarRoles, listarUsuariosApp } from "@/app/usuarios/actions";
import { UsuariosClient } from "@/app/usuarios/usuarios-client";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const perfil = await getPerfilSesion();
  if (!perfil || !puede(perfil, "usuarios", "ver")) {
    redirect("/");
  }

  let roles: Awaited<ReturnType<typeof listarRoles>> = [];
  let usuarios: Awaited<ReturnType<typeof listarUsuariosApp>> = [];
  let errorMsg: string | null = null;

  try {
    [roles, usuarios] = await Promise.all([listarRoles(), listarUsuariosApp()]);
  } catch (e) {
    errorMsg =
      e instanceof Error
        ? e.message
        : "No se pudieron cargar roles/usuarios. ¿Ejecutaste roles_y_permisos.sql?";
  }

  return (
    <AppShell perfil={perfil} activo="usuarios">
      <h1 className="mb-4 text-xl font-semibold">Usuarios y roles</h1>
      {errorMsg ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </p>
      ) : (
        <UsuariosClient
          roles={roles}
          usuarios={usuarios}
          puedeEditar={puede(perfil, "usuarios", "editar")}
        />
      )}
    </AppShell>
  );
}
