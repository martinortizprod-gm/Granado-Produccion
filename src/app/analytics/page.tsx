import { AppShell } from "@/components/app-shell";
import { AnalyticsClient } from "@/app/analytics/analytics-client";
import { getPerfilSesion, puede } from "@/lib/auth/permisos";
import { cargarAnalytics } from "@/lib/analytics/data";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const perfil = await getPerfilSesion();
  if (!perfil || !puede(perfil, "analytics", "ver")) redirect("/");

  if (!puede(perfil, "analytics", "leer")) {
    return (
      <AppShell perfil={perfil} activo="analytics">
        <div className="g-stack">
          <div>
            <h1 className="g-page-title">Data Analytics</h1>
            <p className="g-page-subtitle">
              Indicadores de producción, tiempos y paradas a partir de los registros reales.
            </p>
          </div>
          <p className="text-[13px] text-[var(--color-text-muted)]">
            No tenés permiso de lectura en este módulo.
          </p>
        </div>
      </AppShell>
    );
  }

  const { jornadas, plan, stock, error } = await cargarAnalytics();

  return (
    <AppShell perfil={perfil} activo="analytics">
      <AnalyticsClient jornadas={jornadas} plan={plan} stock={stock} errorCarga={error} />
    </AppShell>
  );
}
