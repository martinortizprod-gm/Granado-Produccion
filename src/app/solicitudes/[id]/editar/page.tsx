import { AppShell } from "@/components/app-shell";
import { getPerfilSesion, puede } from "@/lib/auth/permisos";
import { cargarDatosSolicitudes } from "@/lib/solicitudes/data";
import { cargarPartes } from "@/lib/terceros/data";
import { FormularioSolicitud } from "@/app/solicitudes/formulario-solicitud";
import { redirect, notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditarSolicitudPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) notFound();

  const perfil = await getPerfilSesion();
  if (!perfil || !puede(perfil, "solicitudes", "editar")) {
    redirect("/solicitudes");
  }

  const { productos, solicitudes, error } = await cargarDatosSolicitudes();
  const clientes = await cargarPartes("clientes");
  const solicitud = solicitudes.find((s) => s.id === id);
  if (!solicitud) notFound();

  return (
    <AppShell perfil={perfil} activo="solicitudes">
      {error ? (
        <p className="mb-4 rounded-md border border-red-300 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <FormularioSolicitud
        productos={productos}
        clientes={clientes.items}
        errorClientes={clientes.error}
        solicitud={solicitud}
      />
    </AppShell>
  );
}
