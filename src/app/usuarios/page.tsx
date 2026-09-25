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
      {errorMsg ? (
        <div className="space-y-4">
          <div>
            <h1 className="g-page-title">Usuarios y roles</h1>
            <p className="g-page-subtitle">
              Gestioná los usuarios del sistema y sus permisos de acceso.
            </p>
          </div>
          <p className="g-alert g-alert-danger">{errorMsg}</p>
        </div>
      ) : (
        <UsuariosClient
          roles={roles}
          usuarios={usuarios}
          puedeEditar={puede(perfil, "usuarios", "editar")}
          puedeAsignarRol={perfil.esAdministrador}
        />
      )}
    </AppShell>
  );
}
