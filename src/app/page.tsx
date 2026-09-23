import { AppShell } from "@/components/app-shell";
import { InicioDashboard } from "@/app/inicio-dashboard";
import { getPerfilSesion, puede } from "@/lib/auth/permisos";
import { cargarDashboard } from "@/lib/inicio/dashboard";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const perfil = await getPerfilSesion();
  if (!perfil) redirect("/login");
  if (!puede(perfil, "inicio", "ver")) redirect("/login");

  const datos = await cargarDashboard(perfil);

  return (
    <AppShell perfil={perfil} activo="inicio">
      <InicioDashboard
        datos={datos}
        mostrarAvisoRol={!perfil.idRol && !perfil.esAdministrador}
      />
    </AppShell>
  );
}
