import { AppShell } from "@/components/app-shell";
import { ProduccionClient } from "@/app/produccion/produccion-client";
import { getPerfilSesion, puede } from "@/lib/auth/permisos";
import { cargarProduccion } from "@/lib/produccion/data";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProduccionPage() {
  const perfil = await getPerfilSesion();
  if (!perfil || !puede(perfil, "produccion", "ver")) redirect("/");

  if (!puede(perfil, "produccion", "leer")) {
    return (
      <AppShell perfil={perfil} activo="produccion">
        <div className="g-stack">
          <div>
            <h1 className="g-page-title">Producción</h1>
            <p className="g-page-subtitle">Registro de jornada, consumos y datos previos de cada lote</p>
          </div>
          <p className="text-[13px] text-[var(--color-text-muted)]">No tenés permiso de lectura en este módulo.</p>
        </div>
      </AppShell>
    );
  }

  const datos = await cargarProduccion();

  return (
    <AppShell perfil={perfil} activo="produccion">
      <ProduccionClient datos={datos} puedeEditar={puede(perfil, "produccion", "editar")} />
    </AppShell>
  );
}
