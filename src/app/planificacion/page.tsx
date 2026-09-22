import { AppShell } from "@/components/app-shell";
import { PlanificacionClient } from "@/app/planificacion/planificacion-client";
import { getPerfilSesion, puede } from "@/lib/auth/permisos";
import { cargarPlanificacion } from "@/lib/planificacion/data";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PlanificacionPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; ops?: string }>;
}) {
  const perfil = await getPerfilSesion();
  if (!perfil || !puede(perfil, "planificacion", "ver")) redirect("/");

  if (!puede(perfil, "planificacion", "leer")) {
    return (
      <AppShell perfil={perfil} activo="planificacion">
        <div className="g-stack">
          <div>
            <h1 className="g-page-title">Producción estimada</h1>
            <p className="g-page-subtitle">Plan mensual de capacidad y control de lo producido</p>
          </div>
          <p className="text-[13px] text-[var(--color-text-muted)]">
            No tenés permiso de lectura en este módulo.
          </p>
        </div>
      </AppShell>
    );
  }

  const query = await searchParams;
  const datos = await cargarPlanificacion(query.mes, query.ops);

  return (
    <AppShell perfil={perfil} activo="planificacion">
      <PlanificacionClient datos={datos} puedeEditar={puede(perfil, "planificacion", "editar")} />
    </AppShell>
  );
}
