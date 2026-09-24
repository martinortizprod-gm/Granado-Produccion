import { AppShell } from "@/components/app-shell";
import { InformesClient } from "@/app/informes/informes-client";
import { getPerfilSesion, puede } from "@/lib/auth/permisos";
import { cargarProduccion } from "@/lib/produccion/data";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function InformesPage() {
  const perfil = await getPerfilSesion();
  if (!perfil || !puede(perfil, "informes", "ver")) redirect("/");

  if (!puede(perfil, "informes", "leer")) {
    return (
      <AppShell perfil={perfil} activo="informes">
        <div className="g-stack">
          <div>
            <h1 className="g-page-title">Informes</h1>
            <p className="g-page-subtitle">
              Documentos operativos por lote y período, desde solicitudes y producción.
            </p>
          </div>
          <p className="text-[13px] text-[var(--color-text-muted)]">
            No tenés permiso de lectura en este módulo.
          </p>
        </div>
      </AppShell>
    );
  }

  const datos = await cargarProduccion();

  return (
    <AppShell perfil={perfil} activo="informes">
      <InformesClient datos={datos} />
    </AppShell>
  );
}
