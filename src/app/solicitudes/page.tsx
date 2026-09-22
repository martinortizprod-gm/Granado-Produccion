import { AppShell } from "@/components/app-shell";
import { getPerfilSesion, puede } from "@/lib/auth/permisos";
import { cargarDatosSolicitudes } from "@/lib/solicitudes/data";
import { SolicitudesClient } from "@/app/solicitudes/solicitudes-client";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SolicitudesPage() {
  const perfil = await getPerfilSesion();
  if (!perfil || !puede(perfil, "solicitudes", "ver")) {
    redirect("/");
  }

  let solicitudes: Awaited<ReturnType<typeof cargarDatosSolicitudes>>["solicitudes"] =
    [];
  let productos: Awaited<ReturnType<typeof cargarDatosSolicitudes>>["productos"] =
    [];
  let errorCarga: string | null = null;

  if (puede(perfil, "solicitudes", "leer")) {
    const datos = await cargarDatosSolicitudes();
    solicitudes = datos.solicitudes;
    productos = datos.productos;
    errorCarga = datos.error;
  }

  return (
    <AppShell perfil={perfil} activo="solicitudes">
      {!puede(perfil, "solicitudes", "leer") ? (
        <div>
          <h1 className="g-page-title">Solicitudes</h1>
          <p className="g-page-subtitle mt-2">
            No tenés permiso de lectura en este módulo.
          </p>
        </div>
      ) : (
        <SolicitudesClient
          solicitudes={solicitudes}
          productos={productos}
          puedeEditar={puede(perfil, "solicitudes", "editar")}
          errorCarga={errorCarga}
        />
      )}
    </AppShell>
  );
}
