import { AppShell } from "@/components/app-shell";
import { ContabilidadClient } from "@/app/contabilidad/contabilidad-client";
import { getPerfilSesion, puede } from "@/lib/auth/permisos";
import { cargarContabilidad } from "@/lib/contabilidad/data";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ContabilidadPage() {
  const perfil = await getPerfilSesion();
  if (!perfil || !puede(perfil, "contabilidad", "ver")) redirect("/");

  if (!puede(perfil, "contabilidad", "leer")) {
    return (
      <AppShell perfil={perfil} activo="contabilidad">
        <div className="g-stack">
          <div>
            <h1 className="g-page-title">Contabilidad</h1>
            <p className="g-page-subtitle">Ingresos de artículos y su facturación.</p>
          </div>
          <p className="text-[13px] text-[var(--color-text-muted)]">
            No tenés permiso de lectura en este módulo.
          </p>
        </div>
      </AppShell>
    );
  }

  const datos = await cargarContabilidad();

  return (
    <AppShell perfil={perfil} activo="contabilidad">
      <ContabilidadClient
        filas={datos.filas}
        formas={datos.formas}
        cotizacion={datos.cotizacion}
        errorMovimientos={datos.errorMovimientos}
        errorContable={datos.errorContable}
        puedeEditar={puede(perfil, "contabilidad", "editar")}
      />
    </AppShell>
  );
}
