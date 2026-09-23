import { AppShell } from "@/components/app-shell";
import { ProductosClient } from "@/app/productos/productos-client";
import { getPerfilSesion, puede } from "@/lib/auth/permisos";
import { cargarProductos } from "@/lib/productos/data";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProductosPage() {
  const perfil = await getPerfilSesion();
  if (!perfil || !puede(perfil, "productos", "ver")) redirect("/");

  if (!puede(perfil, "productos", "leer")) {
    return (
      <AppShell perfil={perfil} activo="productos">
        <div className="g-stack">
          <div>
            <h1 className="g-page-title">Productos</h1>
            <p className="g-page-subtitle">
              Productos terminados. El stock se calcula con los movimientos y los cierres de producción.
            </p>
          </div>
          <p className="text-[13px] text-[var(--color-text-muted)]">
            No tenés permiso de lectura en este módulo.
          </p>
        </div>
      </AppShell>
    );
  }

  const datos = await cargarProductos();

  return (
    <AppShell perfil={perfil} activo="productos">
      <ProductosClient
        productos={datos.productos}
        envases={datos.envases}
        etiquetas={datos.etiquetas}
        errorCarga={datos.error}
        puedeEditar={puede(perfil, "productos", "editar")}
        puedeAjustar={puede(perfil, "movimientos", "editar")}
      />
    </AppShell>
  );
}
