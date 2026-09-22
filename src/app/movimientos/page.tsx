import { AppShell } from "@/components/app-shell";
import { MovimientosClient } from "@/app/movimientos/movimientos-client";
import { getPerfilSesion, puede } from "@/lib/auth/permisos";
import { cargarMovimientos } from "@/lib/movimientos/data";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MovimientosPage() {
  const perfil = await getPerfilSesion();
  if (!perfil || !puede(perfil, "movimientos", "ver")) redirect("/");

  if (!puede(perfil, "movimientos", "leer")) {
    return (
      <AppShell perfil={perfil} activo="movimientos">
        <div className="g-stack">
          <div>
            <h1 className="g-page-title">Movimientos</h1>
            <p className="g-page-subtitle">
              Ingresos y egresos de ingredientes, insumos, etiquetas y productos.
            </p>
          </div>
          <p className="text-[13px] text-[var(--color-text-muted)]">
            No tenés permiso de lectura en este módulo.
          </p>
        </div>
      </AppShell>
    );
  }

  const datos = await cargarMovimientos();

  return (
    <AppShell perfil={perfil} activo="movimientos">
      <MovimientosClient
        kinds={datos.kinds}
        errorCarga={datos.error}
        puedeEditar={puede(perfil, "movimientos", "editar")}
      />
    </AppShell>
  );
}
