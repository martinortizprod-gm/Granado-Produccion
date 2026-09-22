import { AppShell } from "@/components/app-shell";
import { RecetasClient } from "@/app/recetas/recetas-client";
import { getPerfilSesion, puede } from "@/lib/auth/permisos";
import { cargarRecetas } from "@/lib/recetas/data";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RecetasPage() {
  const perfil = await getPerfilSesion();
  if (!perfil || !puede(perfil, "recetas", "ver")) redirect("/");

  if (!puede(perfil, "recetas", "leer")) {
    return (
      <AppShell perfil={perfil} activo="recetas">
        <div className="g-stack">
          <div>
            <h1 className="g-page-title">Recetas</h1>
            <p className="g-page-subtitle">
              Cada versión de un producto tiene su fórmula. Los ingredientes y la
              participación se ven en el detalle.
            </p>
          </div>
          <p className="text-[13px] text-[var(--color-text-muted)]">
            No tenés permiso de lectura en este módulo.
          </p>
        </div>
      </AppShell>
    );
  }

  const datos = await cargarRecetas();

  return (
    <AppShell perfil={perfil} activo="recetas">
      <RecetasClient
        versiones={datos.versiones}
        productos={datos.productos}
        ingredientes={datos.ingredientes}
        errorCarga={datos.error}
        puedeEditar={puede(perfil, "recetas", "editar")}
      />
    </AppShell>
  );
}
