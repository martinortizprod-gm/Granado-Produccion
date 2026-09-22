import { AppShell } from "@/components/app-shell";
import { getPerfilSesion, puede } from "@/lib/auth/permisos";
import { cargarDatosSolicitudes } from "@/lib/solicitudes/data";
import { FormularioSolicitud } from "@/app/solicitudes/formulario-solicitud";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NuevaSolicitudPage() {
  const perfil = await getPerfilSesion();
  if (!perfil || !puede(perfil, "solicitudes", "editar")) {
    redirect("/solicitudes");
  }
  const { productos, error } = await cargarDatosSolicitudes();

  return (
    <AppShell perfil={perfil} activo="solicitudes">
      {error ? (
        <p className="mb-4 rounded-md border border-red-300 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <FormularioSolicitud productos={productos} />
    </AppShell>
  );
}
